import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleStudentCalendar } from "./SimpleStudentCalendar";
import { StudentBookingManager } from "./StudentBookingManager";
import { StudentPayments } from "./StudentPayments";
import { Calendar, CreditCard, BookOpen, Bell } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { ReservationNotificationBell } from "@/components/admin/ReservationNotificationBell";

export function StudentPortalLayout() {
  const { bookings, payments, loading, refetch } = useStudentData();

  return (
    <div className="space-y-6">
      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portail Étudiant</h1>
          <p className="text-muted-foreground">Gérez vos cours, réservations et paiements</p>
        </div>
        <ReservationNotificationBell />
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mon Calendrier
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Mes Réservations
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mes Paiements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <SimpleStudentCalendar />
        </TabsContent>

        <TabsContent value="bookings">
          <StudentBookingManager 
            bookings={bookings} 
            onBookingUpdated={refetch} 
          />
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Historique des Paiements
              </CardTitle>
              <CardDescription>
                Consultez l'historique de vos paiements et factures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Historique des paiements disponible bientôt</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}