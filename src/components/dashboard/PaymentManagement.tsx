import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateInvoice } from "../payment/InvoiceGenerator";
import { 
  Download, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Receipt,
  Banknote,
  CreditCard
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
    invoice_number?: string;
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
}

export function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    monthlyRevenue: 0
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
          profiles!inner(full_name, email),
          bookings(
            invoice_number,
            class_sessions(
              session_date,
              classes(name, level)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
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

    setStats({
      totalRevenue,
      pendingPayments,
      verifiedPayments,
      monthlyRevenue
    });
  };

  const handleVerifyPayment = async (paymentId: string, verified: boolean) => {
    try {
      setUpdating(paymentId);
      
      const updateData: any = { admin_verified: verified };
      
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

      fetchPayments();
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

  const handleGenerateDocument = (payment: PaymentRecord, type: 'invoice' | 'receipt') => {
    if (type === 'receipt' && payment.status !== 'paid') {
      toast({
        title: "Impossible de générer le reçu",
        description: "Le paiement doit être marqué comme payé pour générer un reçu",
        variant: "destructive"
      });
      return;
    }
    
    generateInvoice(payment, type);
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

  if (loading) {
    return <div className="flex items-center justify-center h-96">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
          <p className="text-muted-foreground">
            Gérez les paiements, vérifiez les transactions et générez les documents
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
              {stats.totalRevenue} HTG
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
              {stats.monthlyRevenue} HTG
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres et Recherche</CardTitle>
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
            Liste des Paiements ({filteredPayments.length})
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
                  <TableHead>Vérification</TableHead>
                  <TableHead>Documents</TableHead>
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
                            {format(new Date(payment.bookings.class_sessions.session_date), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Paiement général</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="font-semibold">
                      {payment.amount} {payment.currency}
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
                        <Checkbox
                          checked={payment.admin_verified}
                          onCheckedChange={(checked) => 
                            handleVerifyPayment(payment.id, checked as boolean)
                          }
                          disabled={updating === payment.id}
                        />
                        <span className="text-sm">
                          {payment.admin_verified ? 'Vérifié' : 'À vérifier'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateDocument(payment, 'invoice')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Facture
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateDocument(payment, 'receipt')}
                          disabled={payment.status !== 'paid'}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Reçu
                        </Button>
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