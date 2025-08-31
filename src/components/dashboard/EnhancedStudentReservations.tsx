import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  User, 
  X, 
  Edit3, 
  CheckCircle, 
  AlertCircle,
  Users,
  Star,
  MapPin
} from "lucide-react";
import { format, differenceInHours, isAfter, addHours } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Booking {
  id: string;
  status: string;
  booking_date: string;
  cancelled_at: string | null;
  invoice_number: string;
  total_amount: number;
  currency: string;
  notes: string | null;
  class_sessions: {
    id: string;
    session_date: string;
    max_participants: number;
    enrolled_students: number;
    notes: string | null;
    classes: {
      name: string;
      level: string;
      description: string;
      duration_minutes: number;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    } | null;
  };
}

interface Reservation {
  id: string;
  reservation_date: string;
  duration_minutes: number;
  purpose: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function EnhancedStudentReservations() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    type: 'booking' | 'reservation';
  }>({
    isOpen: false,
    booking: null,
    type: 'booking'
  });

  const [editForm, setEditForm] = useState({
    notes: '',
    purpose: ''
  });

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    // Real-time updates for reservations
    const channel = supabase
      .channel('student-reservations')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `user_id=eq.${profile?.id}`
      }, () => {
        loadData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations',
        filter: `student_id=eq.${profile?.id}`
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          class_sessions!inner (
            id,
            session_date,
            max_participants,
            enrolled_students,
            notes,
            classes!inner (
              name,
              level,
              description,
              duration_minutes
            ),
            instructors (
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Load personal reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      setBookings(bookingsData || []);
      setReservations(reservationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canModifyBooking = (booking: Booking) => {
    const hoursUntilSession = differenceInHours(
      new Date(booking.class_sessions.session_date), 
      new Date()
    );
    return hoursUntilSession >= 24 && booking.status === 'confirmed';
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by student'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée. Une place est maintenant disponible.",
      });

      await loadData();
      
      // Trigger calendar sync
      window.dispatchEvent(new CustomEvent('calendarSync', { 
        detail: { type: 'booking_cancelled', bookingId } 
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

  const handleEditBooking = async () => {
    if (!editModal.booking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          notes: editForm.notes
        })
        .eq('id', editModal.booking.id);

      if (error) throw error;

      toast({
        title: "Réservation mise à jour",
        description: "Vos notes ont été sauvegardées",
      });

      await loadData();
      setEditModal({ isOpen: false, booking: null, type: 'booking' });
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réservation",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (booking: Booking) => {
    setEditForm({
      notes: booking.notes || '',
      purpose: ''
    });
    setEditModal({ isOpen: true, booking, type: 'booking' });
  };

  const getBookingStatus = (booking: Booking) => {
    if (booking.cancelled_at) return { text: "Annulé", variant: "destructive" as const };
    if (booking.status === "confirmed") {
      const sessionDate = new Date(booking.class_sessions.session_date);
      if (isAfter(new Date(), sessionDate)) {
        return { text: "Terminé", variant: "secondary" as const };
      }
      return { text: "Confirmé", variant: "default" as const };
    }
    return { text: booking.status, variant: "secondary" as const };
  };

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.class_sessions.session_date) > new Date() && 
    booking.status === 'confirmed'
  );

  const pastBookings = bookings.filter(booking => 
    new Date(booking.class_sessions.session_date) <= new Date() || 
    booking.status === 'cancelled'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Reservations */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mes Réservations à Venir ({upcomingBookings.length})
          </CardTitle>
          <CardDescription>
            Gérez vos cours réservés. Vous pouvez annuler jusqu'à 24h avant le cours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">Aucune réservation à venir</p>
              <p className="text-sm">Réservez votre prochain cours depuis le calendrier</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const status = getBookingStatus(booking);
                const canModify = canModifyBooking(booking);
                
                return (
                  <Card key={booking.id} className="border-l-4 border-l-primary hover:shadow-elegant transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{booking.class_sessions.classes.name}</h3>
                            <Badge variant="outline">{booking.class_sessions.classes.level}</Badge>
                            <Badge variant={status.variant}>{status.text}</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.class_sessions.session_date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.class_sessions.session_date), 'HH:mm')} ({booking.class_sessions.classes.duration_minutes}min)</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.class_sessions.instructors?.profiles?.full_name || "Instructeur à confirmer"}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.class_sessions.enrolled_students}/{booking.class_sessions.max_participants} places</span>
                            </div>
                          </div>

                          {booking.class_sessions.classes.description && (
                            <p className="text-sm text-muted-foreground bg-secondary/10 p-2 rounded">
                              {booking.class_sessions.classes.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              Facture: <span className="font-mono font-medium">{booking.invoice_number}</span>
                            </div>
                            <div className="font-semibold text-primary">
                              ${booking.total_amount} {booking.currency}
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          {canModify ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(booking)}
                                className="flex items-center gap-2 hover-scale"
                              >
                                <Edit3 className="h-4 w-4" />
                                Modifier
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
                                    handleCancelBooking(booking.id);
                                  }
                                }}
                                className="flex items-center gap-2 hover-scale"
                              >
                                <X className="h-4 w-4" />
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground text-center">
                              <AlertCircle className="h-4 w-4 mx-auto mb-1" />
                              Modification non autorisée
                              <br />
                              (moins de 24h)
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Reservations */}
      {pastBookings.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              Historique des Réservations ({pastBookings.length})
            </CardTitle>
            <CardDescription>Vos cours passés et annulés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastBookings.slice(0, 5).map((booking) => {
                const status = getBookingStatus(booking);
                
                return (
                  <div key={booking.id} className="border rounded-lg p-3 opacity-75 hover:opacity-90 transition-opacity">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{booking.class_sessions.classes.name}</span>
                          <Badge variant={status.variant} className="text-xs">{status.text}</Badge>
                          <Badge variant="outline" className="text-xs">{booking.class_sessions.classes.level}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy HH:mm')} • 
                          {booking.class_sessions.instructors?.profiles?.full_name || "Instructeur non assigné"}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        ${booking.total_amount} {booking.currency}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pastBookings.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... et {pastBookings.length - 5} autres réservations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={editModal.isOpen} onOpenChange={(open) => setEditModal({ ...editModal, isOpen: open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la Réservation</DialogTitle>
          </DialogHeader>
          
          {editModal.booking && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <h4 className="font-medium">{editModal.booking.class_sessions.classes.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(editModal.booking.class_sessions.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes personnelles</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Ajoutez vos notes ou demandes spéciales..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditModal({ isOpen: false, booking: null, type: 'booking' })}
                >
                  Annuler
                </Button>
                <Button onClick={handleEditBooking} className="bg-gradient-accent">
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}