import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Banknote, FileText, DollarSign } from 'lucide-react';
import { CalendarSession } from '@/hooks/useUnifiedCalendar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentWorkflowProps {
  session: CalendarSession;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentWorkflow: React.FC<PaymentWorkflowProps> = ({
  session,
  onSuccess,
  onCancel
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create basic enrollment and payment for now (will use atomic function after migration)
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: userProfile.id,
          class_id: session.class_id || session.id,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userProfile.id,
          enrollment_id: enrollment.id,
          amount: session.class?.price || 0,
          payment_method: paymentMethod,
          status: 'pending',
          notes
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      toast({
        title: "Paiement créé",
        description: "Votre paiement est en attente d'approbation par un administrateur.",
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du traitement du paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'moncash':
        return <DollarSign className="h-4 w-4" />;
      case 'check':
        return <FileText className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails de la réservation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">Cours:</span>
            <span>{session.class?.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Date:</span>
            <span>{new Date(session.session_date).toLocaleString('fr-FR')}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Niveau:</span>
            <span>{session.class?.level}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Places disponibles:</span>
            <Badge variant="outline">
              {session.seats_available - session.seats_taken} / {session.seats_available}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>{session.class?.price} HTG</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Espèces
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moncash" id="moncash" />
              <Label htmlFor="moncash" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                MonCash
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="check" id="check" />
              <Label htmlFor="check" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Chèque
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 opacity-50">
              <RadioGroupItem value="card" id="card" disabled />
              <Label htmlFor="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Carte (Bientôt disponible)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes (optionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Informations additionnelles sur le paiement..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Annuler
        </Button>
        
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Traitement...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {getPaymentMethodIcon(paymentMethod)}
              Confirmer le paiement
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};