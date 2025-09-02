import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentMethodSelector } from "../payment/PaymentMethodSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClassSession {
  id: string;
  session_date: string;
  class_id: string;
  classes: {
    id: string;
    name: string;
    level: string;
    price: number;
    description?: string;
  };
  instructors: {
    profiles: {
      full_name: string;
    };
  };
}

interface ReservationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSession | null;
  onSuccess: () => void;
}

export function ReservationFlow({ isOpen, onClose, session, onSuccess }: ReservationFlowProps) {
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handleConfirmReservation = async (paymentMethod: string, notes?: string) => {
    if (!session || !user || !profile) return;

    try {
      setLoading(true);

      // Create the booking first
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          class_session_id: session.id,
          status: 'confirmed',
          notes
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create the payment record
      const paymentData = {
        user_id: profile.id,
        booking_id: booking.id,
        amount: session.classes.price,
        currency: 'HTG',
        status: 'pending', // All start as pending
        payment_method: paymentMethod,
        admin_verified: false // Admin needs to verify physical payments
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) throw paymentError;

      // Show success message with different instructions based on payment method
      let successMessage = "";
      let instructions = "";

      switch (paymentMethod) {
        case 'cash':
          instructions = "Veuillez apporter le montant en espèces lors de votre arrivée au centre.";
          break;
        case 'check':
          instructions = "Veuillez apporter votre chèque lors de votre arrivée au centre.";
          break;
        case 'moncash':
          instructions = "Vous recevrez bientôt les instructions MonCash par email.";
          break;
        default:
          instructions = "Veuillez contacter le centre pour finaliser votre paiement.";
      }

      toast({
        title: "🎉 Réservation Confirmée!",
        description: (
          <div className="space-y-2">
            <div><strong>Cours:</strong> {session.classes.name}</div>
            <div><strong>Date:</strong> {format(new Date(session.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</div>
            <div><strong>Prix:</strong> ${session.classes.price}</div>
            <div><strong>Paiement:</strong> {paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'check' ? 'Chèque' : paymentMethod === 'moncash' ? 'MonCash' : 'Carte'}</div>
            <div className="text-sm text-muted-foreground pt-2">
              {instructions}
            </div>
          </div>
        ),
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Erreur de Réservation",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finaliser la Réservation</DialogTitle>
        </DialogHeader>
        
        <PaymentMethodSelector
          classSession={session}
          onConfirmReservation={handleConfirmReservation}
          onCancel={onClose}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}