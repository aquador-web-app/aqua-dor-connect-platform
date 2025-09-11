import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingBooking {
  id: string;
  user_id: string;
  total_amount: number;
  notes?: string;
  booking_date: string;
  class_sessions: {
    id: string;
    session_date: string;
    classes: {
      name: string;
      level: string;
    };
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

export const SimpleAdminReservations: React.FC = () => {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          total_amount,
          notes,
          booking_date,
          class_sessions!inner (
            id,
            session_date,
            classes!inner (
              name,
              level
            )
          ),
          profiles!bookings_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq('enrollment_status', 'pending')
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setPendingBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching pending bookings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations en attente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          enrollment_status: 'confirmed',
          status: 'confirmed'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Réservation approuvée",
        description: "L'étudiant a été inscrit à la session"
      });

      fetchPendingBookings();
    } catch (error: any) {
      console.error('Error approving booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la réservation",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          enrollment_status: 'cancelled',
          status: 'cancelled',
          cancellation_reason: 'Rejected by admin'
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Réservation rejetée",
        description: "La réservation a été annulée"
      });

      fetchPendingBookings();
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la réservation",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPendingBookings();

    // Real-time updates
    const channel = supabase
      .channel('admin-reservations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchPendingBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Réservations en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Réservations en attente
          </div>
          {pendingBookings.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingBookings.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingBookings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réservation en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map(booking => (
              <div key={booking.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {booking.profiles?.full_name || 'Utilisateur inconnu'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {booking.profiles?.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="animate-pulse">
                    En attente
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">{booking.class_sessions.classes.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy à HH:mm')}
                    </div>
                    <Badge variant="outline">
                      {booking.class_sessions.classes.level}
                    </Badge>
                    <span className="font-medium">${booking.total_amount}</span>
                  </div>
                  
                  {booking.notes && (
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Demandé le {format(new Date(booking.booking_date), 'dd/MM/yyyy à HH:mm')}
                  </p>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(booking.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(booking.id)}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};