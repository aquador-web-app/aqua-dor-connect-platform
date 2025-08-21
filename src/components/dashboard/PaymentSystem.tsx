import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Check, Star, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active: boolean;
}

export function PaymentSystem() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      setPlans((data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : 
          typeof plan.features === 'string' ? JSON.parse(plan.features) : []
      })));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les forfaits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user || !profile) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour souscrire à un forfait",
        variant: "destructive"
      });
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedPlan || !profile) return;

    try {
      setProcessing(true);

      // Create enrollment record
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: profile.id,
          class_id: selectedPlan.id, // Using plan ID as class reference for now
          status: 'pending',
          payment_status: 'pending'
        });

      if (enrollmentError) throw enrollmentError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: profile.id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          status: 'pending',
          payment_method: 'Subscription'
        });

      if (paymentError) throw paymentError;

      // In a real implementation, you would integrate with a payment provider here
      // For now, we'll simulate a successful payment
      setTimeout(() => {
        toast({
          title: "Paiement simulé",
          description: `Souscription au forfait ${selectedPlan.name} réussie!`,
        });
        
        setShowPaymentDialog(false);
        setSelectedPlan(null);
        setProcessing(false);
      }, 2000);

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erreur de paiement",
        description: "Impossible de traiter le paiement",
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('découverte')) return Star;
    if (name.includes('annuel')) return Crown;
    if (name.includes('trimestriel')) return Sparkles;
    return CreditCard;
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('découverte')) return 'border-blue-200 bg-blue-50';
    if (name.includes('annuel')) return 'border-purple-200 bg-purple-50';
    if (name.includes('trimestriel')) return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choisissez votre forfait</h2>
        <p className="text-muted-foreground">
          Sélectionnez le forfait qui correspond le mieux à vos besoins
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.name);
          const colorClass = getPlanColor(plan.name);
          const features = Array.isArray(plan.features) ? plan.features : [];
          
          return (
            <Card key={plan.id} className={`relative overflow-hidden ${colorClass}`}>
              {plan.name.toLowerCase().includes('annuel') && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-medium">
                  POPULAIRE
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-white shadow-md w-fit">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      /{plan.duration_months === 1 ? 'mois' : `${plan.duration_months} mois`}
                    </span>
                  </div>
                  {plan.duration_months > 1 && (
                    <div className="text-sm text-muted-foreground">
                      ${(plan.price / plan.duration_months).toFixed(2)}/mois
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handleSubscribe(plan)}
                  className="w-full"
                  variant={plan.name.toLowerCase().includes('annuel') ? 'default' : 'outline'}
                >
                  Choisir ce forfait
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser votre souscription</DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              <div className="text-center p-6 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{selectedPlan.description}</p>
                <div className="text-2xl font-bold">
                  ${selectedPlan.price} {selectedPlan.currency}
                </div>
                <p className="text-sm text-muted-foreground">
                  Pour {selectedPlan.duration_months} mois
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Ceci est une simulation de paiement. 
                    Dans un système réel, vous seriez redirigé vers un processeur de paiement sécurisé.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPaymentDialog(false)}
                    className="flex-1"
                    disabled={processing}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={processPayment}
                    className="flex-1"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Confirmer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}