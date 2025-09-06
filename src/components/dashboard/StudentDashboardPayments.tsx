import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CreditCard, CheckCircle, Clock, DollarSign, Receipt, Calendar } from "lucide-react";
import { format, isAfter, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  created_at: string;
  paid_at: string | null;
  admin_verified: boolean;
  booking?: {
    class_session: {
      classes: {
        name: string;
        price: number;
      };
    };
  };
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
          ),
          booking:bookings(
            class_session:class_sessions(
              classes(name, price)
            )
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

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const overduePayments = payments.filter(p => 
    p.status === 'pending' && 
    isAfter(new Date(), subDays(new Date(p.created_at), -7)) // 7 days overdue
  );
  const paidPayments = payments.filter(p => p.status === 'paid' || p.status === 'approved');
  
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

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

  const getCourseName = (payment: Payment) => {
    return payment.booking?.class_session?.classes?.name || 
           payment.enrollment?.class?.name || 
           'Paiement général';
  };

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

      {/* Alerts */}
      {totalOverdue > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            ⚠️ Vous avez ${totalOverdue.toFixed(2)} de paiements en retard. Veuillez régulariser votre situation rapidement.
          </AlertDescription>
        </Alert>
      )}

      {totalPending > 0 && totalOverdue === 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="font-medium text-yellow-800">
            Vous avez ${totalPending.toFixed(2)} de paiements en attente de validation.
          </AlertDescription>
        </Alert>
      )}

      {/* En Attente Section */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Clock className="h-5 w-5" />
              En Attente ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getCourseName(payment)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      {payment.method === 'cash' ? 'Espèces' : 
                       payment.method === 'moncash' ? 'MonCash' :
                       payment.method === 'check' ? 'Chèque' : 'Carte'}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handlePayNow(payment)}
                    >
                      Payer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paiements Dus Section */}
      {overduePayments.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Paiements Dus ({overduePayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-xs text-red-700 font-medium">
                        {getCourseName(payment)}
                      </div>
                      <div className="text-xs text-red-600">
                        Échéance dépassée depuis le {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">
                      En retard
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handlePayNow(payment)}
                      className="animate-pulse"
                    >
                      Payer Maintenant
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des Paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historique des Paiements ({paidPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paidPayments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun paiement confirmé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getCourseName(payment)}
                      </div>
                      <div className="text-xs text-green-700">
                        Payé le {payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Confirmé
                    </Badge>
                    {payment.admin_verified && (
                      <Badge variant="outline" className="text-xs">
                        Vérifié
                      </Badge>
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