import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';

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
    const end = endOfMonth(addDays(now, 90)); // Show 3+ months
    return { start, end };
  }, [dateRange]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { start, end } = getDateRange();
      const events: CalendarEvent[] = [];

      // Fetch class sessions (public events)
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
        .eq('status', 'scheduled');

      if (sessionsError) throw sessionsError;

      // Transform class sessions to calendar events
      sessions?.forEach(session => {
        const sessionDate = new Date(session.session_date);
        const endTime = new Date(sessionDate.getTime() + (session.duration_minutes || 60) * 60000);
        
        events.push({
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
          color_code: '#1b1464', // Primary blue for classes
          can_reserve: !showOnlyUserEvents && session.enrolled_students < session.max_participants,
          is_enrolled: false,
          session_id: session.id,
          class_id: session.class_id
        });
      });

      // Fetch user reservations/bookings if authenticated
      if (user && profile) {
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
          .lte('class_sessions.session_date', end.toISOString());

        if (bookingsError) throw bookingsError;

        bookings?.forEach(booking => {
          const sessionDate = new Date(booking.class_sessions.session_date);
          const endTime = new Date(sessionDate.getTime() + (booking.class_sessions.duration_minutes || 60) * 60000);
          
          events.push({
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
            color_code: booking.status === 'cancelled' ? '#dc2626' : 
                       booking.enrollment_status === 'pending' ? '#f59e0b' : '#16a34a',
            can_reserve: false,
            is_enrolled: true,
            user_id: profile.id,
            session_id: booking.class_session_id,
            metadata: { booking_id: booking.id }
          });
        });
      }

      // Filter events based on user role and preferences
      let filteredEvents = events;
      
      if (showOnlyUserEvents && user) {
        filteredEvents = events.filter(event => 
          event.user_id === profile?.id || 
          event.event_type === 'class' // Always show public classes
        );
      }

      setEvents(filteredEvents);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError(err.message);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les événements du calendrier",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, getDateRange, showOnlyUserEvents, toast]);

  // Real-time synchronization
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('universal-calendar-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_sessions'
      }, () => {
        fetchEvents();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchEvents();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'classes'
      }, () => {
        fetchEvents();
      })
      .subscribe();

    // Listen for custom sync events
    const handleCalendarSync = () => {
      fetchEvents();
    };

    window.addEventListener('calendarSync', handleCalendarSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('calendarSync', handleCalendarSync);
    };
  }, [enableRealtime, fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const refreshEvents = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.start_date === dateStr);
  }, [events]);

  const createReservation = useCallback(async (sessionId: string, notes?: string) => {
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
          booking_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create payment record
      const session = events.find(e => e.session_id === sessionId);
      if (session?.price) {
        await supabase
          .from('payments')
          .insert({
            user_id: profile.id,
            booking_id: data.id,
            amount: session.price,
            currency: 'USD',
            status: 'pending',
            payment_method: 'cash'
          });
      }

      toast({
        title: "Réservation créée",
        description: "Votre réservation a été enregistrée en attente de confirmation",
      });

      // Trigger sync
      window.dispatchEvent(new CustomEvent('calendarSync'));
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur de réservation",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [user, profile, events, toast]);

  const markAttendance = useCallback(async (sessionId: string, isPresent: boolean = true) => {
    if (!user || !profile) {
      throw new Error('Vous devez être connecté pour marquer votre présence');
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          student_id: profile.id,
          class_session_id: sessionId,
          present: isPresent,
          status: isPresent ? 'present' : 'absent',
          marked_at: new Date().toISOString(),
          marked_by: profile.id,
          marked_by_role: 'student'
        });

      if (error) throw error;

      toast({
        title: "Présence enregistrée",
        description: isPresent ? "Votre présence a été marquée" : "Votre absence a été enregistrée",
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Erreur de présence",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [user, profile, toast, fetchEvents]);

  return {
    events,
    loading,
    error,
    refreshEvents,
    getEventsForDate,
    createReservation,
    markAttendance,
    hasData: events.length > 0
  };
};