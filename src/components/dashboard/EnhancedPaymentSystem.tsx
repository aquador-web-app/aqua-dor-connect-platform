import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Download, 
  Receipt, 
  FileText, 
  DollarSign,
  Calendar,
  User,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration_hours: number;
  description: string;
  features: string[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  verified: boolean;
  enrollment?: {
    id: string;
    class: {
      name: string;
      instructor: {
        profile: {
          full_name: string;
        };
      };
    };
  };
}

interface EnhancedPaymentSystemProps {
  isAdmin?: boolean;
  studentId?: string;
}

export const EnhancedPaymentSystem = ({ isAdmin = false, studentId }: EnhancedPaymentSystemProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      await Promise.all([fetchPayments(), fetchPricingPlans()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from("payments")
        .select(`
          *,
          enrollment:enrollments(
            id,
            class:classes(
              name,
              instructor:instructors(
                profile:profiles(full_name)
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        const targetUserId = studentId || profile?.id;
        if (targetUserId) {
          query = query.eq("user_id", targetUserId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchPricingPlans = async () => {
    try {
      // For now, use mock data until pricing_plans table is created
      const mockPlans: PricingPlan[] = [
        {
          id: "1",
          name: "Basic",
          price: 60,
          duration_hours: 1,
          description: "Single session",
          features: ["1 hour lesson", "Professional instructor", "Basic equipment"]
        },
        {
          id: "2", 
          name: "Standard",
          price: 85,
          duration_hours: 2,
          description: "Extended session",
          features: ["2 hour lesson", "Professional instructor", "All equipment", "Progress tracking"]
        },
        {
          id: "3",
          name: "Premium",
          price: 120,
          duration_hours: 3,
          description: "Intensive session",
          features: ["3 hour lesson", "Senior instructor", "All equipment", "Progress tracking", "Video analysis"]
        }
      ];
      setPricingPlans(mockPlans);
    } catch (error) {
      console.error("Error fetching pricing plans:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) {
      toast({ title: "Veuillez sélectionner un plan", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const plan = pricingPlans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("Plan introuvable");

      // Check if user is influencer for USD 0.00 pricing
      const { data: influencerData } = await supabase
        .from('influencer_accounts')
        .select('*')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      const finalPrice = influencerData ? 0.00 : plan.price;

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          student_id: profile?.id,
          class_id: null, // General subscription, not tied to specific class
          payment_status: finalPrice === 0 ? "paid" : "pending",
          notes: `Subscription to ${plan.name}${influencerData ? ' (Influencer pricing)' : ''}`
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: profile?.id,
          enrollment_id: enrollment.id,
          amount: finalPrice,
          currency: "USD",
          status: finalPrice === 0 ? "paid" : "pending",
          payment_method: finalPrice === 0 ? "influencer_credit" : "card_subscription",
          paid_at: finalPrice === 0 ? new Date().toISOString() : null
        });

      if (paymentError) throw paymentError;

      // If not free, initiate actual payment processing
      if (finalPrice > 0) {
        // Simulate payment gateway integration
        toast({ 
          title: "Redirection vers le paiement", 
          description: "Redirection vers la page de paiement sécurisée..." 
        });
        
        // In real implementation, redirect to Stripe/payment processor
        setTimeout(() => {
          toast({
            title: "Paiement simulé",
            description: "Votre abonnement a été activé avec succès",
          });
        }, 2000);
      } else {
        toast({ 
          title: "Abonnement activé", 
          description: "Votre abonnement influenceur a été activé gratuitement!" 
        });
      }
      
      setSelectedPlan("");
      fetchPayments();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({ 
        title: "Erreur lors de l'abonnement", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = (payment: Payment, type: 'bill' | 'receipt') => {
    const doc = {
      title: type === 'bill' ? 'BILL' : 'RECEIPT',
      invoiceNumber: `AQ-${format(new Date(payment.created_at), 'yyyy-MM')}-${payment.id.slice(-6).toUpperCase()}`,
      date: format(new Date(payment.created_at), 'MMM dd, yyyy'),
      dueDate: type === 'bill' ? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy') : null,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      studentName: profile?.full_name || 'Student',
      courseName: payment.enrollment?.class?.name || 'Swimming Lessons',
      instructorName: payment.enrollment?.class?.instructor?.profile?.full_name || 'Instructor'
    };

    // Create a simple HTML invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.title} - ${doc.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-height: 80px; margin-bottom: 20px; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .status { padding: 8px 16px; border-radius: 4px; font-weight: bold; }
          .status.paid { background-color: #dcfce7; color: #166534; }
          .status.pending { background-color: #fef3c7; color: #92400e; }
          .details { margin: 30px 0; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/lovable-uploads/e6bcd59a-86d7-4d53-817a-8d4910df8897.png" alt="A'qua D'or" class="logo" />
          <h1>${doc.title}</h1>
          <p>A'qua D'or Swimming School</p>
        </div>
        
        <div class="invoice-info">
          <div>
            <strong>Invoice #:</strong> ${doc.invoiceNumber}<br>
            <strong>Date:</strong> ${doc.date}<br>
            ${doc.dueDate ? `<strong>Due Date:</strong> ${doc.dueDate}<br>` : ''}
          </div>
          <div>
            <div class="status ${doc.status}">${doc.status.toUpperCase()}</div>
          </div>
        </div>
        
        <div class="details">
          <h3>Bill To:</h3>
          <p><strong>${doc.studentName}</strong></p>
          
          <h3>Course Details:</h3>
          <p>
            <strong>Course:</strong> ${doc.courseName}<br>
            <strong>Instructor:</strong> ${doc.instructorName}
          </p>
          
          <div class="total">
            <strong>Total Amount: $${doc.amount.toFixed(2)} ${doc.currency}</strong>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing A'qua D'or Swimming School!</p>
          <p>For questions, contact us at info@aquador.com</p>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing/downloading
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(invoiceHTML);
      newWindow.document.close();
    }
  };

  if (fetchingData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Plans - Only show for non-admin or when not viewing specific student */}
      {(!isAdmin || !studentId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricingPlans.map((plan) => (
                <Card key={plan.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4" onClick={() => setSelectedPlan(plan.id)}>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <div className="text-2xl font-bold text-primary my-2">
                        ${plan.price}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {plan.duration_hours} hours • {plan.description}
                      </p>
                      <div className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            ✓ {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
                    {selectedPlan && (
              <Button 
                onClick={handleSubscribe} 
                disabled={loading} 
                className="w-full bg-gradient-accent hover:shadow-glow transition-all duration-300"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement...
                  </>
                ) : "S'inscrire maintenant"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        {payment.enrollment?.class?.name && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <User className="h-4 w-4" />
                            {payment.enrollment.class.name}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={payment.status === 'paid' ? 'default' : 'secondary'}
                      className={payment.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {payment.status}
                    </Badge>
                    
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateInvoice(payment, 'bill')}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      
                      {payment.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateInvoice(payment, 'receipt')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};