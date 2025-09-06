import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Download,
  Calendar
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  amount_usd?: number;
  currency: string;
  status: string;
  payment_method: string;
  admin_verified: boolean;
  created_at: string;
  paid_at: string | null;
  approved_at: string | null;
  booking_id?: string;
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

interface Booking {
  id: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  created_at: string;
  status: string;
  class_sessions?: {
    session_date: string;
    classes: {
      name: string;
      price: number;
    };
  };
}

interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  pendingCount: number;
  overdueCount: number;
}

export function StudentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    pendingCount: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchPaymentData();
    }
  }, [profile]);

  const fetchPaymentData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          profiles!payments_user_id_fkey(full_name, email),
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

      if (paymentsError) throw paymentsError;

      // Fetch bookings to show bills/invoices
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          invoice_number,
          total_amount,
          currency,
          created_at,
          status,
          class_sessions(
            session_date,
            classes(name, price)
          )
        `)
        .eq('user_id', profile.id)
        .not('invoice_number', 'is', null)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Filter out any payments with missing profile data
      const validPayments = (paymentsData || []).filter(payment => 
        payment.profiles && 
        typeof payment.profiles === 'object' && 
        !('error' in payment.profiles)
      );

      setPayments(validPayments);
      setBookings(bookingsData || []);
      calculateSummary(validPayments, bookingsData || []);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos paiements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (paymentData: Payment[], bookingData: Booking[]) => {
    // Calculate paid payments
    const paidPayments = paymentData.filter(p => 
      p.status === 'paid' || p.status === 'approved'
    );
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount_usd || p.amount), 0);

    // Calculate pending - payments with status pending + bookings without payments
    const pendingPayments = paymentData.filter(p => p.status === 'pending');
    const pendingBookings = bookingData.filter(booking => 
      !paymentData.some(payment => 
        payment.booking_id === booking.id && 
        ['approved', 'paid'].includes(payment.status)
      )
    );
    
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount_usd || p.amount), 0) +
                        pendingBookings.reduce((sum, b) => sum + b.total_amount, 0);
    const pendingCount = pendingPayments.length + pendingBookings.length;

    // Calculate overdue - bills older than 7 days without payment
    const overduePayments = paymentData.filter(p => p.status === 'overdue');
    const overdueBookings = bookingData.filter(booking => {
      const hasPayment = paymentData.some(payment => payment.booking_id === booking.id);
      const isOld = new Date(booking.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return !hasPayment && isOld;
    });
    
    const totalOverdue = overduePayments.reduce((sum, p) => sum + (p.amount_usd || p.amount), 0) +
                        overdueBookings.reduce((sum, b) => sum + b.total_amount, 0);
    const overdueCount = overduePayments.length + overdueBookings.length;

    setSummary({
      totalPaid,
      totalPending,
      totalOverdue,
      pendingCount,
      overdueCount
    });
  };

  const handleGenerateDocument = (payment: Payment, type: 'invoice' | 'receipt') => {
    if (type === 'receipt' && payment.status !== 'paid' && payment.status !== 'approved') {
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
    if ((status === 'paid' || status === 'approved') && adminVerified) {
      return <Badge className="bg-green-100 text-green-800">Payé & Vérifié</Badge>;
    } else if (status === 'paid' || status === 'approved') {
      return <Badge className="bg-blue-100 text-blue-800">Payé</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary">En attente</Badge>;
    } else if (status === 'overdue') {
      return <Badge variant="destructive">En retard</Badge>;
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

  const renderBookingItem = (booking: Booking) => (
    <div key={booking.id} className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4" />
            <span className="font-medium">
              {booking.class_sessions?.classes?.name || 'Cours'}
            </span>
          </div>
          {booking.class_sessions && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span>Montant: ${booking.total_amount} {booking.currency}</span>
            <span className="text-xs text-muted-foreground">
              Facture: {booking.invoice_number}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Créé le {format(new Date(booking.created_at), 'dd/MM/yyyy', { locale: fr })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">En attente de paiement</Badge>
          <Button size="sm" variant="outline">
            <Download className="h-3 w-3 mr-1" />
            Facture
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPaymentItem = (payment: Payment) => (
    <div key={payment.id} className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4" />
            <span className="font-medium">
              {payment.bookings?.class_sessions?.classes?.name || 'Paiement général'}
            </span>
          </div>
          {payment.bookings?.class_sessions && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(payment.bookings.class_sessions.session_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span>Montant: ${payment.amount_usd || payment.amount} {payment.currency}</span>
            <Badge variant="outline" className="text-xs">
              {getPaymentMethodName(payment.payment_method)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Créé le {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: fr })}
            {payment.paid_at && (
              <> • Payé le {format(new Date(payment.paid_at), 'dd/MM/yyyy', { locale: fr })}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(payment.status, payment.admin_verified)}
          {(payment.status === 'paid' || payment.status === 'approved') && (
            <Button size="sm" variant="outline" onClick={() => handleGenerateDocument(payment, 'receipt')}>
              <Download className="h-3 w-3 mr-1" />
              Reçu
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get data for each section
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const pendingBookings = bookings.filter(booking => 
    !payments.some(payment => 
      payment.booking_id === booking.id && 
      ['approved', 'paid'].includes(payment.status)
    )
  );

  const overduePayments = payments.filter(p => p.status === 'overdue');
  const overdueBookings = bookings.filter(booking => {
    const hasPayment = payments.some(payment => payment.booking_id === booking.id);
    const isOld = new Date(booking.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return !hasPayment && isOld;
  });

  const paidPayments = payments.filter(p => p.status === 'paid' || p.status === 'approved');

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
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">En Attente</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: ${summary.totalPending.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Paiements Dus</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {summary.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: ${summary.totalOverdue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Payé</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalPaid.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balance Alert */}
      {(summary.pendingCount > 0 || summary.overdueCount > 0) && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  Paiements en attente
                </h3>
                <p className="text-sm text-yellow-700">
                  {summary.pendingCount > 0 && `${summary.pendingCount} paiement(s) en attente ($${summary.totalPending.toFixed(2)})`}
                  {summary.pendingCount > 0 && summary.overdueCount > 0 && ' et '}
                  {summary.overdueCount > 0 && `${summary.overdueCount} paiement(s) en retard ($${summary.totalOverdue.toFixed(2)})`}
                  . Veuillez contacter le centre pour finaliser vos paiements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Attente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              En Attente
            </CardTitle>
            <CardDescription>
              Paiements et factures en cours de traitement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.map(renderPaymentItem)}
            {pendingBookings.map(renderBookingItem)}
            
            {pendingPayments.length === 0 && pendingBookings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun paiement en attente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paiements Dus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Paiements Dus
            </CardTitle>
            <CardDescription>
              Paiements en retard nécessitant une attention immédiate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overduePayments.map(renderPaymentItem)}
            {overdueBookings.map(renderBookingItem)}
            
            {overduePayments.length === 0 && overdueBookings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-600" />
                <p>Aucun paiement en retard</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique des Paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Historique des Paiements
          </CardTitle>
          <CardDescription>
            Tous vos paiements confirmés et approuvés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paidPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement dans l'historique</p>
            </div>
          ) : (
            paidPayments.map(renderPaymentItem)
          )}
        </CardContent>
      </Card>
    </div>
  );
}