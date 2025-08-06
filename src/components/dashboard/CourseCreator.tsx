
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface CourseForm {
  name: string;
  description: string;
  level: string;
  price: number;
  capacity: number;
  duration_minutes: number;
}

const initialForm: CourseForm = {
  name: "",
  description: "",
  level: "beginner",
  price: 0,
  capacity: 10,
  duration_minutes: 60
};

export function CourseCreator() {
  const [form, setForm] = useState<CourseForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || form.price <= 0) {
      toast({
        title: t('common.error'),
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: form.name,
          description: form.description,
          level: form.level,
          price: form.price,
          capacity: form.capacity,
          duration_minutes: form.duration_minutes,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: "Cours créé avec succès",
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createCourse')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('admin.createCourse')}</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau cours à la programmation A'qua D'or
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">{t('course.level')}</Label>
              <Select value={form.level} onValueChange={(value) => setForm({...form, level: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">{t('course.beginner')}</SelectItem>
                  <SelectItem value="intermediate">{t('course.intermediate')}</SelectItem>
                  <SelectItem value="advanced">{t('course.advanced')}</SelectItem>
                  <SelectItem value="lifesaving">{t('course.lifesaving')}</SelectItem>
                  <SelectItem value="competition">{t('course.competition')}</SelectItem>
                </SelectContent>
              </Select>
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
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">participants</span>
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
