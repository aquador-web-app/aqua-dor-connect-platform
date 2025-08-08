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
import { Switch } from "@/components/ui/switch";
import { Clock, Users, Calendar as CalendarIcon, CheckCircle, XCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClassSession {
  id: string;
  session_date: string;
  max_participants: number;
  status: string;
  classes: {
    id: string;
    name: string;
    level: string;
    duration_minutes: number;
    price: number;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
  booking_count?: number;
}

interface Reservation {
  id: string;
  reservation_date: string;
  duration_minutes: number;
  purpose: string;
  notes: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_session_id: string;
  status: string;
  profiles: {
    full_name: string;
  };
}

interface ChildProfile {
  id: string;
  full_name: string;
}

export function IntelligentCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<{[key: string]: boolean}>({});
  const [reservationForm, setReservationForm] = useState({
    time: "09:00",
    duration: 60,
    purpose: "",
    notes: ""
  });

  const { user, profile, isStudent, isParent, isAdmin, isInstructor } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate && user) {
      fetchCalendarData();
    }
  }, [selectedDate, user]);

  useEffect(() => {
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, () => {
        if (selectedDate && user) {
          fetchCalendarData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, user]);

  const fetchCalendarData = async () => {
    if (!selectedDate || !user) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch class sessions for the selected date
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          max_participants,
          status,
          classes!inner (
            id,
            name,
            level,
            duration_minutes,
            price
          ),
          instructors!inner (
            profiles!inner (
              full_name
            )
          )
        `)
        .gte('session_date', `${dateStr}T00:00:00`)
        .lt('session_date', `${dateStr}T23:59:59`)
        .eq('status', 'scheduled')
        .order('session_date');

      if (sessionsError) throw sessionsError;

      // Get booking counts for each session
      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map(s => s.id);
        const { data: bookingCounts } = await supabase
          .from('bookings')
          .select('class_session_id')
          .in('class_session_id', sessionIds)
          .eq('status', 'confirmed');

        const bookingCountMap: {[key: string]: number} = {};
        bookingCounts?.forEach(booking => {
          bookingCountMap[booking.class_session_id] = (bookingCountMap[booking.class_session_id] || 0) + 1;
        });

        const sessionsWithCounts = sessionsData.map(session => ({
          ...session,
          booking_count: bookingCountMap[session.id] || 0
        }));

        setSessions(sessionsWithCounts);
      } else {
        setSessions([]);
      }

      // For students: fetch their reservations and enrolled sessions
      if (isStudent() || isParent()) {
        // Fetch personal reservations
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select('*')
          .gte('reservation_date', `${dateStr}T00:00:00`)
          .lt('reservation_date', `${dateStr}T23:59:59`)
          .eq('student_id', profile?.id as string);

        if (reservationsError) throw reservationsError;
        setReservations(reservationsData || []);

        // Fetch attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            id,
            student_id,
            class_session_id,
            status,
            profiles!inner (
              full_name
            )
          `)
          .in('class_session_id', sessionsData?.map(s => s.id) || []);

        if (attendanceError) throw attendanceError;
        setAttendance(attendanceData || []);

        // If parent, fetch children
        if (isParent()) {
          const { data: childrenData, error: childrenError } = await supabase
            .from('parent_child_relationships')
            .select(`
              child:profiles!parent_child_relationships_child_id_fkey (
                id,
                full_name
              )
            `)
            .eq('parent_id', profile?.id as string);

          if (childrenError) throw childrenError;
          setChildren(childrenData?.map(rel => rel.child).filter(Boolean) || []);
        }
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du calendrier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceResponse = async (sessionId: string, willAttend: boolean) => {
    if (!user) return;

    try {
      // Check if user is enrolled in this session
      const { data: enrollment } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', profile?.id as string)
        .eq('class_session_id', sessionId)
        .single();

      if (!enrollment) {
        toast({
          title: "Erreur",
          description: "Vous n'êtes pas inscrit à cette session",
          variant: "destructive",
        });
        return;
      }

      // Upsert attendance record
      const { error } = await supabase
        .from('attendance')
        .upsert({
          student_id: profile?.id as string,
          class_session_id: sessionId,
          status: willAttend ? 'present' : 'absent',
          marked_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Réponse enregistrée",
        description: `Votre réponse "${willAttend ? 'Présent' : 'Absent'}" a été enregistrée`,
      });

      fetchCalendarData();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre réponse",
        variant: "destructive",
      });
    }
  };

  const createReservation = async () => {
    if (!user || !selectedDate) return;

    try {
      const reservationDateTime = new Date(selectedDate);
      const [hours, minutes] = reservationForm.time.split(':');
      reservationDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check for conflicts with existing class sessions
      const { data: conflicts } = await supabase
        .from('class_sessions')
        .select('id, session_date, classes(duration_minutes)')
        .gte('session_date', reservationDateTime.toISOString())
        .lt('session_date', new Date(reservationDateTime.getTime() + reservationForm.duration * 60000).toISOString());

      if (conflicts && conflicts.length > 0) {
        toast({
          title: "Conflit d'horaire",
          description: "Cette heure entre en conflit avec une session de cours existante",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('reservations')
        .insert({
          student_id: profile?.id as string,
          reservation_date: reservationDateTime.toISOString(),
          duration_minutes: reservationForm.duration,
          purpose: reservationForm.purpose,
          notes: reservationForm.notes,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Réservation créée",
        description: "Votre réservation a été créée avec succès",
      });

      setReservationDialogOpen(false);
      setReservationForm({ time: "09:00", duration: 60, purpose: "", notes: "" });
      fetchCalendarData();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la réservation",
        variant: "destructive",
      });
    }
  };

  const hasSessionOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.some(session => 
      format(new Date(session.session_date), 'yyyy-MM-dd') === dateStr
    ) || reservations.some(reservation =>
      format(new Date(reservation.reservation_date), 'yyyy-MM-dd') === dateStr
    );
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
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasSession: hasSessionOnDate
              }}
              modifiersStyles={{
                hasSession: { backgroundColor: 'hsl(var(--primary) / 0.2)' }
              }}
            />
          </CardContent>
        </Card>

        {/* Sessions and Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'EEEE dd MMMM yyyy') : 'Sélectionnez une date'}
            </CardTitle>
            <CardDescription>
              Sessions de cours et réservations du jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Class Sessions */}
                {sessions.map((session) => (
                  <Card key={session.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{session.classes.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(session.session_date), 'HH:mm')}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{session.booking_count || 0}/{session.max_participants}</span>
                            </span>
                            <Badge variant="secondary">{session.classes.level}</Badge>
                          </div>
                          <p className="text-sm">
                            Instructeur: {session.instructors?.profiles?.full_name}
                          </p>
                        </div>
                        
                        {(isStudent() || isParent()) && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAttendanceResponse(session.id, true)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Présent
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAttendanceResponse(session.id, false)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Personal Reservations */}
                {reservations.map((reservation) => (
                  <Card key={reservation.id} className="border-l-4 border-l-accent">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">Réservation Personnelle</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(reservation.reservation_date), 'HH:mm')}</span>
                            </span>
                            <span>{reservation.duration_minutes} min</span>
                            <Badge variant="outline">{reservation.purpose}</Badge>
                          </div>
                          {reservation.notes && (
                            <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty slot - allow students to make reservations */}
                {(isStudent() || isParent()) && sessions.length === 0 && reservations.length === 0 && selectedDate && (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        Aucun cours programmé ce jour. Souhaitez-vous réserver la piscine ?
                      </p>
                      <Button onClick={() => setReservationDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Faire une réservation
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reservation Dialog */}
      <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Réservation</DialogTitle>
            <DialogDescription>
              Réservez la piscine pour une session personnelle
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  type="time"
                  value={reservationForm.time}
                  onChange={(e) => setReservationForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Select 
                  value={reservationForm.duration.toString()} 
                  onValueChange={(value) => setReservationForm(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="purpose">Objet</Label>
              <Input
                id="purpose"
                value={reservationForm.purpose}
                onChange={(e) => setReservationForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Ex: Entraînement personnel, thérapie..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes supplémentaires..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setReservationDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createReservation}>
              Réserver
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}