import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CalendarSession {
  id: string;
  class_id: string;
  session_date: string;
  duration_minutes: number;
  seats_available: number;
  seats_taken: number;
  status: string;
  type: string;
  instructor_id?: string;
  class?: {
    name: string;
    level: string;
    price: number;
  };
  instructor?: {
    profile_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export interface CalendarEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  payment_status: string;
  created_at: string;
  class_sessions?: CalendarSession;
}

export const useUnifiedCalendar = (dateRange?: { start: Date; end: Date }) => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [enrollments, setEnrollments] = useState<CalendarEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate date range - default to current month
  const getDateRange = () => {
    if (dateRange) return dateRange;
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Fetch sessions with class and instructor info
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          classes:class_id (
            name,
            level,
            price
          ),
          instructors:instructor_id (
            profile_id,
            profiles:profile_id (
              full_name
            )
          )
        `)
        .gte('session_date', start.toISOString())
        .lte('session_date', end.toISOString())
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch user enrollments if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      let enrollmentsData: any[] = [];

      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (userProfile) {
          const { data, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select(`
              *,
              class_sessions!inner (
                id,
                session_date,
                class_id
              )
            `)
            .eq('student_id', userProfile.id)
            .gte('class_sessions.session_date', start.toISOString())
            .lte('class_sessions.session_date', end.toISOString());

          if (!enrollmentsError) {
            enrollmentsData = data || [];
          }
        }
      }

      // Map the data to match CalendarSession interface
      const mappedSessions = (sessionsData || []).map((session: any) => ({
        ...session,
        seats_available: session.seats_available || session.max_participants || 10,
        seats_taken: session.seats_taken || session.enrolled_students || 0
      }));
      setSessions(mappedSessions);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du calendrier",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscriptions
  useEffect(() => {
    let sessionChannel: RealtimeChannel;
    let enrollmentChannel: RealtimeChannel;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to class sessions changes
      sessionChannel = supabase
        .channel('calendar_sessions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'class_sessions'
          },
          (payload) => {
            console.log('Session change:', payload);
            fetchCalendarData(); // Refetch on any change
          }
        )
        .subscribe();

      // Subscribe to enrollments changes
      enrollmentChannel = supabase
        .channel('calendar_enrollments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'enrollments'
          },
          (payload) => {
            console.log('Enrollment change:', payload);
            fetchCalendarData(); // Refetch on any change
          }
        )
        .subscribe();
    };

    fetchCalendarData();
    setupRealtimeSubscriptions();

    return () => {
      if (sessionChannel) supabase.removeChannel(sessionChannel);
      if (enrollmentChannel) supabase.removeChannel(enrollmentChannel);
    };
  }, [dateRange]);

  // Create enrollment with atomic transaction
  const createEnrollment = async (sessionId: string, paymentMethod: string = 'cash') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Call the atomic enrollment function
      const { data, error } = await supabase
        .rpc('create_enrollment_atomic' as any, {
          p_student_id: userProfile.id,
          p_class_session_id: sessionId,
          p_payment_method: paymentMethod
        });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; payment_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Enrollment failed');
      }

      toast({
        title: "Réservation créée",
        description: "Votre réservation a été créée avec succès. Paiement en attente.",
      });

      return data;
    } catch (error) {
      console.error('Error creating enrollment:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la réservation",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    sessions,
    enrollments,
    loading,
    fetchCalendarData,
    createEnrollment
  };
};