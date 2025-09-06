import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Bell, AlertTriangle, Info, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: 'payment_due' | 'payment_overdue' | 'class_reminder' | 'enrollment_approved' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  data?: any;
}

export function StudentNotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
      setupRealTimeSubscription();
    }
  }, [profile?.id]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      // Generate notifications based on current data
      const notifications: Notification[] = [];

      // Payment notifications
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          enrollment:enrollments(
            class:classes(name)
          )
        `)
        .eq('user_id', profile.id)
        .in('status', ['pending', 'overdue']);

      payments?.forEach(payment => {
        const daysSinceCreated = Math.floor(
          (new Date().getTime() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceCreated > 7) {
          notifications.push({
            id: `payment-overdue-${payment.id}`,
            type: 'payment_overdue',
            title: 'Paiement en retard',
            message: `Votre paiement de $${payment.amount} pour ${payment.enrollment?.class?.name || 'cours'} est en retard depuis ${daysSinceCreated} jours.`,
            priority: 'urgent',
            read: false,
            created_at: payment.created_at,
            data: { paymentId: payment.id, amount: payment.amount }
          });
        } else if (daysSinceCreated > 3) {
          notifications.push({
            id: `payment-due-${payment.id}`,
            type: 'payment_due',
            title: 'Paiement en attente',
            message: `Votre paiement de $${payment.amount} pour ${payment.enrollment?.class?.name || 'cours'} est en attente depuis ${daysSinceCreated} jours.`,
            priority: 'high',
            read: false,
            created_at: payment.created_at,
            data: { paymentId: payment.id, amount: payment.amount }
          });
        }
      });

      // Class reminders for upcoming sessions
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const { data: upcomingSessions } = await supabase
        .from('class_sessions')
        .select(`
          *,
          classes(name),
          bookings!inner(user_id)
        `)
        .gte('session_date', tomorrow.toISOString())
        .lte('session_date', dayAfter.toISOString())
        .eq('bookings.user_id', profile.id)
        .eq('bookings.status', 'confirmed');

      upcomingSessions?.forEach(session => {
        notifications.push({
          id: `class-reminder-${session.id}`,
          type: 'class_reminder',
          title: 'Cours demain',
          message: `N'oubliez pas votre cours ${session.classes.name} demain à ${format(new Date(session.session_date), 'HH:mm')}.`,
          priority: 'medium',
          read: false,
          created_at: new Date().toISOString(),
          data: { sessionId: session.id, sessionDate: session.session_date }
        });
      });

      setNotifications(notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('student-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'payment_overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'payment_due':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'class_reminder':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'enrollment_approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 10).map((notification) => (
              <Alert
                key={notification.id}
                className={`border-l-4 transition-all ${getPriorityColor(notification.priority)} ${
                  !notification.read ? 'shadow-md' : 'opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type, notification.priority)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'dd/MM HH:mm', { locale: fr })}
                        </span>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                        )}
                      </div>
                    </div>
                    <AlertDescription className="text-sm">
                      {notification.message}
                    </AlertDescription>
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Action requise
                      </Badge>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}