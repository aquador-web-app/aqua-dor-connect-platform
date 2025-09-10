import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCircle, XCircle, Clock, User, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingReservation {
  id: string;
  created_at: string;
  status: string;
  reservation_notes: string | null;
  student_id: string;
  class_session_id: string;
  session_packages: {
    package_type: string;
    price_per_session: number;
  };
  profiles: {
    full_name: string;
    email: string;
  };
  class_sessions: {
    session_date: string;
    classes: {
      name: string;
      level: string;
    };
  };
}

export function ReservationNotificationBell() {
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<PendingReservation | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { profile, userRole } = useAuth();
  const { toast } = useToast();

  // Only show for admins and co-admins
  const canManageReservations = userRole === 'admin' || userRole === 'co_admin';

  useEffect(() => {
    if (!canManageReservations) return;
    
    fetchPendingReservations();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('pending-reservations-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_reservations'
      }, () => {
        fetchPendingReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canManageReservations]);

  const fetchPendingReservations = async () => {
    if (!canManageReservations) return;
    
    try {
      const { data, error } = await supabase
        .from('session_reservations')
        .select(`
          id,
          created_at,
          status,
          reservation_notes,
          student_id,
          class_session_id,
          session_packages!inner (
            package_type,
            price_per_session
          ),
          profiles!session_reservations_student_id_fkey (
            full_name,
            email
          ),
          class_sessions!inner (
            session_date,
            classes!inner (
              name,
              level
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingReservations(data || []);
    } catch (error) {
      console.error('Error fetching pending reservations:', error);
    }
  };

  const handleApproveReservation = async (reservationId: string) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('confirm_reservation_payment', {
        p_reservation_id: reservationId,
        p_admin_profile_id: profile.id,
        p_confirmation_notes: 'Approved via notification bell'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Approval failed');
      }

      toast({
        title: "✅ Réservation Approuvée",
        description: "La réservation a été confirmée avec succès",
      });

      fetchPendingReservations();
      setSelectedReservation(null);
    } catch (error: any) {
      console.error('Error approving reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'approuver la réservation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReservation = async (reservationId: string) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('session_reservations')
        .update({ 
          status: 'cancelled',
          admin_cancelled_at: new Date().toISOString(),
          admin_cancelled_by: profile.id 
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: "❌ Réservation Rejetée",
        description: "La réservation a été annulée",
      });

      fetchPendingReservations();
      setSelectedReservation(null);
    } catch (error: any) {
      console.error('Error rejecting reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejeter la réservation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canManageReservations || pendingReservations.length === 0) {
    return null;
  }

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {pendingReservations.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {pendingReservations.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Réservations en Attente ({pendingReservations.length})
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="space-y-2 p-4 pt-0">
                  {pendingReservations.map((reservation, index) => (
                    <div key={reservation.id}>
                      <div 
                        className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="font-medium text-sm">
                              {reservation.profiles.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {reservation.class_sessions.classes.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(reservation.class_sessions.session_date), 'dd/MM à HH:mm')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">
                              ${reservation.session_packages.price_per_session}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(reservation.created_at), 'HH:mm')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {index < pendingReservations.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Detailed Reservation Dialog */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Détails de la Réservation
            </DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Étudiant</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReservation.profiles.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedReservation.profiles.email}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">Cours</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReservation.class_sessions.classes.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Niveau: {selectedReservation.class_sessions.classes.level}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">Date & Heure</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedReservation.class_sessions.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">Prix</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${selectedReservation.session_packages.price_per_session} ({selectedReservation.session_packages.package_type})
                  </div>
                </div>

                {selectedReservation.reservation_notes && (
                  <div>
                    <div className="text-sm font-medium">Notes</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedReservation.reservation_notes}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium">Demandé le</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedReservation.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleRejectReservation(selectedReservation.id)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </Button>
                <Button 
                  onClick={() => handleApproveReservation(selectedReservation.id)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Traitement...' : 'Approuver'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}