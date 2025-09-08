import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Gift,
  Search,
  Filter,
  Download,
  UserCheck,
  Calendar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReferralData {
  id: string;
  referral_code: string;
  status: string;
  commission_amount: number;
  created_at: string;
  updated_at: string;
  referrer: {
    full_name: string;
    email: string;
    referral_code: string;
  };
  referred: {
    full_name: string;
    email: string;
  };
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCommissions: number;
  thisMonthReferrals: number;
  topReferrers: Array<{
    full_name: string;
    email: string;
    referral_count: number;
    total_commission: number;
  }>;
}

export const ReferralManagement = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalCommissions: 0,
    thisMonthReferrals: 0,
    topReferrers: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:profiles!referrer_id(full_name, email, referral_code),
          referred:profiles!referred_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les parrainages.",
        variant: "destructive"
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Total referrals
      const { count: totalCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' });

      // Completed referrals
      const { count: completedCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('status', 'completed');

      // Pending referrals
      const { count: pendingCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      // Total commissions
      const { data: commissionsData } = await supabase
        .from('referrals')
        .select('commission_amount')
        .eq('status', 'completed');

      const totalCommissions = commissionsData?.reduce((sum, ref) => sum + (ref.commission_amount || 0), 0) || 0;

      // This month referrals
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: thisMonthCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString());

      // Top referrers
      const { data: topReferrersData } = await supabase
        .from('referrals')
        .select(`
          referrer_id,
          commission_amount,
          status,
          referrer:profiles!referrer_id(full_name, email)
        `)
        .eq('status', 'completed');

      const referrerStats = topReferrersData?.reduce((acc: any, ref) => {
        const referrerId = ref.referrer_id;
        if (!acc[referrerId]) {
          acc[referrerId] = {
            full_name: ref.referrer?.full_name || 'Unknown',
            email: ref.referrer?.email || 'Unknown',
            referral_count: 0,
            total_commission: 0
          };
        }
        acc[referrerId].referral_count++;
        acc[referrerId].total_commission += ref.commission_amount || 0;
        return acc;
      }, {});

      const topReferrers = Object.values(referrerStats || {})
        .sort((a: any, b: any) => b.referral_count - a.referral_count)
        .slice(0, 5);

      setStats({
        totalReferrals: totalCount || 0,
        completedReferrals: completedCount || 0,
        pendingReferrals: pendingCount || 0,
        totalCommissions,
        thisMonthReferrals: thisMonthCount || 0,
        topReferrers: topReferrers as any
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReferralStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ 
          status,
          commission_amount: status === 'completed' ? 10.00 : 0
        })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Statut mis à jour",
        description: `Parrainage marqué comme ${status === 'completed' ? 'complété' : status}.`
      });

      fetchReferrals();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = !searchTerm || 
      referral.referrer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Parrainages</h2>
          <p className="text-muted-foreground">Suivez et gérez le programme de parrainage</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Parrainages</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Complétés</p>
                <p className="text-2xl font-bold">{stats.completedReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Commissions</p>
                <p className="text-2xl font-bold">${stats.totalCommissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ce mois</p>
                <p className="text-2xl font-bold">{stats.thisMonthReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="referrals" className="w-full">
        <TabsList>
          <TabsTrigger value="referrals">Parrainages</TabsTrigger>
          <TabsTrigger value="top-referrers">Top Parrains</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nom, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Referrals List */}
          <div className="grid gap-4">
            {filteredReferrals.map((referral) => (
              <Card key={referral.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Gift className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">
                          {referral.referrer?.full_name} → {referral.referred?.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {referral.referrer?.email} → {referral.referred?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Code: {referral.referral_code} • {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          referral.status === 'completed' ? 'default' :
                          referral.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {referral.status === 'completed' ? 'Complété' :
                         referral.status === 'pending' ? 'En attente' : 'Expiré'}
                      </Badge>
                      {referral.commission_amount > 0 && (
                        <Badge variant="outline">${referral.commission_amount}</Badge>
                      )}
                      {referral.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateReferralStatus(referral.id, 'completed')}
                        >
                          Marquer complété
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="top-referrers" className="space-y-4">
          <div className="grid gap-4">
            {stats.topReferrers.map((referrer, index) => (
              <Card key={referrer.email}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{referrer.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{referrer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{referrer.referral_count}</p>
                      <p className="text-sm text-muted-foreground">parrainages</p>
                      <p className="text-sm font-medium text-green-600">${referrer.total_commission}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};