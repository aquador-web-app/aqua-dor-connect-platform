import { useState, useEffect } from 'react';
import { Bell, BellRing, Check, X, AlertCircle, Package, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  created_at: string;
  read_at: string | null;
}

interface PendingReservation {
  id: string;
  student_name: string;
  class_name: string;
  session_date: string;
  price: number;
  created_at: string;
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchPendingReservations();
      
      // Set up real-time subscriptions
      const notificationsChannel = supabase
        .channel('admin-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'admin_notifications'
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      const reservationsChannel = supabase
        .channel('pending-reservations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_reservations'
        }, () => {
          fetchPendingReservations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(reservationsChannel);
      };
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchPendingReservations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('session_reservations')
        .select(`
          id,
          created_at,
          class_sessions!inner (
            session_date,
            classes!inner (
              name,
              price
            )
          ),
          profiles!inner (
            full_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: PendingReservation[] = (data || []).map((item: any) => ({
        id: item.id,
        student_name: item.profiles?.full_name || 'Étudiant inconnu',
        class_name: item.class_sessions?.classes?.name || 'Cours inconnu',
        session_date: item.class_sessions?.session_date || new Date().toISOString(),
        price: item.class_sessions?.classes?.price || 0,
        created_at: item.created_at
      }));

      setPendingReservations(mapped);
    } catch (error) {
      console.error('Error fetching pending reservations:', error);
      setPendingReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const confirmReservation = async (reservationId: string) => {
    try {
      const { data, error } = await supabase.rpc('confirm_reservation_payment', {
        p_reservation_id: reservationId,
        p_admin_profile_id: profile?.id,
        p_confirmation_notes: 'Confirmé via dashboard admin'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Confirmation failed');
      }

      toast({
        title: "✅ Réservation Confirmée",
        description: "Le paiement a été validé et l'étudiant a été inscrit",
      });

      fetchPendingReservations();
    } catch (error: any) {
      console.error('Error confirming reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de confirmer la réservation",
        variant: "destructive"
      });
    }
  };

  const rejectReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('session_reservations')
        .update({ 
          status: 'cancelled',
          admin_cancelled_at: new Date().toISOString(),
          admin_cancelled_by: profile?.id 
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: "❌ Réservation Rejetée",
        description: "La réservation a été annulée",
      });

      fetchPendingReservations();
    } catch (error: any) {
      console.error('Error rejecting reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejeter la réservation",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_reservation':
      case 'booking_pending':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'payment_pending':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'package_purchase':
        return <Package className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalPendingActions = unreadCount + pendingReservations.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {totalPendingActions > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {totalPendingActions > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalPendingActions > 9 ? '9+' : totalPendingActions}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Tout lire
                </Button>
              )}
            </div>
            <CardDescription>
              {totalPendingActions} action{totalPendingActions > 1 ? 's' : ''} en attente
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="h-[400px]">
            <CardContent className="space-y-4 pt-0">
              {/* Pending Reservations Section */}
              {pendingReservations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                    <Calendar className="h-4 w-4" />
                    Réservations en attente ({pendingReservations.length})
                  </div>
                  
                  {pendingReservations.map((reservation) => (
                    <Card key={reservation.id} className="bg-orange-50 border-orange-200">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{reservation.student_name}</div>
                            <Badge variant="outline" className="text-xs">
                              ${reservation.price}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reservation.class_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(reservation.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              className="h-7 text-xs" 
                              onClick={() => confirmReservation(reservation.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Confirmer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs"
                              onClick={() => rejectReservation(reservation.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {pendingReservations.length > 0 && notifications.length > 0 && (
                <Separator />
              )}

              {/* Regular Notifications Section */}
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Notifications récentes
                  </div>
                  
                  {notifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`cursor-pointer transition-colors ${
                        notification.read_at 
                          ? 'bg-muted/20' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                      onClick={() => !notification.read_at && markAsRead(notification.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">
                                {notification.title}
                              </div>
                              {!notification.read_at && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {notification.message}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'dd/MM à HH:mm')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Aucune notification</div>
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </PopoverContent>
    </Popover>
  );
}