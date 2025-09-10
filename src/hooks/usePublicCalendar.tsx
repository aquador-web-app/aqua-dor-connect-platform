import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PublicCalendarSession {
  id: string;
  class_id: string;
  session_date: string;
  duration_minutes: number;
  max_participants: number;
  enrolled_students: number;
  status: string;
  type: string;
  instructor_id?: string;
  class_name: string;
  class_level: string;
  class_price: number;
  class_description?: string;
  instructor_name?: string;
}


export const usePublicCalendar = (dateRange?: { start: Date; end: Date }) => {
  const [sessions, setSessions] = useState<PublicCalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getDateRange = () => {
    if (dateRange) return dateRange;
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  const fetchPublicSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { start, end } = getDateRange();

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('public_calendar_sessions')
        .select('*')
        .gte('session_date', start.toISOString())
        .lte('session_date', end.toISOString())
        .order('session_date', { ascending: true })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // Transform data from the secure view
      const transformedSessions: PublicCalendarSession[] = (sessionsData || []).map((session: any) => ({
        id: session.id,
        class_id: session.class_id || '',
        session_date: session.session_date,
        duration_minutes: session.duration_minutes || 60,
        max_participants: session.max_participants || 10,
        enrolled_students: session.enrolled_students || 0,
        status: session.status || 'scheduled',
        type: session.type || 'class',
        instructor_id: session.instructor_id,
        class_name: session.class_name || 'Cours de Natation',
        class_level: session.class_level || 'beginner',
        class_price: session.class_price || 35,
        class_description: session.class_description || 'Séance de natation',
        instructor_name: session.instructor_name || 'Instructeur'
      }));

      setSessions(transformedSessions);
      
    } catch (error: any) {
      console.error('Error fetching public sessions:', error);
      setError(error.message);
      setSessions([]);
      
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchPublicSessions();

    // Set up realtime subscription for session updates (with error handling)
    let channel: any = null;
    try {
      channel = supabase
        .channel('public_sessions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'class_sessions'
          },
          () => {
            console.log('Real-time update received, refreshing sessions...');
            fetchPublicSessions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_reservations'
          },
          () => {
            console.log('Reservation update received, refreshing sessions...');
            fetchPublicSessions();
          }
        )
        .subscribe();
    } catch (realtimeError) {
      console.warn('Failed to setup real-time subscription:', realtimeError);
    }

    // Listen for calendar sync events from admin/other calendars
    const handleCalendarSync = (event: CustomEvent) => {
      if (event.detail?.type) {
        console.log('Calendar sync event received:', event.detail.type);
        fetchPublicSessions();
      }
    };

    window.addEventListener('calendarSync', handleCalendarSync as EventListener);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.warn('Failed to cleanup real-time subscription:', cleanupError);
        }
      }
      window.removeEventListener('calendarSync', handleCalendarSync as EventListener);
    };
  }, [fetchPublicSessions]);

  return {
    sessions,
    loading,
    error,
    fetchPublicSessions,
    hasData: sessions.length > 0
  };
};