import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ReservationFlow } from "../reservation/ReservationFlow";

interface ClassSession {
  id: string;
  session_date: string;
  max_participants: number;
  status: string;
  notes?: string;
  class_id: string;
  classes: {
    id: string;
    name: string;
    level: string;
    price: number;
    duration_minutes: number;
    description?: string;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
  bookings: Array<{ id: string }>;
}

interface FilterOptions {
  timeOfDay: string;
}

interface CalendarBookingSystemProps {
  onBookingSuccess?: () => void;
}

export function CalendarBookingSystem({ onBookingSuccess }: CalendarBookingSystemProps = {}) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    timeOfDay: 'all'
  });
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchSessions();
  }, [selectedDate, filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          status,
          notes,
          class_id,
          classes(
            id,
            name,
            level,
            price,
            duration_minutes,
            description
          ),
          instructors(
            profiles(full_name)
          ),
          bookings(id)
        `)
        .gte('session_date', startOfDay.toISOString())
        .lte('session_date', endOfDay.toISOString())
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      let filteredSessions = data || [];

      // Apply time of day filter
      if (filters.timeOfDay !== 'all') {
        filteredSessions = filteredSessions.filter(session => {
          const hour = new Date(session.session_date).getHours();
          switch (filters.timeOfDay) {
            case 'morning':
              return hour >= 6 && hour < 12;
            case 'afternoon':
              return hour >= 12 && hour < 17;
            case 'evening':
              return hour >= 17 && hour <= 21;
            default:
              return true;
          }
        });
      }

      setSessions(filteredSessions);
      
      // Update available dates for calendar
      updateAvailableDates();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableDates = async () => {
    try {
      const { data } = await supabase
        .from('class_sessions')
        .select('session_date')
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString());

      const dates = data?.map(session => new Date(session.session_date)) || [];
      setAvailableDates(dates);
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  };

  const [reservationFlow, setReservationFlow] = useState<{
    isOpen: boolean;
    session: ClassSession | null;
  }>({
    isOpen: false,
    session: null
  });

  const handleBookSession = async (sessionId: string) => {
    if (!user || !profile) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver un cours",
        variant: "destructive",
      });
      return;
    }

    // Get session details and open payment flow
    const sessionToBook = sessions.find(s => s.id === sessionId);
    if (!sessionToBook) {
      toast({
        title: "Erreur",
        description: "Session non trouvée",
        variant: "destructive",
      });
      return;
    }

    setReservationFlow({
      isOpen: true,
      session: sessionToBook
    });
  };

  const getAvailableSpots = (session: ClassSession) => {
    return session.max_participants - (session.bookings?.length || 0);
  };

  const isSessionAvailable = (session: ClassSession) => {
    return getAvailableSpots(session) > 0 && isAfter(new Date(session.session_date), new Date());
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'débutant': return 'bg-green-100 text-green-800';
      case 'intermédiaire': return 'bg-yellow-100 text-yellow-800';
      case 'avancé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Réservation de Cours</span>
            <Badge variant="outline">
              {sessions.length} cours disponibles
            </Badge>
          </CardTitle>
          <CardDescription>
            Sélectionnez une date et réservez vos cours de natation
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar and Filters */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sélectionner une Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border pointer-events-auto"
                disabled={(date) => date < new Date()}
                modifiers={{
                  available: availableDates.filter(d => isAfter(d, new Date()))
                }}
                modifiersStyles={{
                  available: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    borderRadius: '50%'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Moment de la journée</label>
                <Select value={filters.timeOfDay} onValueChange={(value) => setFilters(prev => ({ ...prev, timeOfDay: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute la journée</SelectItem>
                    <SelectItem value="morning">Matin (6h-12h)</SelectItem>
                    <SelectItem value="afternoon">Après-midi (12h-17h)</SelectItem>
                    <SelectItem value="evening">Soir (17h-21h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Cours disponibles - {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Aucun cours disponible pour cette date
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <Card key={session.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {session.classes.name}
                              </h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{formatTime(session.session_date)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{getAvailableSpots(session)} places disponibles</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-primary">
                                  {formatPrice(session.classes.price)}
                                </span>
                              </div>
                            </div>

                            {session.classes.description && (
                              <p className="text-sm text-muted-foreground">
                                {session.classes.description}
                              </p>
                            )}

                            <div className="text-xs text-muted-foreground">
                              Durée: {session.classes.duration_minutes} minutes
                            </div>
                          </div>

                          <div className="ml-4">
                            <Button
                              onClick={() => handleBookSession(session.id)}
                              disabled={!isSessionAvailable(session) || loading}
                              className="min-w-[100px]"
                            >
                              {getAvailableSpots(session) === 0 ? 'Complet' : 'Réserver'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reservation Flow Modal */}
      <ReservationFlow
        isOpen={reservationFlow.isOpen}
        onClose={() => setReservationFlow({ isOpen: false, session: null })}
        session={reservationFlow.session}
        onSuccess={() => {
          fetchSessions();
          onBookingSuccess?.();
        }}
      />
    </div>
  );
}