import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface Booking {
  id: string;
  status: string;
  enrollment_status: string;
  notes?: string;
  total_amount: number;
  currency: string;
  created_at: string;
  class_sessions: {
    id: string;
    session_date: string;
    classes: {
      name: string;
      price: number;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    };
  };
  payments: Array<{
    id: string;
    status: string;
    admin_verified: boolean;
    payment_method: string;
  }>;
}

export function StudentReservationManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [newNotes, setNewNotes] = useState("");
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchBookings();
    }
  }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          enrollment_status,
          notes,
          total_amount,
          currency,
          created_at,
          class_sessions(
            id,
            session_date,
            classes(name, price),
            instructors(profiles(full_name))
          ),
          payments(id, status, admin_verified, payment_method)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ notes: newNotes })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Réservation mise à jour",
        description: "Vos notes ont été sauvegardées"
      });

      setEditingNotes(null);
      setNewNotes("");
      fetchBookings();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notes",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      // Check if booking can be cancelled (must be at least 24h before session)
      const sessionDate = new Date(booking.class_sessions.session_date);
      const now = new Date();
      const timeDiff = sessionDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        toast({
          title: "Annulation impossible",
          description: "Vous ne pouvez pas annuler une réservation moins de 24h avant le cours",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Annulé par l\'étudiant',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Also update payment status if exists
      const payment = booking.payments?.[0];
      if (payment) {
        await supabase
          .from('payments')
          .update({ status: 'cancelled' })
          .eq('id', payment.id);
      }

      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée avec succès"
      });

      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la réservation",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === 'cancelled') {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Annulée
      </Badge>;
    }
    
    if (booking.enrollment_status === 'approved') {
      return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Confirmée
      </Badge>;
    }
    
    if (booking.enrollment_status === 'rejected') {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Refusée
      </Badge>;
    }
    
    return <Badge variant="secondary" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      En attente
    </Badge>;
  };

  const canCancelBooking = (booking: Booking) => {
    if (booking.status === 'cancelled' || booking.enrollment_status === 'rejected') {
      return false;
    }
    
    const sessionDate = new Date(booking.class_sessions.session_date);
    const now = new Date();
    const timeDiff = sessionDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  };

  const canEditNotes = (booking: Booking) => {
    return booking.status !== 'cancelled' && booking.enrollment_status !== 'rejected';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Mes Réservations
        </CardTitle>
        <CardDescription>
          Gérez vos réservations de cours - modifier les notes ou annuler vos réservations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Aucune réservation
            </h3>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas encore de réservations. Commencez par réserver un cours !
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cours</TableHead>
                  <TableHead>Date et heure</TableHead>
                  <TableHead>Instructeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">
                        {booking.class_sessions.classes.name}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {booking.class_sessions.instructors?.profiles?.full_name || "Non assigné"}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(booking)}
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-semibold">
                        ${booking.total_amount}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-32 truncate">
                        {booking.notes || <span className="text-muted-foreground text-sm">Aucune note</span>}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        {canEditNotes(booking) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingNotes(booking.id);
                                  setNewNotes(booking.notes || "");
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier les notes</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="notes">Notes personnelles</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Ajoutez des notes pour ce cours..."
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleUpdateNotes(booking.id)}>
                                    Sauvegarder
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingNotes(null)}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {canCancelBooking(booking) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                  Annuler la réservation
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir annuler cette réservation pour{" "}
                                  <strong>{booking.class_sessions.classes.name}</strong> le{" "}
                                  <strong>
                                    {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                  </strong> ?
                                  <br /><br />
                                  Cette action est irréversible. Vous devrez faire une nouvelle réservation si vous changez d'avis.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Garder la réservation</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Oui, annuler
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}