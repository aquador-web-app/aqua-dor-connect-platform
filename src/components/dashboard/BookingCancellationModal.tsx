import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calendar, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    class_sessions: {
      session_date: string;
      classes: {
        name: string;
        level: string;
      };
      instructors: {
        profiles: {
          full_name: string;
        };
      };
    };
  } | null;
  onSuccess: () => void;
}

export function BookingCancellationModal({ 
  isOpen, 
  onClose, 
  booking, 
  onSuccess 
}: BookingCancellationModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellationWindow, setCancellationWindow] = useState(24); // Default 24 hours
  const { toast } = useToast();

  // Check if cancellation is allowed
  const canCancel = booking ? 
    differenceInHours(new Date(booking.class_sessions.session_date), new Date()) >= cancellationWindow 
    : false;

  const handleCancel = async () => {
    if (!booking || !canCancel) return;

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Annulé par l\'utilisateur'
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée avec succès",
      });

      onSuccess();
      onClose();
      setReason("");
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler la réservation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!booking) return null;

  const sessionDate = new Date(booking.class_sessions.session_date);
  const hoursUntilSession = differenceInHours(sessionDate, new Date());

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Annuler la Réservation
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir annuler cette réservation ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">{booking.class_sessions.classes.name}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(sessionDate, 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{booking.class_sessions.instructors.profiles.full_name}</span>
            </div>
          </div>

          {/* Cancellation Policy Warning */}
          {!canCancel ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-destructive mb-1">
                    Annulation non autorisée
                  </h5>
                  <p className="text-sm text-destructive/80">
                    Les réservations ne peuvent être annulées que {cancellationWindow} heures avant le début du cours.
                    Il ne reste que {Math.max(0, hoursUntilSession)} heures avant votre séance.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reason">Raison de l'annulation (optionnel)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez pourquoi vous annulez cette réservation..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Fermer
          </Button>
          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}