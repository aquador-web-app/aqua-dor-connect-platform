import { useState, useEffect } from "react";
import { CalendarView, ViewMode } from "./CalendarView";
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
  initialViewMode?: ViewMode;
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
  initialViewMode = 'agenda',
  showBookingActions = true 
}: SamsungCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();

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

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Calculate date range based on view mode
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(1); // Start of current month
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead

      const events: CalendarEvent[] = [];

      // Fetch class sessions
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
        .order('session_date');

      if (sessionsError) throw sessionsError;

      sessions?.forEach((session: any) => {
        const startTime = parseISO(session.session_date);
        const endTime = new Date(startTime.getTime() + (session.duration_minutes || session.classes.duration_minutes || 60) * 60000);
        
        const confirmedBookings = session.bookings?.filter((b: any) => b.status === 'confirmed') || [];
        const userBooking = confirmedBookings.find((b: any) => b.user_id === profile?.id);
        const canBook = confirmedBookings.length < session.max_participants && !userBooking && (isStudent() || isParent());

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
          canMarkAttendance: !!userBooking && (isStudent() || isParent())
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
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive"
      });
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
    
    setCreateDate(date);
    setCreateDialogOpen(true);
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
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          class_session_id: eventId,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Réservation confirmée",
        description: "Votre réservation a été enregistrée avec succès",
      });

      await loadEvents();
      
      // Trigger global sync for availability updates
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'booking_created', eventId } 
      }));
    } catch (error) {
      console.error('Error booking event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réserver cet événement",
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
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer votre présence",
        variant: "destructive"
      });
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

            {selectedEvent.instructor && (
              <div className="text-sm">
                <strong>Instructeur:</strong> {selectedEvent.instructor}
              </div>
            )}

            {selectedEvent.level && (
              <Badge variant="outline">{selectedEvent.level}</Badge>
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
                  <Button size="sm" variant="outline" className="hover-scale">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="hover-scale">
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onEventCreate={handleEventCreate}
        onEventSelect={handleEventSelect}
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

      {renderEventDetails()}
    </>
  );
}