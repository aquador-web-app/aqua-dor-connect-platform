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

// Fallback data for when network fails
const fallbackSessions: PublicCalendarSession[] = [
  {
    id: 'fallback-1',
    class_id: 'fallback-class-1',
    session_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    max_participants: 8,
    enrolled_students: 3,
    status: 'scheduled',
    type: 'class',
    class_name: 'Natation Débutant',
    class_level: 'beginner',
    class_price: 35,
    class_description: 'Cours de natation pour débutants',
    instructor_name: 'Instructeur Principal'
  },
  {
    id: 'fallback-2', 
    class_id: 'fallback-class-2',
    session_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    max_participants: 6,
    enrolled_students: 2,
    status: 'scheduled',
    type: 'class',
    class_name: 'Natation Intermédiaire',
    class_level: 'intermediate', 
    class_price: 40,
    class_description: 'Perfectionnement technique',
    instructor_name: 'Instructeur Expert'
  }
];

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

  const fetchPublicSessions = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      const { start, end } = getDateRange();

      // Use the public view for better performance
      const { data: sessionsData, error: sessionsError } = await Promise.race([
        supabase
          .from('public_calendar_sessions')
          .select('*')
          .gte('session_date', start.toISOString())
          .lte('session_date', end.toISOString())
          .order('session_date', { ascending: true })
          .limit(100),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]) as any;

      if (sessionsError) throw sessionsError;

      // Data from public view is already flattened
      const transformedSessions: PublicCalendarSession[] = (sessionsData || []).map((session: any) => ({
        id: session.id,
        class_id: session.class_id,
        session_date: session.session_date,
        duration_minutes: session.duration_minutes || 60,
        max_participants: session.max_participants || 10,
        enrolled_students: session.enrolled_students || 0,
        status: session.status || 'scheduled',
        type: session.type || 'class',
        instructor_id: session.instructor_id,
        class_name: session.class_name || 'Cours',
        class_level: session.class_level || 'beginner',
        class_price: session.class_price || 0,
        class_description: session.class_description,
        instructor_name: session.instructor_name || 'Instructeur'
      }));

      setSessions(transformedSessions);
      
    } catch (error: any) {
      console.error('Error fetching public sessions:', error);
      setError(error.message);
      
      // Retry logic for network failures
      if (retryCount < 2 && (
        error.message?.includes('fetch') || 
        error.message?.includes('timeout') ||
        error.name === 'TypeError'
      )) {
        console.log(`Retrying public sessions fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchPublicSessions(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      // Use fallback data on final failure
      console.log('Using fallback session data');
      setSessions(fallbackSessions.filter(session => {
        const sessionDate = new Date(session.session_date);
        const { start, end } = getDateRange();
        return sessionDate >= start && sessionDate <= end;
      }));
      
      // Don't show error toast for fallback - show a subtle notification
      if (retryCount >= 2) {
        toast({
          title: "Mode hors ligne",
          description: "Affichage des données de démonstration",
          variant: "default"
        });
      }
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
        .subscribe();
    } catch (realtimeError) {
      console.warn('Failed to setup real-time subscription:', realtimeError);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.warn('Failed to cleanup real-time subscription:', cleanupError);
        }
      }
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