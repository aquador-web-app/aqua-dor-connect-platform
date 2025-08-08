import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Star, Calendar, BookOpen, Edit, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CourseAssignmentModal } from "./CourseAssignmentModal";

interface InstructorData {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  experience_years: number;
  hourly_rate: number;
  is_active: boolean;
  specializations: string[];
  total_classes: number;
  average_rating: number;
  created_at: string;
  assigned_courses: number;
}

export function InstructorManagement() {
  const [instructors, setInstructors] = useState<InstructorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInstructors();
    const channel = supabase
      .channel('user_roles-instructor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchInstructors())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInstructors = async () => {
    try {
      setLoading(true);

      // 1) Fetch user_ids with role 'instructor'
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'instructor');
      if (roleError) throw roleError;
      const userIds = (roleRows || []).map(r => r.user_id);
      if (userIds.length === 0) {
        setInstructors([]);
        setLoading(false);
        return;
      }

      // 2) Fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, phone')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;
      const profileIds = (profilesData || []).map(p => p.id);

      // 3) Fetch instructors rows (stats) for those profiles
      const { data: instructorRows, error: instrError } = await supabase
        .from('instructors')
        .select('*')
        .in('profile_id', profileIds);
      if (instrError) throw instrError;

      // 4) Fetch class sessions taught (completed) for totals
      const instructorIds = (instructorRows || []).map(i => i.id);
      const { data: classData, error: classError } = await supabase
        .from('class_sessions')
        .select('instructor_id')
        .in('instructor_id', instructorIds);
      if (classError) throw classError;

      // 5) Assigned active courses count
      const { data: courseData, error: courseError } = await supabase
        .from('classes')
        .select('instructor_id')
        .in('instructor_id', instructorIds)
        .eq('is_active', true);
      if (courseError) throw courseError;

      // 6) Reviews for rating
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('instructor_id, rating')
        .in('instructor_id', instructorIds);
      if (reviewError) throw reviewError;

      // Build list from profiles, joining instructor row if exists
      const list: InstructorData[] = (profilesData || []).map((p) => {
        const instr = (instructorRows || []).find(i => i.profile_id === p.id);
        const totalClasses = (classData || []).filter(c => c.instructor_id === instr?.id).length || 0;
        const assignedCourses = (courseData || []).filter(c => c.instructor_id === instr?.id).length || 0;
        const ratings = (reviewData || []).filter(r => r.instructor_id === instr?.id);
        const averageRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
        return {
          id: instr?.id || p.id, // fallback unique
          profile_id: p.id,
          full_name: p.full_name || 'Nom non défini',
          email: p.email,
          experience_years: instr?.experience_years || 0,
          hourly_rate: Number(instr?.hourly_rate) || 0,
          is_active: instr?.is_active ?? true,
          specializations: instr?.specializations || [],
          total_classes: totalClasses,
          average_rating: averageRating,
          created_at: instr?.created_at || new Date().toISOString(),
          assigned_courses: assignedCourses,
        };
      });

      setInstructors(list);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      toast({ title: 'Erreur', description: "Impossible de charger les instructeurs", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleInstructorStatus = async (instructorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('instructors')
        .update({ is_active: isActive })
        .eq('id', instructorId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Instructeur ${isActive ? 'activé' : 'désactivé'}`,
      });

      fetchInstructors();
    } catch (error) {
      console.error('Error updating instructor status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleCourseAssignment = (instructorId: string, instructorName: string) => {
    setSelectedInstructor({ id: instructorId, name: instructorName });
    setShowAssignmentModal(true);
  };

  const handleAssignmentComplete = () => {
    fetchInstructors();
  };

  const filteredInstructors = instructors.filter(instructor =>
    instructor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (instructors.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gestion des Instructeurs</h2>
            <p className="text-muted-foreground">Liste automatique des coachs (rôle)</p>
          </div>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun instructeur trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Il n'y a actuellement aucun instructeur dans le système. 
              Commencez par promouvoir des utilisateurs au rôle d'instructeur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Instructeurs</h2>
          <p className="text-muted-foreground">Liste automatique des coachs (rôle)</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher instructeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Instructeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Instructeurs Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructors.filter(i => i.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Classes Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructors.reduce((sum, i) => sum + i.total_classes, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructors.length > 0 
                ? (instructors.reduce((sum, i) => sum + i.average_rating, 0) / instructors.length).toFixed(1)
                : '0.0'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Liste des Instructeurs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Taux Horaire</TableHead>
                <TableHead>Cours Assignés</TableHead>
                <TableHead>Classes Données</TableHead>
                <TableHead>Note Moyenne</TableHead>
                <TableHead>Spécialisations</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.map((instructor) => (
                <TableRow key={instructor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{instructor.full_name}</div>
                      <div className="text-sm text-muted-foreground">{instructor.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {instructor.experience_years || 0} ans
                  </TableCell>
                  <TableCell>
                    {instructor.hourly_rate ? `${instructor.hourly_rate}€/h` : 'Non défini'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">{instructor.assigned_courses}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{instructor.total_classes}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>{instructor.average_rating.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {instructor.specializations?.slice(0, 2).map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {instructor.specializations?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{instructor.specializations.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={instructor.is_active}
                      onCheckedChange={(checked) => 
                        toggleInstructorStatus(instructor.id, checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCourseAssignment(instructor.id, instructor.full_name)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instructor assignment modal would go here */}
    </div>
  );
}