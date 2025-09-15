import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Users, Repeat, X } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CalendarCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RecurrenceRule {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekDays?: number[];
  endType: 'never' | 'count' | 'date';
  endCount?: number;
  endDate?: Date;
}

export function CalendarCreateDialog({
  isOpen,
  onClose,
  onSuccess
}: CalendarCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [capacity, setCapacity] = useState('10');
  const [notes, setNotes] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  
  const [recurrence, setRecurrence] = useState<RecurrenceRule>({
    frequency: 'none',
    interval: 1,
    weekDays: [],
    endType: 'never'
  });

  const [classes, setClasses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();

  // Fetch classes and instructors
  useEffect(() => {
    const fetchData = async () => {
      const [classesResult, instructorsResult] = await Promise.all([
        supabase.from('classes').select('*').eq('is_active', true),
        supabase
          .from('instructors')
          .select('*, profiles(*)')
          .eq('is_active', true)
      ]);

      if (classesResult.data) setClasses(classesResult.data);
      if (instructorsResult.data) setInstructors(instructorsResult.data);
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(new Date());
    setStartTime('');
    setEndTime('');
    setIsAllDay(false);
    setCapacity('10');
    setNotes('');
    setSelectedClass('');
    setSelectedInstructor('');
    setRecurrence({
      frequency: 'none',
      interval: 1,
      weekDays: [],
      endType: 'never'
    });
  };

  const generateRecurringSessions = (baseDate: Date, rule: RecurrenceRule): Date[] => {
    const sessions: Date[] = [baseDate];
    
    if (rule.frequency === 'none') {
      return sessions;
    }

    const maxSessions = rule.endType === 'count' ? rule.endCount || 1 : 100;
    let currentDate = new Date(baseDate);
    let sessionCount = 1;

    while (sessionCount < maxSessions) {
      switch (rule.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, rule.interval);
          break;
        case 'weekly':
          if (rule.weekDays && rule.weekDays.length > 0) {
            // Multi-day weekly recurrence
            const currentWeekday = currentDate.getDay();
            const nextWeekday = rule.weekDays.find(day => day > currentWeekday);
            
            if (nextWeekday) {
              currentDate = addDays(currentDate, nextWeekday - currentWeekday);
            } else {
              // Move to next week
              currentDate = addWeeks(currentDate, rule.interval);
              currentDate = addDays(currentDate, rule.weekDays[0] - currentDate.getDay());
            }
          } else {
            currentDate = addWeeks(currentDate, rule.interval);
          }
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, rule.interval);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, rule.interval);
          break;
      }

      if (rule.endType === 'date' && rule.endDate && currentDate > rule.endDate) {
        break;
      }

      sessions.push(new Date(currentDate));
      sessionCount++;
    }

    return sessions;
  };

  const handleSubmit = async () => {
    if (!title || !selectedDate) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Generate session dates based on recurrence
      const sessionDates = generateRecurringSessions(selectedDate, recurrence);
      
      for (const sessionDate of sessionDates) {
        let finalDate = new Date(sessionDate);
        
        if (!isAllDay && startTime) {
          const [hours, minutes] = startTime.split(':').map(Number);
          finalDate.setHours(hours, minutes, 0, 0);
        }

        // Create class session
        const sessionData: any = {
          session_date: finalDate.toISOString(),
          max_participants: parseInt(capacity),
          status: 'scheduled',
          notes: notes || null,
          type: 'class'
        };

        if (selectedClass) {
          sessionData.class_id = selectedClass;
          // Get duration from class
          const classData = classes.find(c => c.id === selectedClass);
          sessionData.duration_minutes = classData?.duration_minutes || 60;
        } else {
          // Create new class for custom event
          const { data: newClass, error: classError } = await supabase
            .from('classes')
            .insert({
              name: title,
              description: description,
              level: 'Tous niveaux',
              price: 0,
              capacity: parseInt(capacity),
              duration_minutes: isAllDay ? 1440 : calculateDuration(),
              instructor_id: selectedInstructor || null
            })
            .select()
            .single();

          if (classError) throw classError;
          
          sessionData.class_id = newClass.id;
          sessionData.duration_minutes = newClass.duration_minutes;
        }

        if (selectedInstructor) {
          sessionData.instructor_id = selectedInstructor;
        }

        const { error } = await supabase
          .from('class_sessions')
          .insert(sessionData);

        if (error) throw error;
      }

      toast({
        title: "Événement créé",
        description: `${sessionDates.length} session(s) créée(s) avec succès`,
      });

      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('calendarSync'));
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Event creation error:', error);
      toast({
        title: "Erreur de création",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (isAllDay || !startTime || !endTime) return 60;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    return Math.max(0, endTotal - startTotal);
  };

  const toggleWeekDay = (day: number) => {
    const newWeekDays = recurrence.weekDays?.includes(day)
      ? recurrence.weekDays.filter(d => d !== day)
      : [...(recurrence.weekDays || []), day];
    
    setRecurrence(prev => ({ ...prev, weekDays: newWeekDays.sort() }));
  };

  const weekDayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un événement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'événement"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'événement"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Cours existant (optionnel)</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un cours existant" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Instructeur</Label>
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un instructeur" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.profiles.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date et heure
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'dd MMM yyyy', { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Capacité</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                  max="50"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={isAllDay}
                onCheckedChange={setIsAllDay}
              />
              <Label htmlFor="all-day">Toute la journée</Label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Heure de début</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">Heure de fin</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Recurrence */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Récurrence
            </h3>

            <div>
              <Label>Fréquence</Label>
              <Select
                value={recurrence.frequency}
                onValueChange={(value: any) => setRecurrence(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrence.frequency !== 'none' && (
              <>
                <div>
                  <Label>Répéter tous les</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={recurrence.interval}
                      onChange={(e) => setRecurrence(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="52"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {recurrence.frequency === 'daily' && 'jour(s)'}
                      {recurrence.frequency === 'weekly' && 'semaine(s)'}
                      {recurrence.frequency === 'monthly' && 'mois'}
                      {recurrence.frequency === 'yearly' && 'année(s)'}
                    </span>
                  </div>
                </div>

                {recurrence.frequency === 'weekly' && (
                  <div>
                    <Label>Jours de la semaine</Label>
                    <div className="flex gap-1 mt-1">
                      {weekDayNames.map((day, index) => (
                        <Button
                          key={index}
                          variant={recurrence.weekDays?.includes(index) ? 'default' : 'outline'}
                          size="sm"
                          className="w-12 h-8"
                          onClick={() => toggleWeekDay(index)}
                          type="button"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Se termine</Label>
                  <Select
                    value={recurrence.endType}
                    onValueChange={(value: any) => setRecurrence(prev => ({ ...prev, endType: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Jamais</SelectItem>
                      <SelectItem value="count">Après X occurrences</SelectItem>
                      <SelectItem value="date">Le</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrence.endType === 'count' && (
                  <div>
                    <Label>Nombre d'occurrences</Label>
                    <Input
                      type="number"
                      value={recurrence.endCount || ''}
                      onChange={(e) => setRecurrence(prev => ({ ...prev, endCount: parseInt(e.target.value) || undefined }))}
                      min="1"
                      max="365"
                      className="mt-1"
                    />
                  </div>
                )}

                {recurrence.endType === 'date' && (
                  <div>
                    <Label>Date de fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrence.endDate ? 
                            format(recurrence.endDate, 'dd MMM yyyy', { locale: fr }) : 
                            'Sélectionner une date'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrence.endDate}
                          onSelect={(date) => setRecurrence(prev => ({ ...prev, endDate: date }))}
                          disabled={(date) => date < selectedDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes additionnelles"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title}>
            {loading ? 'Création...' : 'Créer l\'événement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}