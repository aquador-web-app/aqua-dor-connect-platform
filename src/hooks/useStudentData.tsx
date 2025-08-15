import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StudentStats {
  totalClasses: number;
  completedSessions: number;
  attendanceRate: number;
  currentLevel: string;
  nextPaymentDue: string | null;
  totalPaid: number;
  upcomingBookings: number;
  activeEnrollments: number;
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
    } | null;
  };
}

interface Booking {
  id: string;
  status: string;
  booking_date: string;
  class_session_id: string;
  class_sessions: {
    id: string;
    session_date: string;
    classes: {
      name: string;
      level: string;
      description: string;
      instructors: {
        profiles: {
          full_name: string;
        };
      } | null;
    };
  };
}

interface AttendanceDataPoint {
  week: string;
  attendance: number;
  period: string;
}

export const useStudentData = () => {
  const [stats, setStats] = useState<StudentStats>({
    totalClasses: 0,
    completedSessions: 0,
    attendanceRate: 0,
    currentLevel: "Débutant",
    nextPaymentDue: null,
    totalPaid: 0,
    upcomingBookings: 0,
    activeEnrollments: 0
  });
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateAttendanceData = async (profileId: string) => {
    try {
      // Get attendance records from the last 8 weeks
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select(`
          status,
          created_at,
          class_session_id,
          class_sessions!inner (
            session_date
          )
        `)
        .eq("student_id", profileId)
        .gte("class_sessions.session_date", eightWeeksAgo.toISOString())
        .order("class_sessions.session_date", { ascending: true });

      if (!attendanceRecords || attendanceRecords.length === 0) {
        return [];
      }

      // Group by week and calculate attendance rate
      const weeklyData: { [key: string]: { present: number; total: number } } = {};
      
      attendanceRecords.forEach((record) => {
        const sessionDate = new Date(record.class_sessions.session_date);
        const weekStart = new Date(sessionDate);
        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { present: 0, total: 0 };
        }
        
        weeklyData[weekKey].total++;
        if (record.status === 'present') {
          weeklyData[weekKey].present++;
        }
      });

      // Convert to chart data format
      return Object.entries(weeklyData)
        .map(([weekStart, data], index) => {
          const date = new Date(weekStart);
          const weekNumber = index + 1;
          const attendanceRate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
          
          return {
            week: `Sem ${weekNumber}`,
            attendance: attendanceRate,
            period: date.toLocaleDateString('fr-FR', { 
              month: 'short', 
              day: 'numeric' 
            })
          };
        })
        .slice(-8); // Keep only last 8 weeks
    } catch (error) {
      console.error("Error calculating attendance data:", error);
      return [];
    }
  };

  const fetchStudentData = async () => {
    if (!user) return;

    try {
      setLoading(true);

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
            instructors (
              profile_id,
              profiles (
                full_name
              )
            )
          )
        `)
        .eq("student_id", profile.id)
        .eq("status", "active");

      setEnrollments(enrollmentsData || []);

      // Get upcoming bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          booking_date,
          class_session_id,
          class_sessions!inner (
            id,
            session_date,
            classes!inner (
              name,
              level,
              description,
              instructors (
                profiles (
                  full_name
                )
              )
            )
          )
        `)
        .eq("user_id", profile.id)
        .eq("status", "confirmed")
        .gte("class_sessions.session_date", new Date().toISOString())
        .order("class_sessions.session_date", { ascending: true });

      setBookings(bookingsData || []);

      // Get all attendance records
      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("status, class_session_id")
        .eq("student_id", profile.id);

      // Get payment data
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, amount, status, paid_at, created_at, currency, payment_method, transaction_id")
        .eq("user_id", profile.id);

      setPayments(paymentsData || []);

      // Calculate stats
      const totalPaid = paymentsData?.reduce((sum, payment) => 
        payment.status === "completed" ? sum + parseFloat(payment.amount.toString()) : sum, 0) || 0;

      const attendanceRate = attendanceRecords?.length > 0 
        ? (attendanceRecords.filter(a => a.status === "present").length / attendanceRecords.length) * 100 
        : 0;

      // Get next payment due (simplified - you might want to implement proper payment scheduling)
      const nextPaymentDue = paymentsData?.find(p => p.status === "pending")?.created_at || null;

      // Calculate attendance data for chart
      const chartData = await calculateAttendanceData(profile.id);
      setAttendanceData(chartData);

      // Determine current level based on enrollments
      const levels = enrollmentsData?.map(e => e.classes.level) || [];
      const currentLevel = levels.length > 0 ? levels[0] : "Débutant";

      setStats({
        totalClasses: enrollmentsData?.length || 0,
        completedSessions: attendanceRecords?.length || 0,
        attendanceRate,
        currentLevel,
        nextPaymentDue,
        totalPaid,
        upcomingBookings: bookingsData?.length || 0,
        activeEnrollments: enrollmentsData?.length || 0
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
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchStudentData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchStudentData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (user) {
      fetchStudentData();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  return {
    stats,
    enrollments,
    bookings,
    payments,
    attendanceData,
    loading,
    refetch: fetchStudentData
  };
};