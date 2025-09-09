import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Package, CreditCard, Banknote, CheckCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PackageOption {
  type: string;
  name: string;
  sessions: number;
  pricePerSession: number;
  totalPrice: number;
  savings?: number;
  popular?: boolean;
  description: string;
}

interface SessionPackagePurchaseProps {
  onSuccess: (packageId: string) => void;
  onCancel: () => void;
}

export function SessionPackagePurchase({ onSuccess, onCancel }: SessionPackagePurchaseProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>("single");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const packageOptions: PackageOption[] = [
    {
      type: "single",
      name: "Session Individuelle",
      sessions: 1,
      pricePerSession: 60,
      totalPrice: 60,
      description: "Parfait pour essayer nos services"
    },
    {
      type: "monthly",
      name: "Pack Mensuel",
      sessions: 4,
      pricePerSession: 50,
      totalPrice: 200,
      savings: 40,
      popular: true,
      description: "Le choix le plus populaire - 1 session par semaine"
    },
    {
      type: "unlimited",
      name: "Pack Illimité",
      sessions: 12,
      pricePerSession: 40,
      totalPrice: 480,
      savings: 240,
      description: "Meilleure valeur - accès flexible pendant 1 an"
    }
  ];

  const paymentMethods = [
    {
      id: "cash",
      name: "Espèces",
      icon: Banknote,
      description: "Paiement en espèces au centre",
      available: true
    },
    {
      id: "moncash", 
      name: "MonCash",
      icon: CreditCard,
      description: "Paiement mobile MonCash",
      available: true
    },
    {
      id: "check",
      name: "Chèque",
      icon: CheckCircle,
      description: "Paiement par chèque",
      available: true
    }
  ];

  const selectedPackageDetails = packageOptions.find(p => p.type === selectedPackage);

  const handlePurchase = async () => {
    if (!profile || !selectedPackageDetails) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('purchase_session_package', {
        p_student_id: profile.id,
        p_package_type: selectedPackageDetails.type,
        p_total_sessions: selectedPackageDetails.sessions,
        p_price_per_session: selectedPackageDetails.pricePerSession,
        p_payment_method: paymentMethod
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; package_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Purchase failed');
      }

      toast({
        title: "🎯 Pack Acheté avec Succès!",
        description: (
          <div className="space-y-2">
            <div><strong>Pack:</strong> {selectedPackageDetails.name}</div>
            <div><strong>Sessions:</strong> {selectedPackageDetails.sessions}</div>
            <div><strong>Total:</strong> ${selectedPackageDetails.totalPrice}</div>
            <div><strong>Statut:</strong> <span className="text-orange-600">En attente de validation admin</span></div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              Votre pack sera activé après validation du paiement par un administrateur.
            </div>
          </div>
        ),
      });

      onSuccess(result.package_id!);
    } catch (error: any) {
      console.error('Error purchasing package:', error);
      toast({
        title: "Erreur d'Achat",
        description: error.message || "Impossible d'acheter le pack",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choisissez Votre Pack de Sessions</h2>
        <p className="text-muted-foreground">
          Achetez un pack pour réserver vos sessions de natation
        </p>
      </div>

      {/* Package Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        {packageOptions.map((pkg) => (
          <Card 
            key={pkg.type}
            className={`cursor-pointer transition-all hover:shadow-lg relative ${
              selectedPackage === pkg.type 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border'
            }`}
            onClick={() => setSelectedPackage(pkg.type)}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3">
                  <Star className="w-3 h-3 mr-1" />
                  Populaire
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{pkg.name}</CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <div>
                <div className="text-3xl font-bold text-primary">
                  ${pkg.totalPrice}
                </div>
                <div className="text-sm text-muted-foreground">
                  ${pkg.pricePerSession} par session
                </div>
                {pkg.savings && (
                  <div className="text-sm text-green-600 font-medium">
                    Économisez ${pkg.savings}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Badge variant="outline">
                    {pkg.sessions} {pkg.sessions === 1 ? 'Session' : 'Sessions'}
                  </Badge>
                </div>
                {pkg.type === 'unlimited' && (
                  <div className="text-xs text-muted-foreground">
                    Valide pendant 1 an
                  </div>
                )}
                {pkg.type === 'monthly' && (
                  <div className="text-xs text-muted-foreground">
                    Valide pendant 30 jours
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="grid gap-3">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <Label
                    key={method.id}
                    htmlFor={method.id}
                    className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      paymentMethod === method.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                  >
                    <RadioGroupItem id={method.id} value={method.id} />
                    <IconComponent className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{method.name}</div>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </Label>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {selectedPackageDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la Commande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{selectedPackageDetails.name}</span>
              <span className="font-semibold">${selectedPackageDetails.totalPrice}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{selectedPackageDetails.sessions} sessions × ${selectedPackageDetails.pricePerSession}</span>
              <span>${selectedPackageDetails.sessions * selectedPackageDetails.pricePerSession}</span>
            </div>
            
            {selectedPackageDetails.savings && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>Économies</span>
                <span>-${selectedPackageDetails.savings}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">${selectedPackageDetails.totalPrice}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handlePurchase} 
          disabled={loading}
          className="min-w-[180px]"
        >
          {loading ? 'Traitement...' : 'Acheter le Pack'}
        </Button>
      </div>
    </div>
  );
}