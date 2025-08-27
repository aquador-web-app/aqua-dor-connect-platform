import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, Eye, MessageCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Student {
  id: string;
  full_name: string;
  email: string;
  swimming_level?: string;
  enrollment_date: string;
  last_attendance?: string;
  total_sessions: number;
  attendance_rate: number;
  current_level: string;
}

interface StudentDetails {
  profile: {
    full_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
  };
  attendance_count: number;
  last_session?: string;
  progress_notes?: string;
}

export function InstructorStudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, [profile?.id]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Get instructor record
      const { data: instructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!instructor) return;

      // Get enrollments for instructor's classes with student details
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          enrollment_date,
          status,
          classes!inner(
            name,
            instructor_id
          ),
          profiles!inner(
            id,
            full_name,
            email
          )
        `)
        .eq('classes.instructor_id', instructor.id)
        .eq('status', 'active');

      if (error) throw error;

      // Get attendance data for each student
      const studentIds = enrollments?.map(e => e.student_id) || [];
      const studentsData: Student[] = [];

      for (const enrollment of enrollments || []) {
        const studentId = enrollment.student_id;
        
        // Get attendance count and last attendance
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('created_at, status')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        const totalSessions = attendanceData?.length || 0;
        const presentSessions = attendanceData?.filter(a => a.status === 'present').length || 0;
        const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
        const lastAttendance = attendanceData?.[0]?.created_at;

        // Get student's current level from latest bulletin or enrollment
        const { data: latestBulletin } = await supabase
          .from('bulletins')
          .select('swimming_level')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1);

        studentsData.push({
          id: studentId,
          full_name: enrollment.profiles.full_name || 'Nom non défini',
          email: enrollment.profiles.email,
          enrollment_date: enrollment.enrollment_date,
          last_attendance: lastAttendance,
          total_sessions: totalSessions,
          attendance_rate: attendanceRate,
          current_level: latestBulletin?.[0]?.swimming_level || 'Non évalué'
        });
      }

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des étudiants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    try {
      // Get student profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, date_of_birth')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;

      // Get attendance count
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId);

      // Get last session date
      const { data: lastSession } = await supabase
        .from('attendance')
        .select('created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get latest progress notes from bulletins
      const { data: latestBulletin } = await supabase
        .from('bulletins')
        .select('progress_notes')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      setSelectedStudent({
        profile: profile || { full_name: 'Nom non défini', email: '' },
        attendance_count: attendanceCount || 0,
        last_session: lastSession?.[0]?.created_at,
        progress_notes: latestBulletin?.[0]?.progress_notes
      });

      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching student details:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de l'étudiant",
        variant: "destructive"
      });
    }
  };

  const getAttendanceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 60) return <Badge variant="secondary">Bon</Badge>;
    if (rate >= 40) return <Badge variant="outline">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mes Élèves</h2>
          <p className="text-muted-foreground">
            Gérez et suivez le progrès de vos étudiants
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un étudiant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Élèves</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Taux de présence moyen</p>
                <p className="text-2xl font-bold">
                  {students.length > 0 
                    ? Math.round(students.reduce((sum, s) => sum + s.attendance_rate, 0) / students.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Actifs ce mois</p>
                <p className="text-2xl font-bold">
                  {students.filter(s => s.last_attendance && 
                    new Date(s.last_attendance) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Étudiants</CardTitle>
          <CardDescription>
            {filteredStudents.length} étudiant{filteredStudents.length !== 1 ? 's' : ''} trouvé{filteredStudents.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Présence</TableHead>
                <TableHead>Dernière session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Aucun étudiant trouvé pour cette recherche' : 'Aucun étudiant assigné'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.full_name}</div>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.current_level}</Badge>
                    </TableCell>
                    <TableCell>{student.total_sessions}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{student.attendance_rate}%</span>
                        {getAttendanceBadge(student.attendance_rate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.last_attendance 
                        ? format(new Date(student.last_attendance), 'dd MMM yyyy', { locale: fr })
                        : 'Jamais'
                      }
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => fetchStudentDetails(student.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'Étudiant</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informations Personnelles</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Nom:</span> {selectedStudent.profile.full_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedStudent.profile.email}</p>
                  {selectedStudent.profile.phone && (
                    <p><span className="font-medium">Téléphone:</span> {selectedStudent.profile.phone}</p>
                  )}
                  {selectedStudent.profile.date_of_birth && (
                    <p><span className="font-medium">Date de naissance:</span> {format(new Date(selectedStudent.profile.date_of_birth), 'dd MMM yyyy', { locale: fr })}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Statistiques</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Sessions suivies:</span> {selectedStudent.attendance_count}</p>
                  {selectedStudent.last_session && (
                    <p><span className="font-medium">Dernière session:</span> {format(new Date(selectedStudent.last_session), 'dd MMM yyyy', { locale: fr })}</p>
                  )}
                </div>
              </div>

              {selectedStudent.progress_notes && (
                <div>
                  <h4 className="font-medium mb-2">Dernières notes de progression</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedStudent.progress_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}