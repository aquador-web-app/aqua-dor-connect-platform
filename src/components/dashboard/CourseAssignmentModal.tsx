import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Course {
  id: string;
  name: string;
}

interface CourseAssignmentModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CourseAssignmentModal({ course, isOpen, onClose, onSuccess }: CourseAssignmentModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && course) {
      fetchStudents();
      fetchEnrolledStudents();
    }
  }, [isOpen, course]);

  const fetchStudents = async () => {
    try {
      // Get all students (users with student role)
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentUserIds = studentRoles?.map(r => r.user_id) || [];

      if (studentUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('user_id', studentUserIds);

        if (profilesError) throw profilesError;
        setStudents(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les étudiants",
        variant: "destructive",
      });
    }
  };

  const fetchEnrolledStudents = async () => {
    if (!course) return;

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          profiles!enrollments_student_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('class_id', course.id);

      if (error) throw error;

      const enrolled = data?.map(e => e.profiles).filter(Boolean) || [];
      setEnrolledStudents(enrolled as Student[]);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    }
  };

  const handleAssignStudents = async () => {
    if (!course || selectedStudents.length === 0) return;

    setLoading(true);
    try {
      const enrollments = selectedStudents.map(studentId => ({
        student_id: studentId,
        class_id: course.id,
        status: 'active',
        payment_status: 'pending'
      }));

      const { error } = await supabase
        .from('enrollments')
        .insert(enrollments);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${selectedStudents.length} étudiant(s) assigné(s) au cours`,
      });

      setSelectedStudents([]);
      fetchEnrolledStudents();
      onSuccess();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner les étudiants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!course) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('class_id', course.id)
        .eq('student_id', studentId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Étudiant retiré du cours",
      });

      fetchEnrolledStudents();
      onSuccess();
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'étudiant",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const notEnrolled = !enrolledStudents.some(enrolled => enrolled.id === student.id);
    return matchesSearch && notEnrolled;
  });

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gérer les inscriptions</DialogTitle>
          <DialogDescription>
            Assigner des étudiants au cours: {course.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Currently Enrolled Students */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <Label className="text-sm font-semibold">Étudiants inscrits ({enrolledStudents.length})</Label>
            </div>
            
            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun étudiant inscrit pour le moment</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {enrolledStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {student.full_name?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{student.full_name || 'Nom non défini'}</div>
                        <div className="text-xs text-muted-foreground">{student.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Students to Add */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <Label className="text-sm font-semibold">Ajouter des étudiants</Label>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des étudiants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Aucun étudiant trouvé" : "Tous les étudiants sont déjà inscrits"}
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }
                      }}
                    />
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {student.full_name?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{student.full_name || 'Nom non défini'}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {selectedStudents.length > 0 && (
            <Button onClick={handleAssignStudents} disabled={loading}>
              {loading ? (
                "Attribution..."
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assigner ({selectedStudents.length})
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}