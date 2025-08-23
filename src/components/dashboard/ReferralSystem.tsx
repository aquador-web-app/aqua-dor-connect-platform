import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Gift, Users, Percent, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  confirmed_referrals: number;
  discount_earned: number;
  next_discount_threshold: number;
}

export function ReferralSystem() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (profile) {
      fetchReferralStats();
    }
  }, [profile]);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);

      // Get user's referrals where they are the referrer
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', profile?.id);

      if (referralsError) throw referralsError;

      const totalReferrals = referrals?.length || 0;
      const confirmedReferrals = referrals?.filter(r => r.status === 'completed')?.length || 0;

      // Calculate discount based on confirmed referrals
      let discount = 0;
      let nextThreshold = 5;

      if (confirmedReferrals >= 10) {
        discount = 100; // 100% discount
        nextThreshold = 10; // Max threshold reached
      } else if (confirmedReferrals >= 5) {
        discount = 50; // 50% discount
        nextThreshold = 10;
      } else {
        nextThreshold = 5;
      }

      setStats({
        referral_code: profile?.referral_code || '',
        total_referrals: totalReferrals,
        confirmed_referrals: confirmedReferrals,
        discount_earned: discount,
        next_discount_threshold: nextThreshold
      });

    } catch (error) {
      console.error('Error fetching referral stats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques de parrainage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyReferralCode = async () => {
    if (!referralCode.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code de parrainage",
        variant: "destructive"
      });
      return;
    }

    try {
      // Find the referrer by referral code
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();

      if (referrerError) throw referrerError;

      if (!referrer) {
        toast({
          title: "Code invalide",
          description: "Le code de parrainage n'existe pas",
          variant: "destructive"
        });
        return;
      }

      if (referrer.id === profile?.id) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas utiliser votre propre code",
          variant: "destructive"
        });
        return;
      }

      // Check if referral already exists
      const { data: existingReferral, error: existingError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .eq('referred_id', profile?.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingReferral) {
        toast({
          title: "Déjà utilisé",
          description: "Vous avez déjà utilisé ce code de parrainage",
          variant: "destructive"
        });
        return;
      }

      // Create the referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: profile?.id,
          referral_code: referralCode.trim().toUpperCase(),
          status: 'completed', // Automatically confirm for simplicity
          commission_amount: 10.00 // $10 commission
        });

      if (insertError) throw insertError;

      toast({
        title: "Code appliqué !",
        description: "Le code de parrainage a été appliqué avec succès",
      });

      setReferralCode("");
      fetchReferralStats();

    } catch (error) {
      console.error('Error applying referral code:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer le code de parrainage",
        variant: "destructive"
      });
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/auth?ref=${stats?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Lien copié",
      description: "Le lien de parrainage a été copié dans votre presse-papiers"
    });
  };

  const getDiscountBadge = () => {
    const discount = stats?.discount_earned || 0;
    if (discount >= 100) {
      return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">100% GRATUIT</Badge>;
    } else if (discount >= 50) {
      return <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">50% RÉDUCTION</Badge>;
    }
    return <Badge variant="secondary">Aucune réduction</Badge>;
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
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Programme de Parrainage</h2>
        <p className="text-muted-foreground">
          Invitez vos amis et gagnez des réductions sur vos cours !
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Votre Statut de Parrainage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {stats?.confirmed_referrals || 0}
              </div>
              <p className="text-sm text-muted-foreground">Parrainages confirmés</p>
            </div>
            <div className="text-center">
              <div className="mb-2">
                {getDiscountBadge()}
              </div>
              <p className="text-sm text-muted-foreground">Réduction actuelle</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary mb-2">
                {stats?.next_discount_threshold === 10 && (stats?.confirmed_referrals || 0) >= 10 
                  ? "$10" 
                  : (stats?.next_discount_threshold || 5) - (stats?.confirmed_referrals || 0)
                }
              </div>
              <p className="text-sm text-muted-foreground">
                {stats?.next_discount_threshold === 10 && (stats?.confirmed_referrals || 0) >= 10
                  ? "Par parrainage additionnel"
                  : `Jusqu'à la prochaine réduction`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progression des Récompenses</CardTitle>
          <CardDescription>Votre chemin vers les réductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                (stats?.confirmed_referrals || 0) >= 5 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {(stats?.confirmed_referrals || 0) >= 5 ? '✓' : '5'}
              </div>
              <div className="flex-1">
                <p className="font-medium">5 Parrainages confirmés</p>
                <p className="text-sm text-muted-foreground">50% de réduction sur tous vos cours</p>
              </div>
              <Badge variant={(stats?.confirmed_referrals || 0) >= 5 ? 'default' : 'secondary'}>
                {(stats?.confirmed_referrals || 0) >= 5 ? 'Atteint !' : 'En cours'}
              </Badge>
            </div>
            
            <div className={`flex items-center gap-4 p-4 rounded-lg ${
              (stats?.confirmed_referrals || 0) >= 10 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-muted/30'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                (stats?.confirmed_referrals || 0) >= 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'bg-muted'
              }`}>
                {(stats?.confirmed_referrals || 0) >= 10 ? '✓' : '10'}
              </div>
              <div className="flex-1">
                <p className="font-medium">10 Parrainages confirmés</p>
                <p className="text-sm text-muted-foreground">100% GRATUIT + $10 par parrainage additionnel</p>
              </div>
              <Badge variant={(stats?.confirmed_referrals || 0) >= 10 ? 'default' : 'secondary'}>
                {(stats?.confirmed_referrals || 0) >= 10 ? 'Atteint !' : 'En cours'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Share Your Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Partager votre Code
            </CardTitle>
            <CardDescription>
              Invitez vos amis avec votre code unique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Votre code de parrainage</Label>
              <div className="flex gap-2">
                <Input 
                  value={stats?.referral_code || ''} 
                  readOnly 
                  className="font-mono text-lg font-bold"
                />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Vos amis recevront également un avantage spécial lors de leur inscription !
            </p>
          </CardContent>
        </Card>

        {/* Apply Referral Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utiliser un Code
            </CardTitle>
            <CardDescription>
              Avez-vous été invité par un ami ?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Code de parrainage</Label>
              <Input 
                placeholder="Ex: DA91"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <Button onClick={applyReferralCode} className="w-full">
              Appliquer le Code
            </Button>
            <p className="text-sm text-muted-foreground">
              Vous ne pouvez utiliser qu'un seul code de parrainage par compte.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}