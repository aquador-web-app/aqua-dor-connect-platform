import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "./StatCard";
import { RevenueChart } from "./RevenueChart";
import { AttendanceChart } from "./AttendanceChart";
import { UpcomingSessionsList } from "./UpcomingSessionsList";

interface DashboardStats {
  totalUsers: number;
  totalInstructors: number;
  totalCourses: number;
  totalSessions: number;
  totalRevenue: number;
  activeBookings: number;
}

export function OverviewDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalSessions: 0,
    totalRevenue: 0,
    activeBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total instructors
      const { count: instructorsCount } = await supabase
        .from('instructors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total courses
      const { count: coursesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total sessions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: sessionsCount } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('session_date', startOfMonth.toISOString());

      // Fetch total revenue this month
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      // Fetch active bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      setStats({
        totalUsers: usersCount || 0,
        totalInstructors: instructorsCount || 0,
        totalCourses: coursesCount || 0,
        totalSessions: sessionsCount || 0,
        totalRevenue: totalRevenue,
        activeBookings: bookingsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Totaux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+2.5% depuis le mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instructeurs Actifs</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInstructors}</div>
            <p className="text-xs text-muted-foreground">+10% depuis le mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cours Disponibles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">+5% depuis le mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions ce Mois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">+8% depuis le mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% depuis le mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations Actives</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">+3% depuis le mois dernier</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus Mensuels</CardTitle>
            <CardDescription>Évolution des revenus sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={[]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Présence aux Cours</CardTitle>
            <CardDescription>Taux de présence par type de cours</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={[]} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming sessions management */}
      <UpcomingSessionsList mode="admin" daysAhead={14} title="Prochaines sessions (gestion)" />
    </div>
  );
}