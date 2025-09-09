import { useState, useEffect } from 'react';
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
  classes: {
    name: string;
    level: string;
    price: number;
    description?: string;
  };
  instructors?: {
    profiles: {
      full_name: string;
    };
  };
}

export const usePublicCalendar = (dateRange?: { start: Date; end: Date }) => {
  const [sessions, setSessions] = useState<PublicCalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getDateRange = () => {
    if (dateRange) return dateRange;
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  const fetchPublicSessions = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Fetch public sessions - no auth required
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          classes:class_id (
            name,
            level,
            price,
            description
          ),
          instructors:instructor_id (
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

      setSessions(sessionsData || []);
    } catch (error) {
      console.error('Error fetching public sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions disponibles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicSessions();

    // Set up realtime subscription for session updates
    const channel = supabase
      .channel('public_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_sessions'
        },
        () => {
          fetchPublicSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  return {
    sessions,
    loading,
    fetchPublicSessions
  };
};