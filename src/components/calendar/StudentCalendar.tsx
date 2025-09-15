import React, { useState } from 'react';
import { SamsungCalendar } from './SamsungCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  CreditCard, 
  Bell, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { CalendarEvent } from '@/hooks/useUniversalCalendar';
import { useUniversalCalendar } from '@/hooks/useUniversalCalendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StudentCalendarProps {
  className?: string;
}

export function StudentCalendar({ className }: StudentCalendarProps) {
  const [activeTab, setActiveTab] = useState('calendar');

  const { 
    events,
    loading
  } = useUniversalCalendar({
    userRole: 'student',
    showOnlyUserEvents: false,
    enableRealtime: true
  });

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Student clicked event:', event);
  };

  // Filter events for different tabs
  const myReservations = events.filter(event => 
    event.event_type === 'reservation' && event.user_id
  );

  const upcomingClasses = myReservations.filter(reservation =>
    new Date(reservation.start_date) >= new Date() && reservation.status !== 'cancelled'
  );

  const pendingPayments = myReservations.filter(reservation =>
    reservation.status === 'pending'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mon Calendrier</h1>
          
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Mes Cours
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 relative">
              <CreditCard className="h-4 w-4" />
              Paiements
              {pendingPayments.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {pendingPayments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendrier des Cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SamsungCalendar
                userRole="student"
                showOnlyUserEvents={false}
                onEventClick={handleEventClick}
                className="animate-fade-in"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Upcoming Classes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cours à Venir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun cours à venir
                  </p>
                ) : (
                  upcomingClasses.slice(0, 3).map((reservation) => (
                    <div
                      key={reservation.id}
                      className="p-3 bg-muted/30 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{reservation.class_name}</h4>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(reservation.start_date), 'dd MMM yyyy', { locale: fr })}
                        {reservation.start_time && ` à ${reservation.start_time}`}
                      </div>
                      {reservation.instructor_name && (
                        <div className="text-xs text-muted-foreground">
                          Instructeur: {reservation.instructor_name}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Pending Confirmations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  En Attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune confirmation en attente
                  </p>
                ) : (
                  pendingPayments.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{reservation.class_name}</h4>
                        <Badge variant="secondary">En attente</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(reservation.start_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-amber-700">
                        En attente de confirmation de paiement
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{upcomingClasses.length}</div>
                  <div className="text-xs text-muted-foreground">Cours confirmés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{pendingPayments.length}</div>
                  <div className="text-xs text-muted-foreground">En attente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {myReservations.filter(r => r.status === 'cancelled').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Annulés</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Paiements en Attente
                  {pendingPayments.length > 0 && (
                    <Badge variant="secondary">{pendingPayments.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">Tous vos paiements sont à jour</p>
                  </div>
                ) : (
                  pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{payment.class_name}</h4>
                        <Badge variant="secondary">En attente</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(payment.start_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-semibold">${payment.price}</span>
                        <Button size="sm" variant="outline">
                          Voir Détails
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Historique des Paiements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    L'historique des paiements sera disponible bientôt
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}