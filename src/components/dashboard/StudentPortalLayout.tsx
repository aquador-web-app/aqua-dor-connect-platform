import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentBookingManager } from "./StudentBookingManager";
import { StudentPayments } from "./StudentPayments";
import { CreditCard, BookOpen, Bell } from "lucide-react";
import { StudentCalendar } from "@/components/calendar/StudentCalendar";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function StudentPortalLayout() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_date,
          cancelled_at,
          invoice_number,
          total_amount,
          currency,
          enrollment_status,
          notes,
          class_sessions!inner (
            id,
            session_date,
            duration_minutes,
            classes (
              name,
              level,
              description,
              price
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

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger vos réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portail Étudiant</h1>
          <p className="text-muted-foreground">Gérez vos cours, réservations et paiements</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Réservations
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <StudentCalendar />
        </TabsContent>

        <TabsContent value="reservations" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <StudentBookingManager 
              bookings={bookings} 
              onBookingUpdated={fetchBookings} 
            />
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <StudentPayments />
        </TabsContent>
      </Tabs>
    </div>
  );
}