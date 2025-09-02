import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Users } from "lucide-react";

interface ClassSession {
  id: string;
  session_date: string;
  max_participants: number;
  class_id: string;
  classes: {
    name: string;
    level: string;
    price: number;
  };
  bookings_count?: number;
}

export function CalendarBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterSessionsByDate(selectedDate);
    }
  }, [selectedDate, sessions, selectedLevel]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("class_sessions")
        .select(`
          id,
          session_date,
          max_participants,
          class_id,
          classes!inner (
            name,
            level,
            price
          ),
          bookings (count)
        `)
        .gte("session_date", new Date().toISOString())
        .eq("status", "scheduled")
        .order("session_date", { ascending: true });

      if (error) throw error;

      const sessionsWithCounts = data?.map(session => ({
        ...session,
        bookings_count: session.bookings?.length || 0
      })) || [];

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSessionsByDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    let filtered = sessions.filter(session => 
      session.session_date.startsWith(dateStr)
    );

    if (selectedLevel !== "all") {
      filtered = filtered.filter(session => 
        session.classes.level === selectedLevel
      );
    }

    setAvailableSessions(filtered);
  };

  const handleBookSession = async (sessionId: string) => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Vous devez être connecté pour réserver un cours",
          variant: "destructive"
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Erreur",
          description: "Profil utilisateur introuvable",
          variant: "destructive"
        });
        return;
      }

      // Get session details to access class information
      const { data: sessionData, error: sessionError } = await supabase
        .from("class_sessions")
        .select(`
          id,
          class_id,
          classes (
            id,
            name,
            price
          )
        `)
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error("Session not found");
      }

      const { error } = await supabase
        .from("bookings")
        .insert({
          user_id: profile.id,
          class_session_id: sessionId,
          status: "confirmed"
        });

      if (error) throw error;

      toast({
        title: "Réservation confirmée",
        description: "Votre cours a été réservé avec succès. Procédez au paiement."
      });

      fetchSessions(); // Refresh the sessions
    } catch (error) {
      console.error("Error booking session:", error);
      toast({
        title: "Erreur de réservation",
        description: "Impossible de réserver ce cours",
        variant: "destructive"
      });
    }
  };

  const getAvailableSpots = (session: ClassSession) => {
    return session.max_participants - (session.bookings_count || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Réservation de cours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={fr}
                className="w-full p-3 pointer-events-auto rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Filtrer par niveau
                </label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les niveaux" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="beginner">Débutant</SelectItem>
                    <SelectItem value="intermediate">Intermédiaire</SelectItem>
                    <SelectItem value="advanced">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedDate && (
                <div>
                  <h3 className="font-medium mb-3">
                    Créneaux disponibles - {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-4">Chargement...</div>
                    ) : availableSessions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Aucun créneau disponible pour cette date
                      </div>
                    ) : (
                      availableSessions.map((session) => {
                        const availableSpots = getAvailableSpots(session);
                        const sessionTime = new Date(session.session_date);
                        
                        return (
                          <Card key={session.id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{session.classes.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {format(sessionTime, "HH:mm")}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {availableSpots} places
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary">
                                    {session.classes.level}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    ${session.classes.price} USD
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleBookSession(session.id)}
                                disabled={availableSpots === 0}
                              >
                                {availableSpots === 0 ? "Complet" : "Réserver"}
                              </Button>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}