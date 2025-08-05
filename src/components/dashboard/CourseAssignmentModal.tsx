import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  name: string;
  description: string;
  level: string;
  price: number;
  capacity: number;
  duration_minutes: number;
}

interface CourseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: string;
  instructorName: string;
  onAssignmentComplete: () => void;
}

export function CourseAssignmentModal({ 
  isOpen, 
  onClose, 
  instructorId, 
  instructorName,
  onAssignmentComplete 
}: CourseAssignmentModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [createNew, setCreateNew] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    description: "",
    level: "beginner",
    price: 0,
    capacity: 10,
    duration_minutes: 60
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les cours",
        variant: "destructive",
      });
    }
  };

  const handleAssignToCourse = async () => {
    if (!selectedCourse && !createNew) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un cours",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let courseId = selectedCourse;

      // Create new course if needed
      if (createNew) {
        const { data: newCourseData, error: createError } = await supabase
          .from('classes')
          .insert({
            name: newCourse.name,
            description: newCourse.description,
            level: newCourse.level,
            price: newCourse.price,
            capacity: newCourse.capacity,
            duration_minutes: newCourse.duration_minutes,
            instructor_id: instructorId,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        courseId = newCourseData.id;
      } else {
        // Update existing course with instructor
        const { error: updateError } = await supabase
          .from('classes')
          .update({ instructor_id: instructorId })
          .eq('id', selectedCourse);

        if (updateError) throw updateError;
      }

      toast({
        title: "Succès",
        description: `${instructorName} a été assigné au cours avec succès`,
      });

      onAssignmentComplete();
      onClose();
      setSelectedCourse("");
      setCreateNew(false);
      setNewCourse({
        name: "",
        description: "",
        level: "beginner",
        price: 0,
        capacity: 10,
        duration_minutes: 60
      });
    } catch (error) {
      console.error('Error assigning course:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le cours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assigner un cours à {instructorName}</DialogTitle>
          <DialogDescription>
            Sélectionnez un cours existant ou créez-en un nouveau pour cet instructeur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!createNew ? "default" : "outline"}
              onClick={() => setCreateNew(false)}
              className="flex-1"
            >
              Cours existant
            </Button>
            <Button
              variant={createNew ? "default" : "outline"}
              onClick={() => setCreateNew(true)}
              className="flex-1"
            >
              Nouveau cours
            </Button>
          </div>

          {!createNew ? (
            <div className="space-y-2">
              <Label htmlFor="course-select">Sélectionner un cours</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="course-select">
                  <SelectValue placeholder="Choisir un cours..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} - {course.level} - {course.price}€
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun cours disponible. Créez un nouveau cours.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-name">Nom du cours</Label>
                  <Input
                    id="course-name"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    placeholder="ex: Natation débutant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-level">Niveau</Label>
                  <Select 
                    value={newCourse.level} 
                    onValueChange={(value) => setNewCourse({ ...newCourse, level: value })}
                  >
                    <SelectTrigger id="course-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="Description du cours..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-price">Prix (€)</Label>
                  <Input
                    id="course-price"
                    type="number"
                    value={newCourse.price}
                    onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-capacity">Capacité</Label>
                  <Input
                    id="course-capacity"
                    type="number"
                    value={newCourse.capacity}
                    onChange={(e) => setNewCourse({ ...newCourse, capacity: Number(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-duration">Durée (min)</Label>
                  <Input
                    id="course-duration"
                    type="number"
                    value={newCourse.duration_minutes}
                    onChange={(e) => setNewCourse({ ...newCourse, duration_minutes: Number(e.target.value) })}
                    min="15"
                    step="15"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleAssignToCourse} disabled={loading}>
              {loading ? "Assignation..." : "Assigner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}