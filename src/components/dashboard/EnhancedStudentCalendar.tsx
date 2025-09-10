import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock, Users, BookOpen, UserCheck } from "lucide-react";
import { AttendanceButton } from "@/components/calendar/AttendanceButton";
import { PublicCalendarSession } from "@/hooks/usePublicCalendar";

interface StudentReservation {
  id: string;
  status: string;
  created_at: string;
  reservation_notes: string | null;
  class_sessions: {
    id: string;
    session_date: string;
    max_participants: number;
    enrolled_students: number;
    classes: {
      name: string;
      level: string;
      price: number;
      description: string | null;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    } | null;
  };
  session_packages: {
    package_type: string;
    price_per_session: number;
  };
}

interface EnrolledSession {
  id: string;
  session_date: string;
  max_participants: number;
  enrolled_students: number;
  classes: {
    name: string;
    level: string;
    price: number;
    description: string | null;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export function EnhancedStudentCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<StudentReservation[]>([]);
  const [enrolledSessions, setEnrolledSessions] = useState<EnrolledSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchStudentCalendarData();
    }
    
    // Set up real-time subscriptions
    const reservationsChannel = supabase
      .channel('student-reservations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_reservations'
      }, () => {
        fetchStudentCalendarData();
      })
      .subscribe();
      
    const sessionsChannel = supabase
      .channel('student-sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_sessions'
      }, () => {
        fetchStudentCalendarData();
      })
      .subscribe();

    // Listen for calendar sync events
    const handleCalendarSync = (event: CustomEvent) => {
      if (event.detail?.type) {
        fetchStudentCalendarData();
      }
    };

    window.addEventListener('calendarSync', handleCalendarSync as EventListener);

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(sessionsChannel);
      window.removeEventListener('calendarSync', handleCalendarSync as EventListener);
    };
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchStudentCalendarData();
    }
  }, [selectedDate, profile]);

  const fetchStudentCalendarData = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      // Fetch student's reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('session_reservations')
        .select(`
          id,
          status,
          created_at,
          reservation_notes,
          class_sessions!inner (
            id,
            session_date,
            max_participants,
            enrolled_students,
            classes!inner (
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
          ),
          session_packages!inner (
            package_type,
            price_per_session
          )
        `)
        .eq('student_id', profile.id)
        .gte('class_sessions.session_date', startOfMonth.toISOString())
        .lte('class_sessions.session_date', endOfMonth.toISOString())
        .order('created_at', { ascending: false });
        
      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);
      
      // Fetch enrolled sessions (confirmed bookings)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          class_sessions!inner (
            id,
            session_date,
            max_participants,
            enrolled_students,
            classes!inner (
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
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'confirmed')
        .gte('class_sessions.session_date', startOfMonth.toISOString())
        .lte('class_sessions.session_date', endOfMonth.toISOString());
        
      if (bookingsError) throw bookingsError;
      
      const enrolledSessionsList = (bookingsData || [])
        .map(booking => booking.class_sessions)
        .filter(Boolean);
      setEnrolledSessions(enrolledSessionsList);
      
    } catch (error: any) {
      console.error('Error fetching student calendar data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du calendrier",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSessionsForDay = (day: Date) => {
    const reservationsForDay = reservations.filter(reservation => 
      isSameDay(new Date(reservation.class_sessions.session_date), day)
    );
    
    const enrolledForDay = enrolledSessions.filter(session => 
      isSameDay(new Date(session.session_date), day)
    );
    
    return { reservations: reservationsForDay, enrolled: enrolledForDay };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'confirmed':
        return <Badge variant="default">Confirmé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const convertToPublicSession = (session: EnrolledSession): PublicCalendarSession => {
    return {
      id: session.id,
      class_id: '', // Not needed for attendance
      session_date: session.session_date,
      duration_minutes: 60, // Default duration
      max_participants: session.max_participants,
      enrolled_students: session.enrolled_students,
      status: 'scheduled',
      type: 'class',
      class_name: session.classes.name,
      class_level: session.classes.level,
      class_price: session.classes.price,
      class_description: session.classes.description || undefined,
      instructor_name: session.instructors?.profiles.full_name || undefined
    };
  };

  const dayHasEvents = (date: Date) => {
    const { reservations: dayReservations, enrolled: dayEnrolled } = getSessionsForDay(date);
    return dayReservations.length > 0 || dayEnrolled.length > 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-96 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Mon Calendrier</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{ hasEvents: dayHasEvents }}
              modifiersStyles={{ hasEvents: { backgroundColor: 'hsl(var(--primary) / 0.2)' } }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Mes Sessions du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const { reservations: dayReservations, enrolled: dayEnrolled } = getSessionsForDay(selectedDate);
              
              if (dayReservations.length === 0 && dayEnrolled.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune session pour cette date</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Enrolled Sessions */}
                  {dayEnrolled.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {session.classes.name}
                              <Badge variant="default">Inscrit</Badge>
                            </h4>
                            <p className="text-sm opacity-75">
                              {format(parseISO(session.session_date), 'HH:mm')} - 
                              Instructeur: {session.instructors?.profiles.full_name || 'Non assigné'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{session.classes.level}</Badge>
                          <AttendanceButton 
                            session={convertToPublicSession(session)} 
                            variant="outline"
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reservations */}
                  {dayReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="p-4 rounded-lg border-2 border-secondary/20 bg-secondary/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <UserCheck className="h-5 w-5 text-secondary" />
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {reservation.class_sessions.classes.name}
                              {getStatusBadge(reservation.status)}
                            </h4>
                            <p className="text-sm opacity-75">
                              {format(parseISO(reservation.class_sessions.session_date), 'HH:mm')} - 
                              Pack: {reservation.session_packages.package_type}
                            </p>
                            <p className="text-xs opacity-60 mt-1">
                              Réservé le {format(parseISO(reservation.created_at), 'dd/MM/yyyy à HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{reservation.class_sessions.classes.level}</Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              ${reservation.session_packages.price_per_session}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {reservation.class_sessions.enrolled_students}/{reservation.class_sessions.max_participants}
                            </div>
                          </div>
                        </div>
                      </div>
                      {reservation.reservation_notes && (
                        <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                          <strong>Notes:</strong> {reservation.reservation_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}