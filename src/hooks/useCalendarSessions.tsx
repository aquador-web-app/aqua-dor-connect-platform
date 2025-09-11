import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CalendarSession {
  id: string;
  session_date: string;
  max_participants: number;
  enrolled_students: number;
  status: string;
  notes?: string;
  duration_minutes: number;
  class_id: string;
  instructor_id?: string;
  classes: {
    id: string;
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

interface UseCalendarSessionsOptions {
  dateRange?: { start: Date; end: Date };
  enableRealtime?: boolean;
}

export const useCalendarSessions = (options: UseCalendarSessionsOptions = {}) => {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = options.dateRange || {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      };

      const { data, error: fetchError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          enrolled_students,
          status,
          notes,
          duration_minutes,
          class_id,
          instructor_id,
          classes!inner (
            id,
            name,
            level,
            price,
            description
          ),
          instructors (
            profiles (
              full_name
            )
          )
        `)
        .gte('session_date', start.toISOString())
        .lte('session_date', end.toISOString())
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true });

      if (fetchError) throw fetchError;

      setSessions(data || []);
    } catch (err: any) {
      console.error('Error fetching calendar sessions:', err);
      setError(err.message);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [options.dateRange, toast]);

  // Real-time sync
  useEffect(() => {
    if (!options.enableRealtime) return;

    const channel = supabase
      .channel('calendar-sessions-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_sessions'
      }, () => {
        fetchSessions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_reservations'
      }, () => {
        fetchSessions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.enableRealtime, fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const refreshSessions = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    refreshSessions,
    hasData: sessions.length > 0
  };
};