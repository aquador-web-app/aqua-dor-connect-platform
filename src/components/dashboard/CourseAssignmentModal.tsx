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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Course {
  id: string;
  name: string;
  capacity?: number;
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

  const [daysOptions, setDaysOptions] = useState<number[]>([]); // 0-6 (dimanche-samedi)
  const [selectedDayByStudent, setSelectedDayByStudent] = useState<Record<string, number | undefined>>({});

  const availableSeats = (course?.capacity ?? Number.POSITIVE_INFINITY) - enrolledStudents.length;
  const seatsLeft = Math.max(availableSeats - selectedStudents.length, 0);

  useEffect(() => {
    if (isOpen && course) {
      fetchStudents();
      fetchEnrolledStudents();
      fetchCourseDays();
      setSelectedDayByStudent({});
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
        .eq('class_id', course.id)
        .eq('status', 'active');

      if (error) throw error;

      const enrolled = data?.map(e => e.profiles).filter(Boolean) || [];
      setEnrolledStudents(enrolled as Student[]);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    }
  };

  const dayNamesFr = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const dayLabel = (n: number) => dayNamesFr[n] || '';

  const fetchCourseDays = async () => {
    if (!course) return;
    try {
      const { data } = await supabase
        .from('class_sessions')
        .select('session_date, status')
        .eq('class_id', course.id)
        .eq('status', 'scheduled');
      const set = new Set<number>();
      (data || []).forEach((s: any) => set.add(new Date(s.session_date).getDay()));
      setDaysOptions(Array.from(set).sort());
    } catch (e) {
      console.error('Error fetching course days', e);
    }
  };

  const handleAssignStudents = async () => {
    if (!course || selectedStudents.length === 0) return;
    if (selectedStudents.length > availableSeats) {
      toast({
        title: "Information",
        description:
          "No more seats available. Please edit the course to increase capacity if you wish to add more students.",
      });
      return;
    }

    // Require day selection if multiple meeting days exist
    if (daysOptions.length > 1) {
      const missing = selectedStudents.filter((sid) => selectedDayByStudent[sid] === undefined);
      if (missing.length > 0) {
        toast({ title: "Jour requis", description: "Sélectionnez le jour d'affectation pour chaque étudiant.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const enrollments = selectedStudents.map(studentId => ({
        student_id: studentId,
        class_id: course.id,
        status: 'active',
        payment_status: 'pending',
        preferred_day_of_week: selectedDayByStudent[studentId] ?? (daysOptions.length === 1 ? daysOptions[0] : null)
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
      setSelectedDayByStudent({});
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Places disponibles: {seatsLeft}</div>
              {availableSeats <= 0 && (
                <Badge variant="secondary">Complet</Badge>
              )}
            </div>
            {availableSeats <= 0 && (
              <p className="text-sm text-muted-foreground">
                No more seats available. Please edit the course to increase capacity if you wish to add more students.
              </p>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des étudiants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={availableSeats <= 0}
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Aucun étudiant trouvé" : "Tous les étudiants sont déjà inscrits"}
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          if (selectedStudents.length >= availableSeats) return;
                          setSelectedStudents([...selectedStudents, student.id]);
                          setSelectedDayByStudent((prev) => {
                            const next = { ...prev };
                            if (daysOptions.length === 1) next[student.id] = daysOptions[0];
                            return next;
                          });
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          setSelectedDayByStudent((prev) => {
                            const { [student.id]: _omit, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      disabled={!selectedStudents.includes(student.id) && (availableSeats <= 0 || selectedStudents.length >= availableSeats)}
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
                    {selectedStudents.includes(student.id) && daysOptions.length > 1 && (
                      <div className="w-40">
                        <Select
                          value={selectedDayByStudent[student.id]?.toString() ?? undefined}
                          onValueChange={(v) => setSelectedDayByStudent({ ...selectedDayByStudent, [student.id]: Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir le jour" />
                          </SelectTrigger>
                          <SelectContent>
                            {daysOptions.map((d) => (
                              <SelectItem key={d} value={d.toString()}>
                                {dayLabel(d)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {selectedStudents.includes(student.id) && daysOptions.length === 1 && (
                      <Badge variant="secondary">{dayLabel(daysOptions[0])}</Badge>
                    )}
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
            <Button onClick={handleAssignStudents} disabled={loading || seatsLeft <= 0 || selectedStudents.length === 0}>
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