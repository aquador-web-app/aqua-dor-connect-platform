import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, DollarSign, Calendar } from 'lucide-react';
import { CalendarSession } from '@/hooks/useCalendarSessions';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface SimpleReservationFlowProps {
  session: CalendarSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SimpleReservationFlow: React.FC<SimpleReservationFlowProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReserve = async () => {
    if (!user || !profile || !session) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);

      // Create a direct booking (simpler approach for now)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          class_session_id: session.id,
          status: 'pending',
          enrollment_status: 'pending',
          notes: notes || null,
          booking_date: new Date().toISOString(),
          total_amount: session.classes.price
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create a payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: profile.id,
          amount: session.classes.price,
          currency: 'USD',
          status: 'pending',
          payment_method: 'pending'
        });

      if (paymentError) throw paymentError;

      // Create admin notification
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .insert({
          title: 'Nouvelle réservation',
          message: `${profile.full_name || 'Un étudiant'} a réservé ${session.classes.name} le ${format(new Date(session.session_date), 'dd/MM/yyyy à HH:mm')}`,
          type: 'reservation_pending',
          data: {
            booking_id: booking.id,
            session_id: session.id,
            student_id: profile.id,
            class_name: session.classes.name,
            session_date: session.session_date
          }
        });

      if (notificationError) {
        console.warn('Failed to create admin notification:', notificationError);
      }

      toast({
        title: "Réservation envoyée",
        description: "Votre réservation est en attente d'approbation par l'administrateur."
      });

      onClose();
      if (onSuccess) onSuccess();
      setNotes('');
    } catch (error: any) {
      console.error('Reservation error:', error);
      toast({
        title: "Erreur de réservation",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const available = session.max_participants - session.enrolled_students;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Réserver une session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session details */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h3 className="font-medium text-lg">{session.classes.name}</h3>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{session.classes.level}</Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(session.session_date), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(session.session_date), 'HH:mm')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{session.enrolled_students}/{session.max_participants} places</span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>${session.classes.price} USD</span>
              </div>
            </div>
            
            {session.classes.description && (
              <p className="text-sm text-muted-foreground">
                {session.classes.description}
              </p>
            )}
          </div>

          {/* Availability check */}
          {available <= 0 ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive font-medium text-center">
                Cette session est complète
              </p>
            </div>
          ) : (
            <>
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ajouter des notes pour votre réservation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Important:</strong> Votre réservation sera en attente jusqu'à confirmation du paiement par l'administrateur.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleReserve}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'En cours...' : 'Réserver'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};