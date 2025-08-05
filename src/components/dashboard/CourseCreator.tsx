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

interface Instructor {
  id: string;
  profile_id: string;
  profiles: {
    full_name: string;
  };
}

interface CourseForm {
  name: string;
  description: string;
  level: string;
  price: number;
  capacity: number;
  duration_minutes: number;
  instructor_id: string;
}

const initialForm: CourseForm = {
  name: "",
  description: "",
  level: "beginner",
  price: 0,
  capacity: 10,
  duration_minutes: 60,
  instructor_id: ""
};

export function CourseCreator() {
  const [form, setForm] = useState<CourseForm>(initialForm);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select(`
          id,
          profile_id,
          profiles!inner (
            full_name
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les instructeurs",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.instructor_id || form.price <= 0) {
      toast({
        title: "Erreur",
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
          instructor_id: form.instructor_id,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Cours créé avec succès",
      });

      setForm(initialForm);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Erreur",
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
          Nouveau Cours
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un Nouveau Cours</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau cours à la programmation A'qua D'or
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du Cours *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Ex: Natation pour débutants"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructeur *</Label>
              <Select value={form.instructor_id} onValueChange={(value) => setForm({...form, instructor_id: value})}>
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
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
              <Label htmlFor="level">Niveau</Label>
              <Select value={form.level} onValueChange={(value) => setForm({...form, level: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                  <SelectItem value="lifesaving">Sauvetage</SelectItem>
                  <SelectItem value="competition">Compétition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Prix (HTG) *</Label>
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
              <Label htmlFor="duration">Durée (min)</Label>
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
            <Label htmlFor="capacity">Capacité Maximum</Label>
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
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                "Création..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Créer le Cours
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}