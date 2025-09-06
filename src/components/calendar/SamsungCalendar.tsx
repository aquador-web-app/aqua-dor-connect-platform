import { useState, useEffect } from "react";
import { CalendarView } from "./CalendarView";
import { EventCreateDialog } from "./EventCreateDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  format, 
  parseISO, 
  addDays, 
  addWeeks, 
  addMonths, 
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  getDay
} from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle
} from "lucide-react";
import { ExpandableDayEvents } from "./ExpandableDayEvents";
import { isSameDay } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'class' | 'event' | 'reservation';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  color: string;
  description?: string;
  location?: string;
  attendees?: number;
  maxAttendees?: number;
  level?: string;
  instructor?: string;
  isUserBooked?: boolean;
  canBook?: boolean;
  canMarkAttendance?: boolean;
  price?: number;
  classId?: string;
  sessionId?: string;
  isEnrolled?: boolean;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  type: 'class' | 'event' | 'reservation';
  level?: string;
  maxParticipants?: number;
  color: string;
  alerts: any[];
  recurrence: any;
}

interface SamsungCalendarProps {
  mode?: 'public' | 'student' | 'admin' | 'parent';
  showBookingActions?: boolean;
}

const EVENT_COLORS = {
  class: '#3b82f6', // blue
  event: '#10b981', // green
  reservation: '#ef4444', // red
  admin_event: '#8b5cf6', // purple
};

export function SamsungCalendar({ 
  mode = 'public', 
  showBookingActions = true 
}: SamsungCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [poolRentalDialogOpen, setPoolRentalDialogOpen] = useState(false);
  const [poolRentalDate, setPoolRentalDate] = useState<Date | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<Set<string>>(new Set());

  const { user, profile, isAdmin, isStudent, isParent } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, [selectedDate, user]);

  useEffect(() => {
    // Set up comprehensive real-time subscriptions for cross-app synchronization
    const channel = supabase
      .channel('samsung-calendar-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'class_sessions' 
      }, (payload) => {
        console.log('Class session change:', payload);
        loadEvents();
        // Dispatch global event for other calendar instances
        window.dispatchEvent(new CustomEvent('calendarSync', { 
          detail: { type: 'class_sessions', payload } 
        }));
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings' 
      }, (payload) => {
        console.log('Booking change:', payload);
        loadEvents();
        // Dispatch global event for availability updates
        window.dispatchEvent(new CustomEvent('calendarSync', { 
          detail: { type: 'bookings', payload } 
        }));
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations' 
      }, (payload) => {
        console.log('Reservation change:', payload);
        loadEvents();
        window.dispatchEvent(new CustomEvent('calendarSync', { 
          detail: { type: 'reservations', payload } 
        }));
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'classes' 
      }, (payload) => {
        console.log('Class change:', payload);
        loadEvents();
        window.dispatchEvent(new CustomEvent('calendarSync', { 
          detail: { type: 'classes', payload } 
        }));
      })
      .subscribe();

    // Listen for external calendar sync events
    const handleCalendarSync = (event: CustomEvent) => {
      if (event.detail?.type) {
        loadEvents();
      }
    };

    window.addEventListener('calendarSync', handleCalendarSync as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('calendarSync', handleCalendarSync as EventListener);
    };
  }, []);

  const loadEvents = async (retryCount = 0) => {
    setLoading(true);
    try {
      // Calculate date range based on view mode
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(1); // Start of current month
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead

      const events: CalendarEvent[] = [];

      // Fetch class sessions with timeout
      const { data: sessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          enrolled_students,
          status,
          notes,
          type,
          duration_minutes,
          classes!inner (
            id,
            name,
            level,
            price,
            duration_minutes
          ),
          instructors (
            profiles (
              full_name
            )
          ),
          bookings!left (
            id,
            user_id,
            status
          )
        `)
        .gte('session_date', startDate.toISOString())
        .lte('session_date', endDate.toISOString())
        .eq('status', 'scheduled')
        .order('session_date')
        .abortSignal(AbortSignal.timeout(15000));

      if (sessionsError && !sessionsError.message.includes('aborted')) throw sessionsError;

      // Fetch user enrollments first
      let enrollmentSet = new Set<string>();
      if (profile?.id) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', profile.id)
          .eq('status', 'active');
        
        enrollmentSet = new Set(enrollments?.map(e => e.class_id) || []);
        setUserEnrollments(enrollmentSet);
      }

      sessions?.forEach((session: any) => {
        const startTime = parseISO(session.session_date);
        const endTime = new Date(startTime.getTime() + (session.duration_minutes || session.classes.duration_minutes || 60) * 60000);
        
        const confirmedBookings = session.bookings?.filter((b: any) => b.status === 'confirmed') || [];
        const userBooking = confirmedBookings.find((b: any) => b.user_id === profile?.id);
        const isEnrolled = enrollmentSet.has(session.class_id);
        const canBook = confirmedBookings.length < session.max_participants && !userBooking && (isStudent() || isParent()) && !isEnrolled;

        events.push({
          id: session.id,
          title: session.classes.name,
          start: startTime,
          end: endTime,
          type: session.type === 'event' ? 'event' : 'class',
          status: 'scheduled',
          color: EVENT_COLORS.class,
          description: session.notes || '',
          location: 'Piscine Aqua D\'Or',
          attendees: confirmedBookings.length,
          maxAttendees: session.max_participants,
          level: session.classes.level,
          instructor: session.instructors?.profiles?.full_name || 'Non assigné',
          isUserBooked: !!userBooking,
          canBook,
          canMarkAttendance: !!userBooking && (isStudent() || isParent()),
          price: session.classes.price,
          classId: session.class_id,
          sessionId: session.id,
          isEnrolled
        });
      });

      // Fetch reservations (for admin/instructor view)
      if (isAdmin() || mode === 'admin') {
        const { data: reservations, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            id,
            reservation_date,
            duration_minutes,
            purpose,
            notes,
            status
          `)
          .gte('reservation_date', startDate.toISOString())
          .lte('reservation_date', endDate.toISOString())
          .eq('status', 'confirmed');

        if (reservationsError) throw reservationsError;

        reservations?.forEach((reservation: any) => {
          const startTime = parseISO(reservation.reservation_date);
          const endTime = new Date(startTime.getTime() + reservation.duration_minutes * 60000);

          events.push({
            id: reservation.id,
            title: reservation.purpose || 'Réservation personnelle',
            start: startTime,
            end: endTime,
            type: 'reservation',
            status: 'confirmed',
            color: EVENT_COLORS.reservation,
            description: reservation.notes || '',
            location: 'Piscine Aqua D\'Or'
          });
        });
      }

      // Fetch personal reservations for students
      if ((isStudent() || isParent()) && profile) {
        const { data: personalReservations, error: personalReservationsError } = await supabase
          .from('reservations')
          .select(`
            id,
            reservation_date,
            duration_minutes,
            purpose,
            notes,
            status
          `)
          .eq('student_id', profile.id)
          .gte('reservation_date', startDate.toISOString())
          .lte('reservation_date', endDate.toISOString())
          .eq('status', 'confirmed');

        if (personalReservationsError) throw personalReservationsError;

        personalReservations?.forEach((reservation: any) => {
          const startTime = parseISO(reservation.reservation_date);
          const endTime = new Date(startTime.getTime() + reservation.duration_minutes * 60000);

          events.push({
            id: `personal-${reservation.id}`,
            title: reservation.purpose || 'Ma réservation',
            start: startTime,
            end: endTime,
            type: 'reservation',
            status: 'confirmed',
            color: EVENT_COLORS.reservation,
            description: reservation.notes || '',
            location: 'Piscine Aqua D\'Or'
          });
        });
      }

      setEvents(events);
    } catch (error) {
      console.error('Error loading events:', error);
      
      // Retry logic for network failures
      if (retryCount < 2 && (error instanceof TypeError || error?.message?.includes('fetch'))) {
        console.log(`Retrying events load (attempt ${retryCount + 1})`);
        setTimeout(() => loadEvents(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      // Show error toast only after all retries failed
      toast({
        title: "Erreur de connexion",
        description: "Impossible de charger les événements. Vérifiez votre connexion internet.",
        variant: "destructive"
      });
      
      // Set empty events as fallback
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreate = (date: Date) => {
    if (!isAdmin()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent créer des événements",
        variant: "destructive"
      });
      return;
    }
    
    // Prevent creating events on Sundays (pool is closed)
    if (date.getDay() === 0) {
      toast({
        title: "Jour fermé",
        description: "La piscine est fermée le dimanche, impossible de créer un événement",
        variant: "destructive"
      });
      return;
    }
    
    setCreateDate(date);
    setCreateDialogOpen(true);
  };

  const handlePoolRental = (date: Date) => {
    // Prevent rentals on Sundays (pool is closed)
    if (date.getDay() === 0) {
      toast({
        title: "Jour fermé",
        description: "La piscine est fermée le dimanche",
        variant: "destructive"
      });
      return;
    }
    
    setPoolRentalDate(date);
    setPoolRentalDialogOpen(true);
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  const generateRecurringEvents = (eventData: EventFormData, startDate: Date) => {
    const events: any[] = [];
    const { recurrence } = eventData;

    if (recurrence.frequency === 'none') {
      return [{ startDate }];
    }

    const endCondition = recurrence.endType;
    const maxOccurrences = recurrence.endCount || 100;
    const endDate = recurrence.endDate || addMonths(startDate, 12);

    let currentDate = new Date(startDate);
    let count = 0;

    while (count < maxOccurrences) {
      events.push({ startDate: new Date(currentDate) });
      count++;

      // Calculate next occurrence
      if (recurrence.frequency === 'daily') {
        currentDate = addDays(currentDate, recurrence.interval);
      } else if (recurrence.frequency === 'weekly') {
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          // Find next day of week
          let nextDate = addDays(currentDate, 1);
          while (!recurrence.daysOfWeek.includes(getDay(nextDate))) {
            nextDate = addDays(nextDate, 1);
          }
          currentDate = nextDate;
        } else {
          currentDate = addWeeks(currentDate, recurrence.interval);
        }
      } else if (recurrence.frequency === 'monthly') {
        currentDate = addMonths(currentDate, recurrence.interval);
      } else if (recurrence.frequency === 'custom') {
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          // Custom days of week
          let nextDate = addDays(currentDate, 1);
          while (!recurrence.daysOfWeek.includes(getDay(nextDate))) {
            nextDate = addDays(nextDate, 1);
          }
          currentDate = nextDate;
        } else {
          currentDate = addDays(currentDate, recurrence.interval);
        }
      }

      // Check end conditions
      if (endCondition === 'date' && currentDate > endDate) break;
      if (endCondition === 'count' && count >= maxOccurrences) break;
    }

    return events;
  };

  const handleSaveEvent = async (eventData: EventFormData) => {
    try {
      setLoading(true);

      // Calculate end time
      let endDateTime = new Date(eventData.startDate);
      if (!eventData.isAllDay) {
        const [startHours, startMinutes] = eventData.startTime.split(':').map(Number);
        const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
        
        const startTime = new Date(eventData.startDate);
        startTime.setHours(startHours, startMinutes, 0, 0);
        
        endDateTime = new Date(eventData.endDate);
        endDateTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        endDateTime.setHours(23, 59, 59, 999);
      }

      // Generate recurring events
      const occurrences = generateRecurringEvents(eventData, eventData.startDate);

      for (const occurrence of occurrences) {
        const sessionDate = new Date(occurrence.startDate);
        if (!eventData.isAllDay) {
          const [hours, minutes] = eventData.startTime.split(':').map(Number);
          sessionDate.setHours(hours, minutes, 0, 0);
        }

        if (eventData.type === 'class') {
          // Create class session
          const { error } = await supabase
            .from('class_sessions')
            .insert({
              class_id: null, // Will need to handle class creation
              instructor_id: null,
              session_date: sessionDate.toISOString(),
              max_participants: eventData.maxParticipants || 10,
              notes: eventData.description,
              status: 'scheduled',
              type: 'class',
              duration_minutes: eventData.isAllDay ? 480 : Math.floor((endDateTime.getTime() - sessionDate.getTime()) / 60000)
            });
          
          if (error) throw error;
        } else {
          // Create reservation or event
          const { error } = await supabase
            .from('reservations')
            .insert({
              student_id: profile?.id,
              reservation_date: sessionDate.toISOString(),
              duration_minutes: eventData.isAllDay ? 480 : Math.floor((endDateTime.getTime() - sessionDate.getTime()) / 60000),
              purpose: eventData.title,
              notes: eventData.description,
              status: 'confirmed'
            });
          
          if (error) throw error;
        }
      }

      toast({
        title: "Événement créé",
        description: `${occurrences.length} occurrence(s) créée(s) avec succès`,
      });

      await loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'événement",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBookEvent = async (eventId: string) => {
    // Redirect unauthenticated users to sign in
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver un cours",
        variant: "default",
      });
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }

    if (!profile) {
      toast({
        title: "Profil requis",
        description: "Veuillez compléter votre profil pour réserver",
        variant: "destructive",
      });
      return;
    }

    // Find the event
    const event = events.find(e => e.id === eventId);
    if (!event || event.type !== 'class') {
      toast({
        title: "Erreur",
        description: "Session non trouvée",
        variant: "destructive",
      });
      return;
    }

    // Check if session is full
    if (event.attendees >= event.maxAttendees) {
      toast({
        title: "Session complète",
        description: "Cette session a atteint sa capacité maximale",
        variant: "destructive",
      });
      return;
    }

    // Check if user already booked
    if (event.isUserBooked) {
      toast({
        title: "Déjà réservé",
        description: "Vous avez déjà réservé cette session",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get class information for the booking
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          class_id,
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
        .eq('id', eventId)
        .single();

      if (sessionError) throw sessionError;

      // Create booking with pending enrollment status
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          class_session_id: eventId,
          status: 'confirmed',
          enrollment_status: 'pending' // New pending workflow
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create pending payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: profile.id,
          booking_id: booking.id,
          amount: sessionData.classes.price,
          currency: 'HTG',
          status: 'pending',
          payment_method: 'cash', // Default to cash, can be updated later
          admin_verified: false,
          verified: false
        });

      if (paymentError) throw paymentError;

      toast({
        title: "📋 Demande d'inscription soumise!",
        description: `Votre demande pour "${sessionData.classes.name}" est en attente d'approbation administrative. Vous serez notifié de la validation.`,
      });

      await loadEvents();
      
      // Trigger global sync
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'booking_created', eventId } 
      }));
    } catch (error) {
      console.error('Error booking event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre votre demande d'inscription",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (eventId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by student'
        })
        .eq('class_session_id', eventId)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée avec succès",
      });

      await loadEvents();
      
      // Trigger global sync for availability updates
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'booking_cancelled', eventId } 
      }));
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la réservation",
        variant: "destructive"
      });
    }
  };

  const handleMarkAttendance = async (eventId: string, status: 'present' | 'absent') => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          student_id: profile.id,
          class_session_id: eventId,
          status,
          marked_by: profile.id,
          marked_by_role: 'student'
        });

      if (error) throw error;

      toast({
        title: "Présence marquée",
        description: `Votre présence a été marquée comme ${status === 'present' ? 'présent' : 'absent'}`,
      });

      // Trigger global sync for attendance updates
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'attendance_marked', eventId, status } 
      }));
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer votre présence",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = async (event: CalendarEvent) => {
    if (!isAdmin()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent modifier les événements",
        variant: "destructive"
      });
      return;
    }

    setEditingEvent(event);
    setEditDialogOpen(true);
    setEventDetailsOpen(false);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!isAdmin()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent supprimer les événements",
        variant: "destructive"
      });
      return;
    }

    setEditingEvent(event);
    setDeleteDialogOpen(true);
    setEventDetailsOpen(false);
  };

  const confirmDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      setLoading(true);

      // Delete from appropriate table based on event type
      if (editingEvent.type === 'reservation') {
        const reservationId = editingEvent.id.startsWith('personal-') 
          ? editingEvent.id.replace('personal-', '') 
          : editingEvent.id;
        
        const { error } = await supabase
          .from('reservations')
          .delete()
          .eq('id', reservationId);

        if (error) throw error;
      } else {
        // Class session or event
        const { error } = await supabase
          .from('class_sessions')
          .delete()
          .eq('id', editingEvent.id);

        if (error) throw error;
      }

      toast({
        title: "Événement supprimé",
        description: "L'événement a été supprimé avec succès",
      });

      await loadEvents();
      
      // Trigger global sync
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'event_deleted', eventId: editingEvent.id } 
      }));

    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'événement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setEditingEvent(null);
    }
  };

  const handleUpdateEvent = async (eventData: EventFormData) => {
    if (!editingEvent) return;

    try {
      setLoading(true);

      // Calculate end time
      let endDateTime = new Date(eventData.startDate);
      if (!eventData.isAllDay) {
        const [startHours, startMinutes] = eventData.startTime.split(':').map(Number);
        const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
        
        const startTime = new Date(eventData.startDate);
        startTime.setHours(startHours, startMinutes, 0, 0);
        
        endDateTime = new Date(eventData.endDate);
        endDateTime.setHours(endHours, endMinutes, 0, 0);
      } else {
        endDateTime.setHours(23, 59, 59, 999);
      }

      const sessionDate = new Date(eventData.startDate);
      if (!eventData.isAllDay) {
        const [hours, minutes] = eventData.startTime.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);
      }

      if (editingEvent.type === 'reservation') {
        // Update reservation
        const reservationId = editingEvent.id.startsWith('personal-') 
          ? editingEvent.id.replace('personal-', '') 
          : editingEvent.id;
        
        const { error } = await supabase
          .from('reservations')
          .update({
            reservation_date: sessionDate.toISOString(),
            duration_minutes: eventData.isAllDay ? 480 : Math.floor((endDateTime.getTime() - sessionDate.getTime()) / 60000),
            purpose: eventData.title,
            notes: eventData.description
          })
          .eq('id', reservationId);

        if (error) throw error;
      } else {
        // Update class session
        const { error } = await supabase
          .from('class_sessions')
          .update({
            session_date: sessionDate.toISOString(),
            max_participants: eventData.maxParticipants || 10,
            notes: eventData.description,
            duration_minutes: eventData.isAllDay ? 480 : Math.floor((endDateTime.getTime() - sessionDate.getTime()) / 60000),
            type: eventData.type
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
      }

      toast({
        title: "Événement modifié",
        description: "L'événement a été modifié avec succès",
      });

      await loadEvents();
      
      // Trigger global sync
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'event_updated', eventId: editingEvent.id } 
      }));

    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'événement",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
      setEditDialogOpen(false);
      setEditingEvent(null);
    }
  };

  const renderEventDetails = () => {
    if (!selectedEvent) return null;

    return (
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <span>{selectedEvent.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(selectedEvent.start, 'EEEE d MMMM yyyy', { locale: fr })}</span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
              </span>
            </div>

            {selectedEvent.location && (
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{selectedEvent.location}</span>
              </div>
            )}


            {selectedEvent.maxAttendees && (
              <div className="flex items-center space-x-2 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  {selectedEvent.attendees}/{selectedEvent.maxAttendees} participants
                </span>
              </div>
            )}

            {selectedEvent.description && (
              <div className="text-sm">
                <strong>Description:</strong>
                <p className="mt-1 text-muted-foreground">{selectedEvent.description}</p>
              </div>
            )}

            <Separator />

            <div className="flex space-x-2">
              {selectedEvent.canBook && showBookingActions && (
                <Button
                  size="sm"
                  onClick={() => handleBookEvent(selectedEvent.id)}
                  className="flex-1 bg-gradient-accent animate-fade-in"
                >
                  Réserver
                </Button>
              )}

              {selectedEvent.isUserBooked && showBookingActions && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancelBooking(selectedEvent.id)}
                  className="flex-1 animate-fade-in"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Annuler Réservation
                </Button>
              )}

              {selectedEvent.canMarkAttendance && showBookingActions && (
                <div className="flex space-x-2 flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAttendance(selectedEvent.id, 'present')}
                    className="flex-1 text-green-600 hover:text-green-700 hover-scale"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Présent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAttendance(selectedEvent.id, 'absent')}
                    className="flex-1 text-red-600 hover:text-red-700 hover-scale"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Absent
                  </Button>
                </div>
              )}

              {isAdmin() && (
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="hover-scale text-blue-600 hover:text-blue-700"
                    onClick={() => handleEditEvent(selectedEvent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="hover-scale text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteEvent(selectedEvent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <CalendarView
        onEventCreate={handleEventCreate}
        onEventSelect={handleEventSelect}
        onPoolRental={handlePoolRental}
        events={events}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        isAdmin={isAdmin()}
        loading={loading}
      />

      <EventCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleSaveEvent}
        selectedDate={createDate}
      />

      {/* Edit Event Dialog */}
      <EventCreateDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateEvent}
        selectedDate={editingEvent?.start}
        isEditing={true}
        existingEvent={editingEvent ? {
          title: editingEvent.title,
          description: editingEvent.description || '',
          startDate: editingEvent.start,
          endDate: editingEvent.end,
          startTime: format(editingEvent.start, 'HH:mm'),
          endTime: format(editingEvent.end, 'HH:mm'),
          isAllDay: false,
          location: editingEvent.location || '',
          type: editingEvent.type,
          level: editingEvent.level,
          maxParticipants: editingEvent.maxAttendees,
          color: editingEvent.color,
          alerts: [],
          recurrence: {
            frequency: 'none',
            interval: 1,
            endType: 'never'
          }
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              <span>Supprimer l'événement</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action ne peut pas être annulée.
            </p>
            
            {editingEvent && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium text-sm">{editingEvent.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(editingEvent.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={confirmDeleteEvent}
                disabled={loading}
              >
                {loading ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderEventDetails()}

      {/* Pool Rental Dialog */}
      <Dialog open={poolRentalDialogOpen} onOpenChange={setPoolRentalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Réserver la piscine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {poolRentalDate && poolRentalDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <p className="text-muted-foreground mt-2">
                Contactez-nous pour réserver la piscine pour cette journée.
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => {
                  window.open('tel:+33123456789', '_self');
                }}
                className="flex-1"
              >
                Appeler
              </Button>
              <Button
                onClick={() => {
                  window.open('mailto:contact@aquador.com?subject=Réservation piscine&body=Je souhaite réserver la piscine pour le ' + poolRentalDate?.toLocaleDateString('fr-FR'), '_blank');
                }}
                variant="outline"
                className="flex-1"
              >
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}