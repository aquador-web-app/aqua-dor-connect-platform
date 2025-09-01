import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, DollarSign, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BalanceData {
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
  lastPaymentDate?: string;
}

export function StudentBalanceIndicator() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceData>({
    totalPending: 0,
    totalPaid: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchBalance();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('student-balance')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          fetchBalance();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchBalance = async () => {
    try {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const payments = data || [];
      
      const totalPending = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingCount = payments.filter(p => p.status === 'pending').length;

      const lastPayment = payments.find(p => p.status === 'paid');
      const lastPaymentDate = lastPayment?.paid_at || lastPayment?.created_at;

      setBalance({
        totalPending,
        totalPaid,
        pendingCount,
        lastPaymentDate
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const hasOutstandingBalance = balance.totalPending > 0;

  return (
    <Card className={cn(
      "mb-6 border-l-4 transition-all",
      hasOutstandingBalance 
        ? "border-l-destructive bg-destructive/5 hover:bg-destructive/10" 
        : "border-l-green-500 bg-green-50 hover:bg-green-100"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              hasOutstandingBalance 
                ? "bg-destructive/20" 
                : "bg-green-500/20"
            )}>
              {hasOutstandingBalance ? (
                <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Solde de votre compte
                </span>
              </div>
              
              <div className={cn(
                "text-2xl font-bold",
                hasOutstandingBalance ? "text-destructive" : "text-green-600"
              )}>
                {hasOutstandingBalance 
                  ? `$${balance.totalPending.toFixed(2)}` 
                  : '$0.00'
                }
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {hasOutstandingBalance ? (
                  <>
                    <Badge variant="destructive" className="text-xs">
                      {balance.pendingCount} paiement{balance.pendingCount > 1 ? 's' : ''} en attente
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Montant dû
                    </span>
                  </>
                ) : (
                  <>
                    <Badge className="text-xs bg-green-100 text-green-800">
                      Compte à jour
                    </Badge>
                    {balance.lastPaymentDate && (
                      <span className="text-xs text-muted-foreground">
                        Dernier paiement: {new Date(balance.lastPaymentDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {hasOutstandingBalance && (
              <Button
                size="sm"
                onClick={() => navigate('/student-portal', { state: { activeTab: 'payments' } })}
                className="animate-pulse"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Voir Paiements
              </Button>
            )}
            
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total payé</div>
              <div className="text-sm font-semibold text-green-600">
                ${balance.totalPaid.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {hasOutstandingBalance && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                Attention: Vous avez des paiements en attente
              </span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              Veuillez effectuer vos paiements pour maintenir votre accès aux cours.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}