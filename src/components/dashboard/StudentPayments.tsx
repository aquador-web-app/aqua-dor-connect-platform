import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateInvoice } from "../payment/InvoiceGenerator";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Receipt,
  Download
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  admin_verified: boolean;
  created_at: string;
  paid_at: string | null;
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
  profiles: {
    full_name: string;
    email: string;
  };
}

interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  pendingCount: number;
}

export function StudentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchPayments();
    }
  }, [profile]);

  const fetchPayments = async () => {
    if (!profile) return;

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
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      calculateSummary(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos paiements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (paymentData: Payment[]) => {
    const totalPaid = paymentData
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = paymentData.filter(p => p.status === 'pending');
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = pendingPayments.length;

    setSummary({
      totalPaid,
      totalPending,
      pendingCount
    });
  };

  const handleGenerateDocument = (payment: Payment, type: 'invoice' | 'receipt') => {
    if (type === 'receipt' && payment.status !== 'paid') {
      toast({
        title: "Impossible de générer le reçu",
        description: "Le paiement doit être confirmé pour générer un reçu",
        variant: "destructive"
      });
      return;
    }
    
    generateInvoice(payment, type);
  };

  const getStatusBadge = (status: string, adminVerified: boolean) => {
    if (status === 'paid' && adminVerified) {
      return <Badge className="bg-green-100 text-green-800">Payé & Vérifié</Badge>;
    } else if (status === 'paid') {
      return <Badge className="bg-blue-100 text-blue-800">Payé</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary">En attente</Badge>;
    } else {
      return <Badge variant="destructive">Échoué</Badge>;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'moncash': return 'MonCash';
      case 'check': return 'Chèque';
      case 'card': return 'Carte Bancaire';
      default: return method;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mes Paiements</h2>
        <p className="text-muted-foreground">
          Consultez l'historique de vos paiements et téléchargez vos documents
        </p>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Payé</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalPaid} HTG
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
              {summary.totalPending} HTG
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Paiements Dus</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {summary.pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balance Alert */}
      {summary.pendingCount > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  Paiements en attente
                </h3>
                <p className="text-sm text-yellow-700">
                  Vous avez {summary.pendingCount} paiement(s) en attente pour un total de {summary.totalPending} HTG.
                  Veuillez contacter le centre pour finaliser vos paiements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Aucun paiement trouvé
              </h3>
              <p className="text-sm text-muted-foreground">
                Vos paiements apparaîtront ici une fois que vous aurez effectué des réservations.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cours</TableHead>
                    <TableHead>Date du cours</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.bookings?.class_sessions ? (
                          <>
                            <div className="font-medium">
                              {payment.bookings.class_sessions.classes.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.bookings.class_sessions.classes.level}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Paiement général</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {payment.bookings?.class_sessions ? (
                          format(new Date(payment.bookings.class_sessions.session_date), 'dd MMMM yyyy à HH:mm', { locale: fr })
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      
                      <TableCell className="font-semibold">
                        {payment.amount} {payment.currency}
                      </TableCell>
                      
                      <TableCell>
                        {getPaymentMethodName(payment.payment_method)}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(payment.status, payment.admin_verified)}
                      </TableCell>
                      
                      <TableCell>
                        {payment.paid_at ? (
                          format(new Date(payment.paid_at), 'dd/MM/yyyy')
                        ) : (
                          format(new Date(payment.created_at), 'dd/MM/yyyy')
                        )}
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
                          {payment.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateDocument(payment, 'receipt')}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Reçu
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}