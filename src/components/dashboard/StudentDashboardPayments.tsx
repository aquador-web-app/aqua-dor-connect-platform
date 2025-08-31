import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CreditCard, CheckCircle, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  enrollment?: {
    id: string;
    class: {
      name: string;
      price: number;
    };
  };
}

interface Balance {
  id: string;
  balance: number;
  updated_at: string;
}

export function StudentDashboardPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchPayments();
      fetchBalance();
      
      // Set up real-time subscription for new payments
      const channel = supabase
        .channel('student-payments')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          fetchPayments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchPayments = async () => {
    try {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          enrollment:enrollments(
            id,
            class:classes(name, price)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePayNow = async (payment: Payment) => {
    try {
      // Simulate payment processing
      toast({
        title: "Redirection vers le paiement",
        description: "Redirection vers la page de paiement sécurisée..."
      });
      
      // In a real implementation, this would redirect to Stripe or payment processor
      setTimeout(() => {
        toast({
          title: "Paiement simulé",
          description: "Le paiement a été traité avec succès",
        });
      }, 2000);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erreur de paiement",
        description: "Impossible de traiter le paiement",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card className="bg-gradient-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Solde de votre compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-3xl font-bold ${totalPending > 0 ? 'text-destructive' : 'text-primary'}`}>
                {totalPending > 0 ? `$${totalPending.toFixed(2)}` : '$0.00'}
              </div>
              <p className="text-sm text-muted-foreground">
                {totalPending > 0 ? 'Montant dû' : 'Vous êtes à jour'}
              </p>
            </div>
            {totalPending > 0 && (
              <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
            )}
            {totalPending === 0 && (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments Alert */}
      {totalPending > 0 && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Vous avez des paiements en attente. Veuillez effectuer vos paiements pour maintenir votre accès aux cours.
          </AlertDescription>
        </Alert>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun paiement trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all hover:shadow-md ${
                    payment.status === 'pending' ? 'border-destructive bg-destructive/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payment.status === 'pending' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status === 'paid' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : payment.status === 'pending' ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.enrollment?.class?.name || 'Paiement général'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), 'dd/MM/yyyy à HH:mm')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={
                        payment.status === 'paid' ? 'default' : 
                        payment.status === 'pending' ? 'destructive' : 
                        'secondary'
                      }
                      className={
                        payment.status === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''
                      }
                    >
                      {payment.status === 'paid' ? 'Payé' :
                       payment.status === 'pending' ? 'En attente' : 
                       'Traitement'}
                    </Badge>
                    
                    {payment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handlePayNow(payment)}
                        className="animate-pulse"
                      >
                        Payer maintenant
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}