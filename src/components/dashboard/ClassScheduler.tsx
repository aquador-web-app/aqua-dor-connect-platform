import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Clock, Users, Plus, Edit, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClassSession {
  id: string;
  class_id: string;
  instructor_id: string;
  session_date: string;
  max_participants: number;
  status: string;
  notes: string;
  classes: {
    name: string;
    level: string;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
  bookings_count: number;
}

interface ClassType {
  id: string;
  name: string;
  level: string;
  duration_minutes: number;
  instructor_id: string;
}

interface Instructor {
  id: string;
  profiles: {
    full_name: string;
  };
}

export function ClassScheduler() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    class_id: "",
    session_date: "",
    session_time: "",
    max_participants: 10,
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions with related data
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          classes!inner(name, level),
          instructors!inner(profiles!inner(full_name))
        `)
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Get booking counts for each session
      const sessionIds = sessionsData?.map(s => s.id) || [];
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('class_session_id')
        .in('class_session_id', sessionIds)
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      // Combine session data with booking counts
      const sessionsWithCounts = sessionsData?.map(session => ({
        ...session,
        bookings_count: bookingsData?.filter(b => b.class_session_id === session.id).length || 0
      })) || [];

      setSessions(sessionsWithCounts);

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true);

      if (classesError) throw classesError;
      setClasses(classesData || []);


    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      if (!formData.class_id || !formData.session_date || !formData.session_time) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      const sessionDateTime = new Date(`${formData.session_date}T${formData.session_time}`);

      const { error } = await supabase
        .from('class_sessions')
        .insert({
          class_id: formData.class_id,
          instructor_id: null,
          session_date: sessionDateTime.toISOString(),
          max_participants: formData.max_participants,
          notes: formData.notes,
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Session créée avec succès",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        class_id: "",
        session_date: "",
        session_time: "",
        max_participants: 10,
        notes: ""
      });

      fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Session supprimée",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la session",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const todaySessions = sessions.filter(session => {
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    return sessionDate.toDateString() === today.toDateString();
  });

  const upcomingSessions = sessions.filter(session => {
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    return sessionDate > today;
  }).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Planificateur de Classes</h2>
          <p className="text-muted-foreground">Créer et gérer les sessions de cours</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une Nouvelle Session</DialogTitle>
              <DialogDescription>
                Planifier une nouvelle session de cours
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="class">Cours</Label>
                <Select value={formData.class_id} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, class_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un cours" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} - {classItem.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Heure</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.session_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="participants">Participants Maximum</Label>
                <Input
                  id="participants"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.max_participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Input
                  id="notes"
                  placeholder="Notes sur la session..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button onClick={createSession} className="w-full">
                Créer la Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions à Venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Occupation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0 
                ? Math.round((sessions.reduce((sum, s) => sum + s.bookings_count, 0) / sessions.reduce((sum, s) => sum + s.max_participants, 0)) * 100)
                : 0
              }%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Sessions Programmées</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Cours</TableHead>
                <TableHead>Instructeur</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.slice(0, 10).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(session.session_date), 'dd MMM yyyy', { locale: fr })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(session.session_date), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.classes.name}</div>
                      <div className="text-sm text-muted-foreground">{session.classes.level}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.instructors.profiles.full_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{session.bookings_count}/{session.max_participants}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(session.status)}>
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}