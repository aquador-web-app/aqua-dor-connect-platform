import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Gift, DollarSign, TrendingUp, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "./StatCard";

interface ReferralData {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  referral_code: string;
  status: string;
  commission_amount: number;
  created_at: string;
}

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
}

export function ReferralDashboard() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      // Fetch referrals with user details
      const { data: referralsData, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:profiles!referrals_referrer_id_fkey(full_name, email),
          referred:profiles!referrals_referred_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedReferrals = referralsData?.map((ref: any) => ({
        id: ref.id,
        referrer_name: ref.referrer?.full_name || "Inconnu",
        referrer_email: ref.referrer?.email || "",
        referred_name: ref.referred?.full_name || "Inconnu", 
        referred_email: ref.referred?.email || "",
        referral_code: ref.referral_code,
        status: ref.status,
        commission_amount: parseFloat(ref.commission_amount || 0),
        created_at: ref.created_at
      })) || [];

      setReferrals(formattedReferrals);

      // Calculate stats
      const totalReferrals = formattedReferrals.length;
      const successfulReferrals = formattedReferrals.filter(r => r.status === 'completed').length;
      const totalCommissions = formattedReferrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.commission_amount, 0);
      const pendingCommissions = formattedReferrals
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.commission_amount, 0);

      setStats({
        totalReferrals,
        successfulReferrals,
        totalCommissions,
        pendingCommissions
      });

    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referral_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Parrainages"
          value={stats.totalReferrals.toString()}
          icon={Users}
        />
        <StatCard
          title="Parrainages Réussis"
          value={stats.successfulReferrals.toString()}
          icon={TrendingUp}
        />
        <StatCard
          title="Commissions Totales"
          value={`$${stats.totalCommissions.toFixed(2)} USD`}
          icon={DollarSign}
        />
        <StatCard
          title="En Attente"
          value={`$${stats.pendingCommissions.toFixed(2)} USD`}
          icon={Gift}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Parrainages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
              >
                Tous
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                onClick={() => setStatusFilter("pending")}
                size="sm"
              >
                En attente
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                onClick={() => setStatusFilter("completed")}
                size="sm"
              >
                Terminés
              </Button>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Parrain</th>
                  <th className="text-left py-3 px-4 font-medium">Filleul</th>
                  <th className="text-left py-3 px-4 font-medium">Code</th>
                  <th className="text-left py-3 px-4 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 font-medium">Commission</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{referral.referrer_name}</p>
                        <p className="text-sm text-muted-foreground">{referral.referrer_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{referral.referred_name}</p>
                        <p className="text-sm text-muted-foreground">{referral.referred_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {referral.referral_code}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(referral.status)}>
                        {getStatusText(referral.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        ${referral.commission_amount.toFixed(2)} USD
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredReferrals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun parrainage trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}