import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedRevenueChart } from "./EnhancedRevenueChart";
import { DollarSign, TrendingUp, Users, Download, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentData {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface PaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  pendingPayments: number;
}

export function PaymentOverview() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentData();

    // Subscribe to realtime payment updates for instant refresh
    const channel = supabase
      .channel('payment-overview-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment change detected in overview:', payload);
          // Optimistic update for better UX
          fetchPaymentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
    // Fetch payments with user profiles
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        profiles!payments_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    // Filter out any payments with missing profile data
    const validPayments = (paymentsData || []).filter(payment => 
      payment.profiles && 
      typeof payment.profiles === 'object' && 
      !('error' in payment.profiles)
    );

    setPayments(validPayments);

    // Calculate statistics
    const allPayments = validPayments;
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      const totalRevenue = allPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const monthlyRevenue = allPayments
        .filter(p => 
          p.status === 'paid' && 
          new Date(p.created_at) >= firstDayOfMonth
        )
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalTransactions = allPayments.filter(p => p.status === 'paid').length;
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const pendingPayments = allPayments.filter(p => p.status === 'pending').length;

      setStats({
        totalRevenue,
        monthlyRevenue,
        totalTransactions,
        averageTransaction,
        pendingPayments
      });

    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de paiement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPayments = () => {
    const csvData = payments.map(payment => ({
      Date: format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm'),
      Client: payment.profiles.full_name,
      Email: payment.profiles.email,
      Montant: `$${payment.amount}`,
      Statut: payment.status,
      Méthode: payment.payment_method || 'Non spécifié',
      Transaction: payment.transaction_id || 'N/A'
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const csv = [headers, ...csvData.map(row => Object.values(row).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.profiles.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    let matchesTime = true;
    if (timeFilter !== "all") {
      const paymentDate = new Date(payment.created_at);
      const now = new Date();
      
      switch (timeFilter) {
        case "today":
          matchesTime = paymentDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesTime = paymentDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesTime = paymentDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vue d'ensemble des Paiements</h2>
          <p className="text-muted-foreground">Suivi des revenus et transactions</p>
        </div>
        <Button onClick={exportPayments}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Revenus Totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Ce Mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageTransaction.toFixed(0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <EnhancedRevenueChart />

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, email ou transaction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Transactions Récentes ({filteredPayments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.slice(0, 20).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.profiles.full_name}</div>
                      <div className="text-sm text-muted-foreground">{payment.profiles.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {payment.payment_method || 'Non spécifié'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(payment.status)}>
                      {getStatusText(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.transaction_id || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}