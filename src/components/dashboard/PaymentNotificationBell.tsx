import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, AlertTriangle, CreditCard, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentNotification {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  enrollment?: {
    class: {
      name: string;
    };
  };
}

export function PaymentNotificationBell() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
      
      // Real-time subscription for payment updates
      const channel = supabase
        .channel('payment-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          enrollment:enrollments(
            class:classes(name)
          )
        `)
        .eq('user_id', profile.id)
        .in('status', ['pending', 'overdue'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      
      // Count overdue payments as high priority
      const overdueCount = data?.filter(p => p.status === 'overdue').length || 0;
      const pendingCount = data?.filter(p => p.status === 'pending').length || 0;
      setUnreadCount(overdueCount + pendingCount);
    } catch (error) {
      console.error('Error fetching payment notifications:', error);
    }
  };

  const getNotificationIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationTitle = (notification: PaymentNotification) => {
    const className = notification.enrollment?.class?.name || 'Paiement';
    switch (notification.status) {
      case 'overdue':
        return `Paiement en retard - ${className}`;
      case 'pending':
        return `Paiement en attente - ${className}`;
      default:
        return className;
    }
  };

  const getNotificationDescription = (notification: PaymentNotification) => {
    const amount = `${notification.amount} ${notification.currency}`;
    const date = format(new Date(notification.created_at), 'dd/MM/yyyy', { locale: fr });
    
    switch (notification.status) {
      case 'overdue':
        return `${amount} - Échéance dépassée (${date})`;
      case 'pending':
        return `${amount} - En attente depuis le ${date}`;
      default:
        return `${amount} - ${date}`;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications de paiement
            </CardTitle>
            {unreadCount > 0 && (
              <CardDescription className="text-xs">
                Vous avez {unreadCount} paiement(s) en attente
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucune notification de paiement
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-t hover:bg-muted/50 transition-colors ${
                      notification.status === 'overdue' ? 'border-l-4 border-l-destructive' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.status)}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getNotificationTitle(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getNotificationDescription(notification)}
                        </p>
                        {notification.status === 'overdue' && (
                          <Badge variant="destructive" className="text-xs">
                            Action requise
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}