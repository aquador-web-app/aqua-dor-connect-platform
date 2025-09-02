import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  DollarSign, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Banknote,
  CreditCard,
  Users,
  TrendingUp
} from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  admin_verified: boolean;
  created_at: string;
  paid_at: string | null;
  user_id: string;
  booking_id: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  bookings?: {
    class_sessions: {
      session_date: string;
      classes: {
        name: string;
        level: string;
      };
    };
  };
}

interface PaymentStats {
  totalRevenue: number;
  pendingPayments: number;
  verifiedPayments: number;
  monthlyRevenue: number;
  paymentsByMethod: Record<string, number>;
}

export function AdminPaymentManager() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    monthlyRevenue: 0,
    paymentsByMethod: {}
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles!payments_user_id_fkey(full_name, email),
          bookings(
            class_sessions(
              session_date,
              classes(name, level)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out any payments with missing profile data
      const validPayments = (data || []).filter(payment => 
        payment.profiles && 
        typeof payment.profiles === 'object' && 
        !('error' in payment.profiles)
      );

      setPayments(validPayments);
      calculateStats(validPayments);
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

  const calculateStats = (paymentData: PaymentRecord[]) => {
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const totalRevenue = paymentData
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = paymentData.filter(p => p.status === 'pending').length;
    const verifiedPayments = paymentData.filter(p => p.admin_verified).length;

    const monthlyRevenue = paymentData
      .filter(p => 
        p.status === 'paid' && 
        new Date(p.created_at) >= firstDayOfMonth
      )
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentsByMethod = paymentData.reduce((acc, p) => {
      acc[p.payment_method] = (acc[p.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalRevenue,
      pendingPayments,
      verifiedPayments,
      monthlyRevenue,
      paymentsByMethod
    });
  };

  const handleVerifyPayment = async (paymentId: string, verified: boolean) => {
    try {
      setUpdating(paymentId);
      
      const updateData: any = { admin_verified: verified };
      
      // If marking as verified and payment is pending, also mark as paid
      if (verified) {
        const payment = payments.find(p => p.id === paymentId);
        if (payment?.status === 'pending') {
          updateData.status = 'paid';
          updateData.paid_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: verified ? "Paiement Vérifié" : "Vérification Annulée",
        description: verified 
          ? "Le paiement a été marqué comme vérifié et payé" 
          : "La vérification du paiement a été annulée"
      });

      fetchPayments(); // Refresh data
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le paiement",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.profiles.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bookings?.class_sessions?.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Payé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'moncash':
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'check':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'moncash': return 'MonCash';
      case 'check': return 'Chèque';
      case 'card': return 'Carte';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
          <p className="text-muted-foreground">
            Gérez et vérifiez les paiements des étudiants
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Revenus Totaux</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">En Attente</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingPayments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Vérifiés</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.verifiedPayments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ce Mois</span>
            </div>
            <div className="text-2xl font-bold">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou cours..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Méthode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les méthodes</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="moncash">MonCash</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="card">Carte</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Paiements ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vérifié Admin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.profiles.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.profiles.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {payment.bookings?.class_sessions ? (
                        <div>
                          <div className="font-medium">
                            {payment.bookings.class_sessions.classes.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(payment.bookings.class_sessions.session_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Paiement général</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="font-semibold">
                      ${payment.amount}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.payment_method)}
                        <span>{getMethodName(payment.payment_method)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    
                    <TableCell>
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.admin_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="text-sm">
                          {payment.admin_verified ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={payment.admin_verified}
                          onCheckedChange={(checked) => 
                            handleVerifyPayment(payment.id, checked as boolean)
                          }
                          disabled={updating === payment.id}
                        />
                        <Label className="text-sm cursor-pointer">
                          {payment.admin_verified ? 'Vérifié' : 'Marquer comme payé'}
                        </Label>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}