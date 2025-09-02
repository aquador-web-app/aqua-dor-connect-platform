import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Clock, Eye, Receipt, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingBooking {
  id: string;
  user_id: string;
  class_session_id: string;
  status: string;
  enrollment_status: string;
  notes: string | null;
  created_at: string;
  bookings?: {
    classes: {
      name: string;
      level: string;
      price: number;
    };
    session_date: string;
  };
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  payments: Array<{
    id: string;
    amount: number;
    payment_method: string;
    status: string;
    admin_verified: boolean;
    created_at: string;
  }>;
}

export function PendingBookingsManager() {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  // Real-time subscription for bookings updates
  useEffect(() => {
    const channel = supabase
      .channel('pending-bookings-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchPendingBookings();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        fetchPendingBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          class_session_id,
          status,
          enrollment_status,
          notes,
          created_at,
          profiles!user_id (
            full_name,
            email,
            phone
          ),
          class_sessions!class_session_id (
            session_date,
            classes!class_id (
              name,
              level,
              price
            )
          ),
          payments!booking_id (
            id,
            amount,
            payment_method,
            status,
            admin_verified,
            created_at
          )
        `)
        .eq('enrollment_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(booking => ({
        ...booking,
        bookings: {
          classes: booking.class_sessions?.classes,
          session_date: booking.class_sessions?.session_date
        }
      })) as PendingBooking[];

      setPendingBookings(transformedData || []);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes en attente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (bookingId: string) => {
    try {
      setLoading(true);

      // Update booking enrollment status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          enrollment_status: 'approved',
          status: 'confirmed'
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          admin_verified: true,
          status: 'paid',
          verified: true,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id
        })
        .eq('booking_id', bookingId);

      if (paymentError) throw paymentError;

      // Mark related notification as read
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('data->>booking_id', bookingId)
        .eq('type', 'booking_pending');

      if (notificationError) console.warn('Could not mark notification as read:', notificationError);

      toast({
        title: "✅ Paiement Approuvé",
        description: "L'inscription a été activée avec succès",
      });

      fetchPendingBookings();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      setLoading(true);

      // Update booking enrollment status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          enrollment_status: 'rejected',
          status: 'cancelled'
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          admin_verified: false,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id
        })
        .eq('booking_id', bookingId);

      if (paymentError) throw paymentError;

      toast({
        title: "❌ Demande Rejetée",
        description: "La demande d'inscription a été rejetée",
      });

      fetchPendingBookings();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la demande",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodName = (method: string) => {
    const methods = {
      'cash': 'Espèces',
      'check': 'Chèque', 
      'moncash': 'MonCash',
      'card': 'Carte Bancaire'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const getStatusBadge = (enrollmentStatus: string) => {
    switch (enrollmentStatus) {
      case 'pending':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-600"><Check className="w-3 h-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500 text-red-600"><X className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline">{enrollmentStatus}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Demandes d'Inscription en Attente
          {pendingBookings.length > 0 && (
            <Badge variant="destructive">{pendingBookings.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && pendingBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : pendingBookings.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune demande en attente</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Cours</TableHead>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Demandé le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.bookings?.classes?.name}</p>
                      <Badge variant="outline" className="text-xs">{booking.bookings?.classes?.level}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.bookings?.session_date && (
                      <div>
                        <p>{format(new Date(booking.bookings.session_date), 'dd/MM/yyyy', { locale: fr })}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.bookings.session_date), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${booking.bookings?.classes?.price}
                  </TableCell>
                  <TableCell>
                    {booking.payments?.[0] && (
                      <Badge variant="secondary">
                        {getPaymentMethodName(booking.payments[0].payment_method)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(booking.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(booking.enrollment_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog open={detailsOpen && selectedBooking?.id === booking.id} onOpenChange={setDetailsOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Détails de la Demande</DialogTitle>
                          </DialogHeader>
                          
                          {selectedBooking && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informations Étudiant</h4>
                                  <p><strong>Nom:</strong> {selectedBooking.profiles?.full_name}</p>
                                  <p><strong>Email:</strong> {selectedBooking.profiles?.email}</p>
                                  <p><strong>Téléphone:</strong> {selectedBooking.profiles?.phone || 'Non renseigné'}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Détails du Cours</h4>
                                  <p><strong>Cours:</strong> {selectedBooking.bookings?.classes?.name}</p>
                                  <p><strong>Niveau:</strong> {selectedBooking.bookings?.classes?.level}</p>
                                  <p><strong>Prix:</strong> ${selectedBooking.bookings?.classes?.price}</p>
                                  {selectedBooking.bookings?.session_date && (
                                    <p><strong>Date:</strong> {format(new Date(selectedBooking.bookings.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</p>
                                  )}
                                </div>
                              </div>
                              
                              {selectedBooking.payments?.[0] && (
                                <div>
                                  <h4 className="font-semibold mb-2">Informations de Paiement</h4>
                                  <p><strong>Méthode:</strong> {getPaymentMethodName(selectedBooking.payments[0].payment_method)}</p>
                                  <p><strong>Montant:</strong> ${selectedBooking.payments[0].amount}</p>
                                  <p><strong>Statut:</strong> {selectedBooking.payments[0].status}</p>
                                </div>
                              )}
                              
                              {selectedBooking.notes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Notes de l'Étudiant</h4>
                                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedBooking.notes}</p>
                                </div>
                              )}
                              
                              <div className="flex gap-3 justify-end">
                                <Button 
                                  variant="outline"
                                  onClick={() => handleRejectBooking(selectedBooking.id)}
                                  disabled={loading}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Rejeter
                                </Button>
                                <Button 
                                  onClick={() => handleApprovePayment(selectedBooking.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Approuver le Paiement
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleApprovePayment(booking.id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRejectBooking(booking.id)}
                        disabled={loading}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}