import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Users, TrendingUp, Share2, Gift, Award } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";

interface InfluencerData {
  balance: number;
  total_referrals: number;
  status: string;
  referral_code: string;
  recent_referrals: Array<{
    id: string;
    referred_name: string;
    commission: number;
    status: string;
    created_at: string;
  }>;
}

const InfluencerPortal = () => {
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [influencerData, setInfluencerData] = useState<InfluencerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [isCashoutOpen, setIsCashoutOpen] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchInfluencerData();
    }
  }, [user, profile]);

  const fetchInfluencerData = async () => {
    try {
      setLoading(true);
      
      // For now, simulate influencer account data since tables may not exist yet
      // This would be replaced with actual database queries once influencer tables are created
      const mockInfluencerAccount = {
        balance: 125.50,
        total_referrals: 8,
        status: 'active'
      };

      // Mock referral data for demo
      const mockReferrals = [
        {
          id: '1',
          referred_name: 'Marie Dubois',
          commission: 10,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          referred_name: 'Pierre Martin',
          commission: 10,
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      setInfluencerData({
        balance: mockInfluencerAccount.balance,
        total_referrals: mockInfluencerAccount.total_referrals,
        status: mockInfluencerAccount.status,
        referral_code: profile?.referral_code || 'IN123',
        recent_referrals: mockReferrals
      });

    } catch (error) {
      console.error('Error fetching influencer data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'influenceur",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    const amount = parseFloat(cashoutAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive"
      });
      return;
    }

    if (amount > (influencerData?.balance || 0)) {
      toast({
        title: "Erreur",  
        description: "Montant supérieur au solde disponible",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, this would create a cashout request
      // For now, we'll just show a success message
      toast({
        title: "Demande de retrait envoyée",
        description: `Votre demande de retrait de $${amount} USD a été envoyée à l'administration. Vous recevrez un email de confirmation.`,
      });
      
      setIsCashoutOpen(false);
      setCashoutAmount("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande de retrait",
        variant: "destructive"
      });
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/auth?ref=${influencerData?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Lien copié",
      description: "Le lien de parrainage a été copié dans votre presse-papiers"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!influencerData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Accès Influenceur Requis</h2>
              <p className="text-muted-foreground mb-6">
                Vous devez être un influenceur A'qua D'or pour accéder à cette page.
                Contactez l'administration pour devenir influenceur.
              </p>
              <Button asChild>
                <a href="/contact">Contacter l'Administration</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portail Influenceur</h1>
          <p className="text-muted-foreground">Gérez vos parrainages et vos revenus A'qua D'or</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="referrals">Parrainages</TabsTrigger>
            <TabsTrigger value="earnings">Revenus</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Solde Total"
                value={`$${influencerData.balance.toFixed(2)}`}
                icon={DollarSign}
                change={{ value: 0, period: "ce mois" }}
              />
              <StatCard
                title="Parrainages Totaux"
                value={influencerData.total_referrals}
                icon={Users}
                change={{ value: 0, period: "ce mois" }}
              />
              <StatCard
                title="Commission par Parrainage"
                value="$10.00"
                icon={Gift}
                change={{ value: 0, period: "fixe" }}
              />
              <StatCard
                title="Statut"
                value={influencerData.status === 'active' ? 'Actif' : 'Inactif'}
                icon={Award}
                change={{ value: 0, period: "statut" }}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Partager votre lien
                  </CardTitle>
                  <CardDescription>Partagez votre code de parrainage unique</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Code de parrainage</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={influencerData.referral_code} 
                        readOnly 
                        className="font-mono"
                      />
                      <Button variant="outline" onClick={copyReferralLink}>
                        Copier Lien
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gagnez $10 USD pour chaque nouveau membre qui s'inscrit avec votre code.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Retirer des fonds
                  </CardTitle>
                  <CardDescription>Demander un retrait de votre solde</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Solde disponible</span>
                        <span className="text-2xl font-bold text-primary">
                          ${influencerData.balance.toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                    <Dialog open={isCashoutOpen} onOpenChange={setIsCashoutOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          disabled={influencerData.balance <= 0}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Demander un retrait
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Demande de retrait</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Montant à retirer (USD)</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={cashoutAmount}
                              onChange={(e) => setCashoutAmount(e.target.value)}
                              max={influencerData.balance}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Maximum: ${influencerData.balance.toFixed(2)} USD
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsCashoutOpen(false)} className="flex-1">
                              Annuler
                            </Button>
                            <Button onClick={handleCashout} className="flex-1">
                              Confirmer
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Parrainages Récents</CardTitle>
                <CardDescription>Vos derniers parrainages et leurs statuts</CardDescription>
              </CardHeader>
              <CardContent>
                {influencerData.recent_referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Aucun parrainage pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {influencerData.recent_referrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{referral.referred_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">+${referral.commission.toFixed(2)} USD</p>
                          <Badge 
                            variant={referral.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {referral.status === 'completed' ? 'Confirmé' : 'En attente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Revenus</CardTitle>
                <CardDescription>Vos revenus de parrainage détaillés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>L'historique détaillé des revenus sera bientôt disponible.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InfluencerPortal;