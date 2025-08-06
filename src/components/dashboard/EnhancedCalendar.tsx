import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, Users, Plus, Waves, BookOpen, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ClassSession {
  id: string;
  class_id: string;
  instructor_id: string;
  session_date: string;
  max_participants: number;
  status: string;
  classes: {
    name: string;
    level: string;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
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

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_session_id: string;
  status: string;
  marked_by?: string;
  marked_at?: string;
}

interface ChildProfile {
  id: string;
  full_name: string;
}

export function EnhancedCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();

  // Form states
  const [reservationForm, setReservationForm] = useState({
    duration_minutes: 60,
    purpose: "",
    notes: "",
    time: ""
  });

  const [attendanceForm, setAttendanceForm] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate, user]);

  const fetchCalendarData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch class sessions for selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          classes!inner(name, level),
          instructors!inner(profiles!inner(full_name))
        `)
        .gte('session_date', startOfDay.toISOString())
        .lte('session_date', endOfDay.toISOString())
        .eq('status', 'scheduled');

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch user's reservations for selected date
      if (profile) {
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select('*')
          .eq('student_id', profile.id)
          .gte('reservation_date', startOfDay.toISOString())
          .lte('reservation_date', endOfDay.toISOString());

        if (reservationsError) throw reservationsError;
        setReservations(reservationsData || []);
      }

      // Fetch attendance records for the user's enrolled sessions
      if (profile) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', profile.id)
          .in('class_session_id', (sessionsData || []).map(s => s.id));

        if (attendanceError) throw attendanceError;
        setAttendance(attendanceData || []);
      }

      // If user is a parent, fetch children
      if (userRole === 'parent') {
        const { data: childrenData, error: childrenError } = await supabase
          .from('parent_child_relationships')
          .select(`
            child_id,
            profiles!parent_child_relationships_child_id_fkey(id, full_name)
          `)
          .eq('parent_id', profile?.id);

        if (childrenError) throw childrenError;
        setChildren(childrenData?.map(r => r.profiles).filter(Boolean) || []);
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

  const createReservation = async () => {
    if (!profile || !reservationForm.time) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      const reservationDateTime = new Date(selectedDate);
      const [hours, minutes] = reservationForm.time.split(':');
      reservationDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Check for conflicts with existing sessions and reservations
      const sessionConflicts = sessions.some(session => {
        const sessionDate = parseISO(session.session_date);
        const sessionEndTime = new Date(sessionDate.getTime() + 60 * 60000); // Assume 60 min duration
        const reservationEndTime = new Date(reservationDateTime.getTime() + reservationForm.duration_minutes * 60000);
        
        return (reservationDateTime < sessionEndTime && reservationEndTime > sessionDate);
      });

      const reservationConflicts = reservations.some(reservation => {
        const reservationDate = parseISO(reservation.reservation_date);
        const reservationEndTime = new Date(reservationDate.getTime() + reservation.duration_minutes * 60000);
        const newReservationEndTime = new Date(reservationDateTime.getTime() + reservationForm.duration_minutes * 60000);
        
        return (reservationDateTime < reservationEndTime && newReservationEndTime > reservationDate);
      });

      if (sessionConflicts || reservationConflicts) {

      
        toast({
          title: "Conflit détecté",
          description: "Ce créneau entre en conflit avec une session ou réservation existante",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('reservations')
        .insert({
          student_id: profile.id,
          reservation_date: reservationDateTime.toISOString(),
          duration_minutes: reservationForm.duration_minutes,
          purpose: reservationForm.purpose,
          notes: reservationForm.notes,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
      });

      setIsReservationDialogOpen(false);
      setReservationForm({
        duration_minutes: 60,
        purpose: "",
        notes: "",
        time: ""
      });
      
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

  const markAttendance = async () => {
    if (!selectedSession || !profile) return;

    try {
      const attendanceRecords = [];
      
      // Mark attendance for current user if they're a student
      if (userRole === 'student') {
        attendanceRecords.push({
          student_id: profile.id,
          class_session_id: selectedSession.id,
          status: attendanceForm[profile.id] ? 'present' : 'absent',
          marked_by: user?.id,
          marked_at: new Date().toISOString()
        });
      }

      // Mark attendance for children if user is a parent
      if (userRole === 'parent') {
        for (const child of children) {
          if (child.id in attendanceForm) {
            attendanceRecords.push({
              student_id: child.id,
              class_session_id: selectedSession.id,
              status: attendanceForm[child.id] ? 'present' : 'absent',
              marked_by: user?.id,
              marked_at: new Date().toISOString()
            });
          }
        }
      }

      // Upsert attendance records
      for (const record of attendanceRecords) {
        const { error } = await supabase
          .from('attendance')
          .upsert(record, {
            onConflict: 'student_id,class_session_id'
          });

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Présence enregistrée avec succès",
      });

      setIsAttendanceDialogOpen(false);
      setAttendanceForm({});
      fetchCalendarData();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la présence",
        variant: "destructive",
      });
    }
  };

  const openAttendanceDialog = (session: ClassSession) => {
    setSelectedSession(session);
    
    // Initialize attendance form with existing data
    const existingAttendance: Record<string, boolean> = {};
    
    if (userRole === 'student' && profile) {
      const existing = attendance.find(a => a.class_session_id === session.id && a.student_id === profile.id);
      existingAttendance[profile.id] = existing?.status === 'present';
    }
    
    if (userRole === 'parent') {
      for (const child of children) {
        const existing = attendance.find(a => a.class_session_id === session.id && a.student_id === child.id);
        existingAttendance[child.id] = existing?.status === 'present';
      }
    }
    
    setAttendanceForm(existingAttendance);
    setIsAttendanceDialogOpen(true);
  };

  const getEventColor = (type: 'session' | 'reservation') => {
    return type === 'session' 
      ? 'bg-primary/10 border-primary text-primary'
      : 'bg-secondary/10 border-secondary text-secondary';
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
              <span>Calendrier</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            {userRole === 'student' && (
              <Button 
                className="w-full mt-4" 
                onClick={() => setIsReservationDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Réservation
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Événements du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Class Sessions */}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border-2 ${getEventColor('session')} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => openAttendanceDialog(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5" />
                    <div>
                      <h4 className="font-semibold">{session.classes.name}</h4>
                      <p className="text-sm opacity-75">
                        {format(parseISO(session.session_date), 'HH:mm')} - 
                        Instructeur: {session.instructors.profiles.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{session.classes.level}</Badge>
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}

            {/* Personal Reservations */}
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className={`p-4 rounded-lg border-2 ${getEventColor('reservation')}`}
              >
                <div className="flex items-center space-x-3">
                  <Waves className="h-5 w-5" />
                  <div>
                    <h4 className="font-semibold">{reservation.purpose || 'Réservation Personnelle'}</h4>
                    <p className="text-sm opacity-75">
                      {format(parseISO(reservation.reservation_date), 'HH:mm')} - 
                      Durée: {reservation.duration_minutes} min
                    </p>
                    {reservation.notes && (
                      <p className="text-xs opacity-60 mt-1">{reservation.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sessions.length === 0 && reservations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun événement pour cette date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Reservation Dialog */}
      <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle Réservation</DialogTitle>
            <DialogDescription>
              Réservez un créneau pour une activité personnelle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="time">Heure de début</Label>
              <Input
                id="time"
                type="time"
                value={reservationForm.time}
                onChange={(e) => setReservationForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="duration">Durée (minutes)</Label>
              <Select 
                value={reservationForm.duration_minutes.toString()}
                onValueChange={(value) => setReservationForm(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
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

            <div>
              <Label htmlFor="purpose">Objectif</Label>
              <Input
                id="purpose"
                placeholder="Ex: Entraînement personnel, thérapie..."
                value={reservationForm.purpose}
                onChange={(e) => setReservationForm(prev => ({ ...prev, purpose: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Notes supplémentaires..."
                value={reservationForm.notes}
                onChange={(e) => setReservationForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button onClick={createReservation} className="w-full">
              Créer la Réservation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer la Présence</DialogTitle>
            <DialogDescription>
              {selectedSession?.classes.name} - {selectedSession && format(parseISO(selectedSession.session_date), 'dd/MM/yyyy HH:mm')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {userRole === 'student' && profile && (
              <div className="flex items-center justify-between">
                <Label htmlFor={`attendance-${profile.id}`}>Ma présence</Label>
                <Switch
                  id={`attendance-${profile.id}`}
                  checked={attendanceForm[profile.id] || false}
                  onCheckedChange={(checked) => 
                    setAttendanceForm(prev => ({ ...prev, [profile.id]: checked }))
                  }
                />
              </div>
            )}

            {userRole === 'parent' && children.map((child) => (
              <div key={child.id} className="flex items-center justify-between">
                <Label htmlFor={`attendance-${child.id}`}>{child.full_name}</Label>
                <Switch
                  id={`attendance-${child.id}`}
                  checked={attendanceForm[child.id] || false}
                  onCheckedChange={(checked) => 
                    setAttendanceForm(prev => ({ ...prev, [child.id]: checked }))
                  }
                />
              </div>
            ))}

            <Button onClick={markAttendance} className="w-full">
              Enregistrer la Présence
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}