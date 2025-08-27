import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, Calendar as CalendarIcon, Plus, BookOpen, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ClassSession {
  id: string;
  session_date: string;
  max_participants: number;
  enrolled_students: number;
  status: string;
  classes: {
    id: string;
    name: string;
    level: string;
    price: number;
    duration_minutes: number;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
  bookings?: Array<{ id: string; user_id: string; status: string }>;
}

interface Reservation {
  id: string;
  student_id: string;
  reservation_date: string;
  duration_minutes: number;
  purpose: string;
  status: string;
  notes?: string;
}

interface CalendarIndicators {
  [key: string]: {
    color: string;
    label: string;
  };
}

interface UnifiedCalendarProps {
  mode?: 'public' | 'student' | 'admin';
  showBookingActions?: boolean;
  maxDaysAhead?: number;
}

export function UnifiedCalendar({ 
  mode = 'public', 
  showBookingActions = true,
  maxDaysAhead = 90 
}: UnifiedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [monthSessions, setMonthSessions] = useState<ClassSession[]>([]);
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([]);
  const [indicators, setIndicators] = useState<CalendarIndicators>({});
  const [loading, setLoading] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<string[]>([]);
  const [attendaneRecords, setAttendanceRecords] = useState<{ [key: string]: 'present' | 'absent' }>({});

  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();

  // Fetch calendar indicators from admin settings
  useEffect(() => {
    fetchCalendarIndicators();
  }, []);

  // Fetch data when date changes or real-time updates occur
  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('unified-calendar-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'class_sessions' 
      }, () => {
        fetchCalendarData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings' 
      }, () => {
        fetchCalendarData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations' 
      }, () => {
        fetchCalendarData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance' 
      }, () => {
        fetchCalendarData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enrollments' 
      }, () => {
        fetchCalendarData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, user]);

  const fetchCalendarIndicators = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'calendar_indicators')
        .maybeSingle();

      if (data?.setting_value) {
        setIndicators(data.setting_value as CalendarIndicators);
      }
    } catch (error) {
      console.error('Error fetching calendar indicators:', error);
    }
  };

  const fetchCalendarData = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      // Fetch data for the entire month to show indicators properly
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // For detailed view, use the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch class sessions with booking counts for the month (for indicators)
      const { data: monthSessionsData, error: monthSessionsError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          enrolled_students,
          status,
          classes!inner (
            id,
            name,
            level,
            price,
            duration_minutes
          ),
          instructors!inner (
            profiles!inner (
              full_name
            )
          ),
          bookings!left (
            id,
            user_id,
            status
          )
        `)
        .gte('session_date', startOfMonth.toISOString())
        .lte('session_date', endOfMonth.toISOString())
        .eq('status', 'scheduled')
        .order('session_date');

      if (monthSessionsError) {
        console.error('Error fetching month sessions:', monthSessionsError);
        throw monthSessionsError;
      }
      
      console.log('Fetched month sessions:', monthSessionsData?.length || 0);
      
      // Store all month sessions for indicators
      setMonthSessions(monthSessionsData || []);

      // Filter sessions for the selected day
      const daySessionsData = monthSessionsData?.filter(session => 
        isSameDay(new Date(session.session_date), selectedDate)
      ) || [];
      
      console.log('Sessions for selected day:', daySessionsData.length);
      setSessions(daySessionsData);

      // Fetch student enrollments and attendance if in student mode
      let enrollments: string[] = [];
      let attendanceMap: { [key: string]: 'present' | 'absent' } = {};
      
      if (mode === 'student' && profile) {
        // Get student enrollments
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', profile.id)
          .eq('status', 'active');
        
        enrollments = enrollmentData?.map(e => e.class_id) || [];
        
        // Get attendance records for today's sessions
        const sessionIds = daySessionsData.map(s => s.id);
        if (sessionIds.length > 0) {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('class_session_id, status')
            .eq('student_id', profile.id)
            .in('class_session_id', sessionIds);
          
          attendanceData?.forEach(record => {
            attendanceMap[record.class_session_id] = record.status as 'present' | 'absent';
          });
        }
      }
      
      setStudentEnrollments(enrollments);
      setAttendanceRecords(attendanceMap);

      // Fetch reservations based on user permissions
      if (mode === 'admin' || (user && profile)) {
        // Month reservations for indicators
        let monthReservationQuery = supabase
          .from('reservations')
          .select('*')
          .gte('reservation_date', startOfMonth.toISOString())
          .lte('reservation_date', endOfMonth.toISOString())
          .eq('status', 'confirmed');

        // Students only see their own reservations
        if (mode === 'student' && profile) {
          monthReservationQuery = monthReservationQuery.eq('student_id', profile.id);
        }

        const { data: monthReservationsData, error: monthReservationsError } = await monthReservationQuery;
        
        if (monthReservationsError) {
          console.error('Error fetching month reservations:', monthReservationsError);
          throw monthReservationsError;
        }
        
        // Store all month reservations for indicators
        setMonthReservations(monthReservationsData || []);
        
        // Filter reservations for the selected day
        const dayReservationsData = monthReservationsData?.filter(reservation =>
          isSameDay(new Date(reservation.reservation_date), selectedDate)
        ) || [];
        setReservations(dayReservationsData);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du calendrier: " + (error.message || 'Erreur inconnue'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (sessionId: string) => {
    if (!user || !profile) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver un cours",
        variant: "destructive",
      });
      return;
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Check if session is full
    const confirmedBookings = session.bookings?.filter(b => b.status === 'confirmed').length || 0;
    if (confirmedBookings >= session.max_participants) {
      toast({
        title: "Session complète",
        description: "Cette session a atteint sa capacité maximale",
        variant: "destructive",
      });
      return;
    }

    // Check if user already booked
    const existingBooking = session.bookings?.find(b => b.user_id === profile.id && b.status === 'confirmed');
    if (existingBooking) {
      toast({
        title: "Déjà réservé",
        description: "Vous avez déjà réservé cette session",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to book session:', sessionId, 'for profile:', profile.id);
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          class_session_id: sessionId,
          status: 'confirmed'
        });

      if (error) {
        console.error('Booking error:', error);
        throw error;
      }

      toast({
        title: "✅ Réservation Confirmée!",
        description: `${session.classes.name} - ${format(new Date(session.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}`,
      });

      fetchCalendarData();
    } catch (error) {
      console.error('Error booking session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réserver cette session",
        variant: "destructive",
      });
    }
  };

  const getDateIndicators = (date: Date) => {
    const indicators: Array<{ type: string; color: string }> = [];
    
    // Check for class sessions on this date (using month data for proper indicators)
    const hasAdminSessions = monthSessions.some(session => 
      isSameDay(new Date(session.session_date), date)
    );
    
    if (hasAdminSessions) {
      indicators.push({
        type: 'admin_class',
        color: '#3b82f6'
      });
    }

    // Check for student reservations on this date (using month data for proper indicators)
    const hasStudentReservations = monthReservations.some(reservation =>
      isSameDay(new Date(reservation.reservation_date), date)
    );
    
    if (hasStudentReservations) {
      indicators.push({
        type: 'student_booking',
        color: '#ef4444'
      });
    }

    return indicators;
  };

  const renderDateIndicators = (date: Date) => {
    const dateIndicators = getDateIndicators(date);
    
    if (dateIndicators.length === 0) return null;

    return (
      <div className="absolute -top-1 -right-1 flex space-x-1">
        {dateIndicators.map((indicator, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: indicator.color }}
          />
        ))}
      </div>
    );
  };

  const getAvailableSpots = (session: ClassSession) => {
    const confirmedBookings = session.bookings?.filter(b => b.status === 'confirmed').length || 0;
    return session.max_participants - confirmedBookings;
  };

  const handleAttendanceMarking = async (sessionId: string, status: 'present' | 'absent') => {
    if (!user || !profile) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour marquer votre présence",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Marking attendance:', sessionId, status, 'for profile:', profile.id);
      
      const { error } = await supabase
        .from('attendance')
        .upsert({
          student_id: profile.id,
          class_session_id: sessionId,
          status: status,
          marked_by: profile.id,
          marked_by_role: 'student'
        });

      if (error) {
        console.error('Attendance error:', error);
        throw error;
      }

      // Update local attendance records
      setAttendanceRecords(prev => ({
        ...prev,
        [sessionId]: status
      }));

      toast({
        title: "✅ Présence Marquée!",
        description: `Votre présence a été marquée comme ${status === 'present' ? 'présent' : 'absent'}`,
      });

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de marquer votre présence",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Calendrier</span>
            </CardTitle>
            {mode === 'public' && (
              <CardDescription>
                Sélectionnez une date pour voir les cours disponibles
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border w-full"
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const maxDate = new Date();
                  maxDate.setDate(maxDate.getDate() + maxDaysAhead);
                  const isSunday = date.getDay() === 0;
                  const isPastOrFuture = date < today || date > maxDate;
                  
                  // Disable Sundays for non-admin users
                  if (isSunday && !isAdmin) {
                    return true;
                  }
                  
                  return isPastOrFuture;
                }}
                modifiers={{
                  hasIndicator: (date) => getDateIndicators(date).length > 0
                }}
                modifiersStyles={{
                  hasIndicator: { 
                    backgroundColor: 'hsl(var(--accent))',
                    color: 'hsl(var(--accent-foreground))'
                  }
                }}
              />
            </div>
            
            {/* Legend */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Cours disponibles</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Réservations</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </CardTitle>
            <CardDescription>
              Cours disponibles et réservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Class Sessions */}
                {sessions.map((session) => {
                  const availableSpots = getAvailableSpots(session);
                  const isBooked = session.bookings?.some(b => b.user_id === profile?.id && b.status === 'confirmed');
                  const isEnrolled = mode === 'student' && studentEnrollments.includes(session.classes.id);
                  const attendanceStatus = attendaneRecords[session.id];
                  
                  return (
                    <Card key={session.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 text-blue-500" />
                              <h3 className="font-semibold">{session.classes.name}</h3>
                              <Badge variant="secondary">{session.classes.level}</Badge>
                              {isEnrolled && <Badge variant="outline">Inscrit</Badge>}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(session.session_date), 'HH:mm')}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{availableSpots} places libres</span>
                              </div>
                              
                              <div>
                                <span className="font-medium text-primary">
                                  {formatPrice(session.classes.price)}
                                </span>
                              </div>
                              
                              <div>
                                <span>{session.classes.duration_minutes} min</span>
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              Instructeur: {session.instructors.profiles.full_name}
                            </div>
                            
                            {/* Attendance Marking for Enrolled Students */}
                            {isEnrolled && mode === 'student' && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                <div className="text-sm font-medium mb-2">Marquer votre présence:</div>
                                <div className="flex gap-2">
                                  <Button
                                    variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleAttendanceMarking(session.id, 'present')}
                                    className="flex items-center gap-1"
                                  >
                                    ✓ Présent
                                  </Button>
                                  <Button
                                    variant={attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => handleAttendanceMarking(session.id, 'absent')}
                                    className="flex items-center gap-1"
                                  >
                                    ✗ Absent
                                  </Button>
                                </div>
                                {attendanceStatus && (
                                  <div className="text-xs text-muted-foreground mt-2">
                                    Statut actuel: {attendanceStatus === 'present' ? 'Présent' : 'Absent'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {showBookingActions && mode !== 'admin' && !isEnrolled && (
                            <div className="ml-4">
                              {isBooked ? (
                                <Badge variant="default">Réservé</Badge>
                              ) : (
                                <Button
                                  onClick={() => handleBookSession(session.id)}
                                  disabled={availableSpots === 0}
                                  size="sm"
                                >
                                  {availableSpots === 0 ? 'Complet' : 'Réserver'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Personal Reservations */}
                {reservations.map((reservation) => (
                  <Card key={reservation.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Waves className="h-5 w-5 text-red-500" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{reservation.purpose || 'Réservation personnelle'}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(reservation.reservation_date), 'HH:mm')}</span>
                            </div>
                            <span>{reservation.duration_minutes} minutes</span>
                          </div>
                          {reservation.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{reservation.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty state */}
                {sessions.length === 0 && reservations.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Aucun cours disponible pour cette date
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}