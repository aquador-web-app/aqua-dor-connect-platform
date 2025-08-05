import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Star, Calendar, Award, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AttendanceChart } from "./AttendanceChart";
import { StatCard } from "./StatCard";

interface AnalyticsData {
  totalSessions: number;
  totalStudents: number;
  retentionRate: number;
  averageRating: number;
  weeklyLoad: number;
  topStudents: Array<{
    name: string;
    progress: number;
    sessions: number;
  }>;
  performanceData: Array<{
    week: string;
    attendance: number;
    satisfaction: number;
  }>;
  feedbackTrends: Array<{
    date: string;
    rating: number;
    comment?: string;
  }>;
}

export function InstructorAnalytics() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    if (profile?.id) {
      fetchAnalytics();
    }
  }, [profile?.id, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get instructor record
      const { data: instructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!instructor) return;

      const timeFilter = getTimeFilter();

      // Fetch total sessions delivered
      const { data: sessions, count: totalSessions } = await supabase
        .from('class_sessions')
        .select('id, session_date', { count: 'exact' })
        .eq('instructor_id', instructor.id)
        .eq('status', 'completed')
        .gte('session_date', timeFilter);

      // Fetch unique students
      const { data: enrollments, count: totalStudents } = await supabase
        .from('enrollments')
        .select('student_id, classes!inner(instructor_id)', { count: 'exact' })
        .eq('classes.instructor_id', instructor.id)
        .eq('status', 'active');

      // Fetch attendance for retention calculation
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id, 
          student_id,
          class_sessions!inner(instructor_id, session_date)
        `)
        .eq('class_sessions.instructor_id', instructor.id)
        .gte('class_sessions.session_date', timeFilter);

      // Calculate retention rate
      const retentionRate = calculateRetentionRate(attendanceData || []);

      // Fetch ratings and feedback
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating, comment, created_at')
        .eq('instructor_id', instructor.id)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false });

      const averageRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Get top performing students
      const topStudents = await getTopStudents(instructor.id);

      // Generate performance data for charts
      const performanceData = generatePerformanceData(attendanceData || [], reviews || []);

      setAnalytics({
        totalSessions: totalSessions || 0,
        totalStudents: totalStudents || 0,
        retentionRate,
        averageRating,
        weeklyLoad: Math.round((totalSessions || 0) / getWeeksInRange()),
        topStudents,
        performanceData,
        feedbackTrends: reviews?.map(r => ({
          date: r.created_at,
          rating: r.rating,
          comment: r.comment
        })) || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getWeeksInRange = () => {
    switch (timeRange) {
      case 'week': return 1;
      case 'month': return 4;
      case 'quarter': return 12;
    }
  };

  const calculateRetentionRate = (attendanceData: any[]) => {
    if (attendanceData.length === 0) return 0;
    
    const studentSessions = attendanceData.reduce((acc, record) => {
      acc[record.student_id] = (acc[record.student_id] || 0) + 1;
      return acc;
    }, {});

    const activeStudents = Object.values(studentSessions).filter((count: any) => count >= 2).length;
    const totalStudents = Object.keys(studentSessions).length;
    
    return totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  };

  const getTopStudents = async (instructorId: string) => {
    const { data } = await supabase
      .from('attendance')
      .select(`
        student_id,
        profiles!inner(full_name),
        class_sessions!inner(instructor_id)
      `)
      .eq('class_sessions.instructor_id', instructorId)
      .eq('status', 'present');

    const studentProgress = (data || []).reduce((acc: any, record: any) => {
      const studentId = record.student_id;
      if (!acc[studentId]) {
        acc[studentId] = {
          name: record.profiles.full_name || 'Étudiant',
          sessions: 0,
          progress: 0
        };
      }
      acc[studentId].sessions += 1;
      acc[studentId].progress = Math.min(100, acc[studentId].sessions * 10); // 10% per session
      return acc;
    }, {});

    return Object.values(studentProgress)
      .sort((a: any, b: any) => (b as any).progress - (a as any).progress)
      .slice(0, 5) as Array<{
        name: string;
        progress: number;
        sessions: number;
      }>;
  };

  const generatePerformanceData = (attendanceData: any[], reviews: any[]) => {
    const weeks = [];
    const now = new Date();
    
    for (let i = getWeeksInRange() - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i as number) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const weekAttendance = attendanceData.filter(record => {
        const sessionDate = new Date(record.class_sessions.session_date);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      const weekReviews = reviews.filter(review => {
        const reviewDate = new Date(review.created_at);
        return reviewDate >= weekStart && reviewDate <= weekEnd;
      });

      const avgSatisfaction = weekReviews.length > 0 
        ? Math.round((weekReviews.reduce((sum, r) => sum + r.rating, 0) / weekReviews.length) * 20)
        : 0;

      weeks.push({
        week: `S${i + 1}`,
        attendance: weekAttendance.length,
        satisfaction: avgSatisfaction
      });
    }

    return weeks;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Aucune donnée analytique disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'quarter'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Trimestre'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Sessions Données"
          value={analytics.totalSessions}
          icon={Calendar}
          change={{ value: 12, period: "le mois dernier" }}
        />
        <StatCard
          title="Élèves Actifs"
          value={analytics.totalStudents}
          icon={Users}
          change={{ value: 8, period: "le mois dernier" }}
        />
        <StatCard
          title="Taux de Rétention"
          value={`${analytics.retentionRate}%`}
          icon={TrendingUp}
          change={{ value: 5, period: "le mois dernier" }}
        />
        <StatCard
          title="Note Moyenne"
          value={analytics.averageRating.toFixed(1)}
          icon={Star}
          change={{ value: 0.2, period: "le mois dernier" }}
        />
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <AttendanceChart 
          data={analytics.performanceData} 
          title="Performance Hebdomadaire"
        />

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span>Meilleurs Élèves</span>
            </CardTitle>
            <CardDescription>Étudiants avec le plus de progrès</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topStudents.map((student, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.sessions} sessions
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={student.progress} className="w-20" />
                  <span className="text-sm font-medium">{student.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Load and Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-secondary" />
              <span>Charge Hebdomadaire</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.weeklyLoad}</div>
            <p className="text-muted-foreground">sessions par semaine en moyenne</p>
            <Progress value={(analytics.weeklyLoad / 20) * 100} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commentaires Récents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.feedbackTrends.slice(0, 3).map((feedback, index) => (
              <div key={index} className="border-l-2 border-primary pl-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < feedback.rating ? 'fill-primary text-primary' : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(feedback.date).toLocaleDateString()}
                  </span>
                </div>
                {feedback.comment && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {feedback.comment}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}