import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, MapPin, User, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

interface ExpandableDayEventsProps {
  date: Date;
  events: CalendarEvent[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEventSelect?: (event: CalendarEvent) => void;
  maxPreviewEvents?: number;
}

export function ExpandableDayEvents({
  date,
  events,
  isExpanded,
  onToggleExpand,
  onEventSelect,
  maxPreviewEvents = 2
}: ExpandableDayEventsProps) {
  const [loading, setLoading] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const { user, profile, isStudent, isParent } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const displayEvents = isExpanded ? events : events.slice(0, maxPreviewEvents);
  const hasMoreEvents = events.length > maxPreviewEvents;

  const handleReserveClick = async (event: CalendarEvent) => {
    if (!user) {
      // Redirect to signup for visitors
      navigate('/auth', { 
        state: { 
          redirectTo: '/calendar',
          reserveSession: event.sessionId 
        }
      });
      return;
    }

    if (!profile?.id) return;

    // Check if already enrolled or session finished
    if (event.isEnrolled) {
      toast({
        title: "Déjà inscrit",
        description: "Vous êtes déjà inscrit à ce cours",
        variant: "destructive"
      });
      return;
    }

    setSelectedEvent(event);
    setReservationDialogOpen(true);
  };

  const handleAttendanceClick = async (event: CalendarEvent, status: 'present' | 'absent') => {
    if (!profile?.id || !event.sessionId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('attendance')
        .upsert({
          student_id: profile.id,
          class_session_id: event.sessionId,
          status: status,
          marked_by: profile.id,
          marked_by_role: isStudent() ? 'student' : 'parent'
        });

      if (error) throw error;

      toast({
        title: "✅ Présence marquée",
        description: `Votre présence a été marquée comme ${status === 'present' ? 'présent' : 'absent'}`,
      });

    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de marquer la présence",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (event: CalendarEvent, paymentMethod: string) => {
    if (!profile?.id || !event.classId) return;

    try {
      setLoading(true);

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: profile.id,
          class_id: event.classId,
          status: 'active',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: profile.id,
          enrollment_id: enrollment.id,
          amount: event.price || 0,
          currency: 'USD',
          status: 'pending',
          method: paymentMethod,
          admin_verified: false
        });

      if (paymentError) throw paymentError;

      toast({
        title: "🎉 Inscription réussie!",
        description: `Vous êtes inscrit au cours ${event.title}. Votre paiement est en attente de validation.`,
      });

      setReservationDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'lifesaving': return 'bg-blue-100 text-blue-800';
      case 'competition': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      case 'lifesaving': return 'Sauvetage';
      case 'competition': return 'Compétition';
      default: return level;
    }
  };

  if (events.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {displayEvents.map((event, index) => (
          <Card key={`${event.id}-${index}`} className="border-l-4 hover:shadow-md transition-shadow cursor-pointer" 
                style={{ borderLeftColor: event.color }}
                onClick={() => onEventSelect?.(event)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</span>
                    {event.level && (
                      <Badge variant="outline" className={`text-xs ${getLevelColor(event.level)}`}>
                        {getLevelText(event.level)}
                      </Badge>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {event.instructor && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{event.instructor}</span>
                        </div>
                      )}
                      
                      {event.maxAttendees && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees || 0}/{event.maxAttendees} participants</span>
                        </div>
                      )}
                      
                      {event.price && (
                        <div className="flex items-center gap-1 text-xs text-primary font-medium">
                          <DollarSign className="h-3 w-3" />
                          <span>${event.price} USD</span>
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        {event.canBook && !event.isEnrolled && (
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReserveClick(event);
                            }}
                            className="text-xs"
                          >
                            Réserver
                          </Button>
                        )}
                        
                        {event.isEnrolled && (
                          <Badge variant="secondary" className="text-xs">
                            Inscrit
                          </Badge>
                        )}

                        {event.canMarkAttendance && event.isUserBooked && (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttendanceClick(event, 'present');
                              }}
                              className="text-xs"
                              disabled={loading}
                            >
                              Présent
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttendanceClick(event, 'absent');
                              }}
                              className="text-xs"
                              disabled={loading}
                            >
                              Absent
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {hasMoreEvents && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleExpand}
            className="w-full justify-center text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Voir tout ({events.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir le mode de paiement</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium">{selectedEvent.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(selectedEvent.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </p>
                <p className="text-lg font-bold text-primary">${selectedEvent.price} USD</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => processPayment(selectedEvent, 'cash')}
                  disabled={loading}
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="text-sm font-medium">Espèces</span>
                  <span className="text-xs opacity-80">Paiement sur place</span>
                </Button>
                
                <Button 
                  onClick={() => processPayment(selectedEvent, 'moncash')}
                  disabled={loading}
                  variant="outline"
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="text-sm font-medium">MonCash</span>
                  <span className="text-xs opacity-80">Mobile</span>
                </Button>
                
                <Button 
                  onClick={() => processPayment(selectedEvent, 'check')}
                  disabled={loading}
                  variant="outline"
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="text-sm font-medium">Chèque</span>
                  <span className="text-xs opacity-80">Sur place</span>
                </Button>
                
                <Button 
                  disabled
                  variant="outline"
                  className="h-auto py-3 flex flex-col opacity-50"
                >
                  <span className="text-sm font-medium">Carte</span>
                  <span className="text-xs opacity-80">Bientôt</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}