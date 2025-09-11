import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeCalendarSync } from './useRealTimeCalendarSync';

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

      // Use direct class_sessions table with proper joins for public view
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          duration_minutes,
          max_participants,
          enrolled_students,
          status,
          type,
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
        .order('session_date', { ascending: true })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // Transform data from direct table query
      const transformedSessions: PublicCalendarSession[] = (sessionsData || []).map((session: any) => ({
        id: session.id,
        class_id: session.classes?.id || '',
        session_date: session.session_date,
        duration_minutes: session.duration_minutes || 60,
        max_participants: session.max_participants || 10,
        enrolled_students: session.enrolled_students || 0,
        status: session.status || 'scheduled',
        type: session.type || 'class',
        instructor_id: session.instructor_id,
        class_name: session.classes?.name || 'Cours de Natation',
        class_level: session.classes?.level || 'beginner',
        class_price: session.classes?.price || 35,
        class_description: session.classes?.description || 'Séance de natation',
        instructor_name: session.instructors?.profiles?.full_name || 'Instructeur'
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

  // Use the centralized real-time sync hook
  useRealTimeCalendarSync({
    onSync: fetchPublicSessions,
    tables: ['class_sessions', 'session_reservations', 'bookings']
  });

  useEffect(() => {
    fetchPublicSessions();
  }, [fetchPublicSessions]);

  return {
    sessions,
    loading,
    error,
    fetchPublicSessions,
    hasData: sessions.length > 0
  };
};