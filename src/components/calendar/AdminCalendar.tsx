import React, { useState } from 'react';
import { SamsungCalendar } from './SamsungCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Plus,
  Bell,
  Download,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { CalendarEvent } from '@/hooks/useUniversalCalendar';
import { useUniversalCalendar } from '@/hooks/useUniversalCalendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AdminCalendarProps {
  className?: string;
}

export function AdminCalendar({ className }: AdminCalendarProps) {
  const [activeTab, setActiveTab] = useState('calendar');

  const { 
    events,
    loading,
    refreshEvents
  } = useUniversalCalendar({
    userRole: 'admin',
    showOnlyUserEvents: false,
    enableRealtime: true
  });

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Admin clicked event:', event);
  };

  const handleCreateEvent = () => {
    console.log('Create new event');
    refreshEvents();
  };

  // Filter events for admin dashboard
  const todaysEvents = events.filter(event => 
    format(new Date(event.start_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const upcomingEvents = events.filter(event => 
    new Date(event.start_date) > new Date()
  ).slice(0, 5);

  const pendingReservations = events.filter(event =>
    event.event_type === 'reservation' && event.status === 'pending'
  );

  const totalCapacity = events.reduce((sum, event) => sum + (event.capacity || 0), 0);
  const totalEnrolled = events.reduce((sum, event) => sum + (event.enrolled || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const handleExportData = (type: 'sessions' | 'attendance' | 'reservations') => {
    console.log(`Exporting ${type} data...`);
    // Implementation for CSV/PDF export
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion Calendrier</h1>
            <p className="text-muted-foreground">Administration des cours et événements</p>
          </div>
          
          <TabsList className="grid w-fit grid-cols-4">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2 relative">
              <Users className="h-4 w-4" />
              Réservations
              {pendingReservations.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {pendingReservations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aujourd'hui</p>
                    <p className="text-2xl font-bold">{todaysEvents.length}</p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">En Attente</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingReservations.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taux d'occupation</p>
                    <p className="text-2xl font-bold text-green-600">{occupancyRate}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Inscrits</p>
                    <p className="text-2xl font-bold">{totalEnrolled}</p>
                  </div>
                  <Users className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Component */}
          <Card>
            <CardContent className="p-0">
              <SamsungCalendar
                userRole="admin"
                showOnlyUserEvents={false}
                onEventClick={handleEventClick}
                onCreateEvent={handleCreateEvent}
                className="animate-fade-in"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending Reservations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Réservations en Attente
                  {pendingReservations.length > 0 && (
                    <Badge variant="secondary">{pendingReservations.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Confirmez ou refusez les nouvelles réservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingReservations.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">Aucune réservation en attente</p>
                  </div>
                ) : (
                  pendingReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{reservation.class_name}</h4>
                        <Badge variant="secondary">En attente</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(reservation.start_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="flex-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmer
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <XCircle className="h-3 w-3 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-6">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    L'activité récente apparaîtra ici
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques des Cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total des événements</span>
                    <Badge>{events.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cours confirmés</span>
                    <Badge className="bg-green-100 text-green-800">
                      {events.filter(e => e.status === 'confirmed').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">En attente</span>
                    <Badge variant="secondary">
                      {events.filter(e => e.status === 'pending').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Taux d'occupation</span>
                    <Badge variant="outline">{occupancyRate}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Mensuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Les graphiques de performance seront disponibles bientôt
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Sessions
                </CardTitle>
                <CardDescription>
                  Exporter la liste de toutes les sessions de cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('sessions')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('sessions')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Présences
                </CardTitle>
                <CardDescription>
                  Exporter les données de présence des étudiants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('attendance')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('attendance')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Réservations
                </CardTitle>
                <CardDescription>
                  Exporter toutes les réservations et paiements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('reservations')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExportData('reservations')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}