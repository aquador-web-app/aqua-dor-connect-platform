import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Save, Users, CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CourseForm {
  name: string;
  description: string;
  level: string;
  price: number;
  capacity: number;
  duration_minutes: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
  sessionTime: string;
  sessionDays: string[];
}

const initialForm: CourseForm = {
  name: "",
  description: "",
  level: "beginner",
  price: 0,
  capacity: 10,
  duration_minutes: 60,
  startDate: undefined,
  endDate: undefined,
  sessionTime: "09:00",
  sessionDays: []
};

const weekDays = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" }
];

export function EnhancedCourseCreator() {
  const [form, setForm] = useState<CourseForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || form.price <= 0 || !form.startDate || !form.endDate) {
      toast({
        title: t('common.error'),
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (form.endDate <= form.startDate) {
      toast({
        title: t('common.error'),
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the course first
      const { data: courseData, error: courseError } = await supabase
        .from('classes')
        .insert({
          name: form.name,
          description: form.description,
          level: form.level,
          price: form.price,
          capacity: form.capacity,
          duration_minutes: form.duration_minutes,
          is_active: true
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Generate class sessions based on selected days and date range
      if (form.sessionDays.length > 0 && courseData) {
        const sessions = [];
        const currentDate = new Date(form.startDate);
        const endDate = new Date(form.endDate);
        
        while (currentDate <= endDate) {
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          
          if (form.sessionDays.includes(dayName)) {
            const sessionDateTime = new Date(currentDate);
            const [hours, minutes] = form.sessionTime.split(':');
            sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            sessions.push({
              class_id: courseData.id,
              session_date: sessionDateTime.toISOString(),
              max_participants: form.capacity,
              status: 'scheduled'
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (sessions.length > 0) {
          const { error: sessionsError } = await supabase
            .from('class_sessions')
            .insert(sessions);

          if (sessionsError) throw sessionsError;
        }
      }

      toast({
        title: t('common.success'),
        description: `Cours créé avec succès${form.sessionDays.length > 0 ? ' avec sessions programmées' : ''}`,
      });

      setForm(initialForm);
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('courseCreated'));
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: t('common.error'),
        description: "Impossible de créer le cours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      sessionDays: prev.sessionDays.includes(day)
        ? prev.sessionDays.filter(d => d !== day)
        : [...prev.sessionDays, day]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createCourse')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.createCourse')}</DialogTitle>
          <DialogDescription>
            Créez un nouveau cours avec planification des sessions
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Course Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('course.title')} *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Natation pour débutants"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('course.description')}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Description détaillée du cours..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t('course.price')} (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">{t('course.duration')} (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({...form, duration_minutes: Number(e.target.value)})}
                    min="15"
                    step="15"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">{t('course.capacity')}</Label>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="capacity"
                      type="number"
                      value={form.capacity}
                      onChange={(e) => setForm({...form, capacity: Number(e.target.value)})}
                      min="1"
                      max="50"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Planification des Sessions</h3>
                
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.startDate ? format(form.startDate, "PPP") : "Sélectionner..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.startDate}
                          onSelect={(date) => setForm({...form, startDate: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Date de fin *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.endDate ? format(form.endDate, "PPP") : "Sélectionner..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.endDate}
                          onSelect={(date) => setForm({...form, endDate: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Session Time */}
                <div className="space-y-2">
                  <Label htmlFor="sessionTime">Heure des sessions</Label>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sessionTime"
                      type="time"
                      value={form.sessionTime}
                      onChange={(e) => setForm({...form, sessionTime: e.target.value})}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Days of Week */}
                <div className="space-y-2">
                  <Label>Jours de la semaine</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {weekDays.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={form.sessionDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSessionDay(day.value)}
                        className="justify-start"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                t('common.loading')
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.create')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}