import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  event_type: 'class' | 'reservation' | 'admin_event' | 'system';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'pending';
  capacity?: number;
  enrolled?: number;
  available_seats?: number;
  instructor_name?: string;
  class_name?: string;
  level?: string;
  price?: number;
  color_code?: string;
  can_reserve?: boolean;
  is_enrolled?: boolean;
  attendance_marked?: boolean;
  user_id?: string;
  class_id?: string;
  session_id?: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

interface UseUniversalCalendarOptions {
  userRole?: 'visitor' | 'student' | 'admin' | 'instructor';
  enableRealtime?: boolean;
  showOnlyUserEvents?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const useUniversalCalendar = (options: UseUniversalCalendarOptions = {}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Abort + request guard to prevent stuck loading when requests are aborted
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const {
    userRole = 'visitor',
    enableRealtime = true,
    showOnlyUserEvents = false,
    dateRange
  } = options;

  const getDateRange = useCallback(() => {
    if (dateRange) return dateRange;
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(addMonths(now, 3)); // next 3 months
    return { start, end };
  }, [dateRange]);

  const fetchEvents = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();
      const nextEvents: CalendarEvent[] = [];

      // Fetch public class sessions
      try {
        const { data: sessions, error: sessionsError } = await supabase
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
          .abortSignal(signal);

        if (sessionsError) throw sessionsError;

        sessions?.forEach((session) => {
          if (signal.aborted) return;
          const sessionDate = new Date(session.session_date);
          const endTime = new Date(sessionDate.getTime() + (session.duration_minutes || 60) * 60000);

          nextEvents.push({
            id: session.id,
            title: session.classes.name,
            description: session.classes.description || '',
            start_date: format(sessionDate, 'yyyy-MM-dd'),
            end_date: format(sessionDate, 'yyyy-MM-dd'),
            start_time: format(sessionDate, 'HH:mm'),
            end_time: format(endTime, 'HH:mm'),
            event_type: 'class',
            status: 'scheduled',
            capacity: session.max_participants,
            enrolled: session.enrolled_students,
            available_seats: Math.max(0, session.max_participants - session.enrolled_students),
            instructor_name: session.instructors?.profiles?.full_name,
            class_name: session.classes.name,
            level: session.classes.level,
            price: session.classes.price,
            color_code: 'hsl(var(--primary))',
            can_reserve: !showOnlyUserEvents && session.enrolled_students < session.max_participants,
            is_enrolled: false,
            session_id: session.id,
            class_id: session.class_id,
          });
        });
      } catch (sessionError: any) {
        console.warn('Error fetching sessions:', sessionError);
      }

      // Fetch user bookings if logged in
      if (user && profile && !signal.aborted) {
        try {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              status,
              notes,
              class_session_id,
              enrollment_status,
              class_sessions!inner (
                id,
                session_date,
                duration_minutes,
                classes (
                  name,
                  level,
                  price
                )
              )
            `)
            .eq('user_id', profile.id)
            .gte('class_sessions.session_date', start.toISOString())
            .lte('class_sessions.session_date', end.toISOString())
            .abortSignal(signal);

          if (bookingsError) throw bookingsError;

          bookings?.forEach((booking) => {
            if (signal.aborted) return;
            const sessionDate = new Date(booking.class_sessions.session_date);
            const endTime = new Date(sessionDate.getTime() + (booking.class_sessions.duration_minutes || 60) * 60000);

            nextEvents.push({
              id: `booking-${booking.id}`,
              title: `${booking.class_sessions.classes?.name} (Réservé)`,
              description: booking.notes || '',
              start_date: format(sessionDate, 'yyyy-MM-dd'),
              end_date: format(sessionDate, 'yyyy-MM-dd'),
              start_time: format(sessionDate, 'HH:mm'),
              end_time: format(endTime, 'HH:mm'),
              event_type: 'reservation',
              status: booking.enrollment_status === 'pending' ? 'pending' : 'confirmed',
              class_name: booking.class_sessions.classes?.name,
              level: booking.class_sessions.classes?.level,
              price: booking.class_sessions.classes?.price,
              color_code:
                booking.status === 'cancelled'
                  ? 'hsl(var(--destructive))'
                  : booking.enrollment_status === 'pending'
                  ? 'hsl(var(--accent))'
                  : 'hsl(var(--secondary))',
              can_reserve: false,
              is_enrolled: true,
              user_id: profile.id,
              session_id: booking.class_session_id,
              metadata: { booking_id: booking.id },
            });
          });
        } catch (bookingError: any) {
          console.warn('Error fetching bookings:', bookingError);
        }
      }

      if (signal.aborted) return;

      // Apply filters
      let filtered = nextEvents;
      if (showOnlyUserEvents && user) {
        filtered = nextEvents.filter(
          (event) => event.user_id === profile?.id || event.event_type === 'class'
        );
      }

      if (!signal.aborted && requestId === requestIdRef.current) {
        setEvents(filtered);
      }
    } catch (err: any) {
      if (signal.aborted) return; // ignore aborted errors
      console.error('Error fetching calendar events:', err);
      setError(err?.message || 'Erreur de chargement du calendrier');
      toast({
        title: 'Erreur de chargement',
        description: "Impossible de charger les événements du calendrier",
        variant: 'destructive',
      });
    } finally {
      // Only the latest request clears loading
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [user, profile, getDateRange, showOnlyUserEvents, toast]);

  // Realtime sync with debounce
  useEffect(() => {
    if (!enableRealtime) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchEvents();
      }, 1000);
    };

    const channelName = `calendar-sync-${userRole}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, debouncedFetch)
      .subscribe();

    const handleExternalSync = () => debouncedFetch();
    window.addEventListener('calendarSync', handleExternalSync);

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
      window.removeEventListener('calendarSync', handleExternalSync);
    };
  }, [enableRealtime, fetchEvents, userRole]);

  // Initial load + cleanup
  useEffect(() => {
    fetchEvents();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchEvents]);

  const refreshEvents = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return events.filter((event) => event.start_date === dateStr);
    },
    [events]
  );

  const createReservation = useCallback(
    async (sessionId: string, notes?: string) => {
      if (!user || !profile) {
        throw new Error('Vous devez être connecté pour réserver');
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: profile.id,
            class_session_id: sessionId,
            status: 'confirmed',
            enrollment_status: 'pending',
            notes: notes || '',
            booking_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Create payment record if price known
        const session = events.find((e) => e.session_id === sessionId);
        if (session?.price) {
          await supabase.from('payments').insert({
            user_id: profile.id,
            booking_id: data.id,
            amount: session.price,
            currency: 'USD',
            status: 'pending',
            payment_method: 'cash',
          });
        }

        toast({
          title: 'Réservation créée',
          description: 'Votre réservation a été enregistrée en attente de confirmation',
        });

        window.dispatchEvent(new CustomEvent('calendarSync'));
        return data;
      } catch (error: any) {
        toast({ title: 'Erreur de réservation', description: error.message, variant: 'destructive' });
        throw error;
      }
    },
    [user, profile, events, toast]
  );

  const markAttendance = useCallback(
    async (sessionId: string, isPresent: boolean = true) => {
      if (!user || !profile) {
        throw new Error('Vous devez être connecté pour marquer votre présence');
      }

      try {
        const { error } = await supabase.from('attendance').upsert({
          student_id: profile.id,
          class_session_id: sessionId,
          present: isPresent,
          status: isPresent ? 'present' : 'absent',
          marked_at: new Date().toISOString(),
          marked_by: profile.id,
          marked_by_role: 'student',
        });

        if (error) throw error;

        toast({
          title: 'Présence enregistrée',
          description: isPresent ? 'Votre présence a été marquée' : 'Votre absence a été enregistrée',
        });

        fetchEvents();
      } catch (error: any) {
        toast({ title: 'Erreur de présence', description: error.message, variant: 'destructive' });
        throw error;
      }
    },
    [user, profile, toast, fetchEvents]
  );

  return {
    events,
    loading,
    error,
    refreshEvents,
    getEventsForDate,
    createReservation,
    markAttendance,
    hasData: events.length > 0,
  };
};
