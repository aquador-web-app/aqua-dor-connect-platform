import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, CreditCard, User, Award, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntelligentCalendar } from "@/components/dashboard/IntelligentCalendar";
import { ProfileModal } from "@/components/profile/ProfileModal";

interface StudentStats {
  totalClasses: number;
  completedSessions: number;
  attendanceRate: number;
  currentLevel: string;
  nextPaymentDue: string | null;
  totalPaid: number;
}

interface Enrollment {
  id: string;
  class_id: string;
  progress_level: number;
  status: string;
  classes: {
    name: string;
    level: string;
    instructor_id: string;
    instructors: {
      profile_id: string;
      profiles: {
        full_name: string;
      };
    };
  };
}

const StudentPortal = () => {
  const [stats, setStats] = useState<StudentStats>({
    totalClasses: 0,
    completedSessions: 0,
    attendanceRate: 0,
    currentLevel: "Débutant",
    nextPaymentDue: null,
    totalPaid: 0
  });
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [nextSessionsByClass, setNextSessionsByClass] = useState<Record<string, string>>({});
  const [attendanceData, setAttendanceData] = useState([
    { week: "Sem 1", attendance: 85 },
    { week: "Sem 2", attendance: 92 },
    { week: "Sem 3", attendance: 78 },
    { week: "Sem 4", attendance: 95 },
  ]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      fetchStudentData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Get enrollments with class and instructor info
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select(`
          id,
          class_id,
          progress_level,
          status,
          classes!inner (
            name,
            level,
            instructor_id,
            instructors!inner (
              profile_id,
              profiles!inner (
                full_name
              )
            )
          )
        `)
        .eq("student_id", profile.id)
        .eq("status", "active");

      setEnrollments(enrollmentsData || []);

      // Fetch next upcoming session for each enrolled class
      if (enrollmentsData && enrollmentsData.length > 0) {
        const classIds = enrollmentsData.map((e: any) => e.class_id);
        const { data: sessionsData } = await supabase
          .from('class_sessions')
          .select('class_id, session_date')
          .in('class_id', classIds)
          .gte('session_date', new Date().toISOString())
          .order('session_date', { ascending: true });
        const map: Record<string, string> = {};
        (sessionsData || []).forEach((s: any) => {
          if (!map[s.class_id]) {
            map[s.class_id] = s.session_date;
          }
        });
        setNextSessionsByClass(map);
      } else {
        setNextSessionsByClass({});
      }

      // Get attendance data
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("status, class_session_id")
        .eq("student_id", profile.id);

      // Get payment data
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, amount, status, paid_at, created_at, currency, payment_method, transaction_id")
        .eq("user_id", profile.id);

      const totalPaid = paymentsData?.reduce((sum, payment) => 
        payment.status === "completed" ? sum + parseFloat(payment.amount.toString()) : sum, 0) || 0;

      setPayments(paymentsData || []);

      const attendanceRate = attendanceData?.length > 0 
        ? (attendanceData.filter(a => a.status === "present").length / attendanceData.length) * 100 
        : 0;

      setStats({
        totalClasses: enrollmentsData?.length || 0,
        completedSessions: attendanceData?.length || 0,
        attendanceRate,
        currentLevel: enrollmentsData?.[0]?.classes.level || "Débutant",
        nextPaymentDue: null,
        totalPaid
      });

    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('student-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'enrollments' },
        () => fetchStudentData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance' },
        () => fetchStudentData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Portail Étudiant</h1>
          <p className="text-muted-foreground">Suivez votre progression et gérez vos cours</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Cours actifs" value={stats.totalClasses} icon={BookOpen} change={{ value: 12, period: "ce mois" }} />
              <StatCard title="Sessions complétées" value={stats.completedSessions} icon={Award} change={{ value: 8, period: "cette semaine" }} />
              <StatCard title="Taux de présence" value={`${Math.round(stats.attendanceRate)}%`} icon={TrendingUp} change={{ value: 5, period: "ce mois" }} />
              <StatCard title="Total payé" value={`$${stats.totalPaid} USD`} icon={CreditCard} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Progress Ring */}
              <Card>
                <CardHeader>
                  <CardTitle>Progression Globale</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ProgressRing progress={stats.attendanceRate} size={120}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(stats.attendanceRate)}%</div>
                      <div className="text-sm text-muted-foreground">Présence</div>
                    </div>
                  </ProgressRing>
                  <div className="mt-4 text-center">
                    <Badge variant="secondary">{stats.currentLevel}</Badge>
                    <p className="text-sm text-muted-foreground mt-2">Niveau actuel</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Chart */}
              <div className="lg:col-span-2">
                <AttendanceChart data={attendanceData} title="Évolution de votre présence" />
              </div>
            </div>

            {/* Current Enrollments */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Mes Cours Actuels</CardTitle>
                <CardDescription>Vos inscriptions actives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Aucun cours actuel</div>
                  ) : (
                    enrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{enrollment.classes.name}</h3>
                            <p className="text-sm text-muted-foreground">Instructeur: {enrollment.classes.instructors.profiles.full_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{enrollment.classes.level}</Badge>
                              <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>{enrollment.status}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Progression</p>
                            <Progress value={enrollment.progress_level} className="w-24 mt-1" />
                            <p className="text-xs text-muted-foreground mt-1">{enrollment.progress_level}%</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning">
            <IntelligentCalendar />
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Mes Paiements</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground">Aucun paiement trouvé.</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border rounded p-3">
                        <div>
                          <p className="font-medium">{p.currency || 'HTG'} {p.amount}</p>
                          <p className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} • {p.payment_method || 'inconnu'} • {p.status}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                          const html = `<h3>Reçu</h3><p>Montant: ${p.amount} ${p.currency || 'HTG'}</p><p>Date: ${new Date(p.created_at).toLocaleString()}</p><p>Statut: ${p.status}</p><p>ID transaction: ${p.transaction_id || ''}</p>`;
                          const blob = new Blob([html], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `receipt-${p.id}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>Télécharger le reçu</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Mon Profil</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsProfileOpen(true)}>Modifier mes informations</Button>
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentPortal;