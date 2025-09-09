import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SessionPackagePurchase } from "@/components/packages/SessionPackagePurchase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Users, Package, AlertTriangle } from "lucide-react";
import { PublicCalendarSession } from "@/hooks/usePublicCalendar";

interface SessionPackage {
  id: string;
  package_type: string;
  total_sessions: number;
  used_sessions: number;
  price_per_session: number;
  status: string;
  expires_at: string | null;
}

interface SessionReservationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  session: PublicCalendarSession | null;
  onSuccess: () => void;
}

export function SessionReservationFlow({ isOpen, onClose, session, onSuccess }: SessionReservationFlowProps) {
  const [step, setStep] = useState<'packages' | 'purchase' | 'reserve'>('packages');
  const [userPackages, setUserPackages] = useState<SessionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [reservationNotes, setReservationNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(true);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && profile) {
      fetchUserPackages();
    }
  }, [isOpen, profile]);

  const fetchUserPackages = async () => {
    if (!profile) return;

    try {
      setPackagesLoading(true);
      
      const { data, error } = await supabase
        .from('session_packages')
        .select('*')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter packages that have available sessions
      const availablePackages = (data || []).filter(pkg => 
        pkg.used_sessions < pkg.total_sessions &&
        (!pkg.expires_at || new Date(pkg.expires_at) > new Date())
      );

      setUserPackages(availablePackages);
      
      if (availablePackages.length === 0) {
        setStep('purchase');
      } else if (availablePackages.length === 1) {
        setSelectedPackageId(availablePackages[0].id);
        setStep('reserve');
      } else {
        setStep('packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos packs de sessions",
        variant: "destructive"
      });
    } finally {
      setPackagesLoading(false);
    }
  };

  const handleReserveSession = async () => {
    if (!session || !selectedPackageId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('reserve_session_from_package', {
        p_package_id: selectedPackageId,
        p_class_session_id: session.id,
        p_notes: reservationNotes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Reservation failed');
      }

      toast({
        title: "📅 Réservation Soumise!",
        description: (
          <div className="space-y-2">
            <div><strong>Cours:</strong> {session.class_name}</div>
            <div><strong>Date:</strong> {format(new Date(session.session_date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</div>
            <div><strong>Prix:</strong> ${session.class_price}</div>
            <div><strong>Statut:</strong> <span className="text-orange-600">En attente de confirmation admin</span></div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              Votre session sera confirmée après validation par un administrateur.
            </div>
          </div>
        ),
      });

      onSuccess();
      onClose();
      resetState();
    } catch (error: any) {
      console.error('Error reserving session:', error);
      toast({
        title: "Erreur de Réservation",
        description: error.message || "Impossible de réserver la session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePackagePurchased = (packageId: string) => {
    setSelectedPackageId(packageId);
    setStep('reserve');
    fetchUserPackages(); // Refresh packages
  };

  const resetState = () => {
    setStep('packages');
    setSelectedPackageId("");
    setReservationNotes("");
  };

  const getPackageTypeName = (type: string) => {
    switch (type) {
      case 'single': return 'Session Unique';
      case 'monthly': return 'Pack Mensuel';
      case 'unlimited': return 'Pack Illimité';
      default: return type;
    }
  };

  const getPackageBadge = (pkg: SessionPackage) => {
    const remaining = pkg.total_sessions - pkg.used_sessions;
    const isExpiring = pkg.expires_at && new Date(pkg.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    return (
      <div className="flex gap-2">
        <Badge variant="outline">
          {remaining} session{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
        </Badge>
        {isExpiring && (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expire bientôt
          </Badge>
        )}
      </div>
    );
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'purchase' ? 'Acheter un Pack de Sessions' :
             step === 'packages' ? 'Choisir un Pack' :
             'Finaliser la Réservation'}
          </DialogTitle>
        </DialogHeader>

        {step === 'purchase' && (
          <SessionPackagePurchase
            onSuccess={handlePackagePurchased}
            onCancel={onClose}
          />
        )}

        {step === 'packages' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Choisissez un Pack pour Réserver</h3>
              <p className="text-muted-foreground">
                Sélectionnez le pack que vous souhaitez utiliser pour cette réservation
              </p>
            </div>

            {packagesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {userPackages.map((pkg) => (
                  <Card 
                    key={pkg.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedPackageId === pkg.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border'
                    }`}
                    onClick={() => setSelectedPackageId(pkg.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Package className="h-8 w-8 text-primary" />
                          <div>
                            <div className="font-semibold">{getPackageTypeName(pkg.package_type)}</div>
                            <div className="text-sm text-muted-foreground">
                              ${pkg.price_per_session} par session
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getPackageBadge(pkg)}
                          {pkg.expires_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Expire le {format(new Date(pkg.expires_at), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card className="border-dashed border-2 cursor-pointer hover:bg-muted/50" onClick={() => setStep('purchase')}>
                  <CardContent className="p-4 text-center">
                    <div className="text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div>Acheter un nouveau pack</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                onClick={() => setStep('reserve')} 
                disabled={!selectedPackageId}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 'reserve' && (
          <div className="space-y-6">
            {/* Session Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Détails de la Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{session.class_name}</h3>
                  <Badge variant="outline">{session.class_level}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <div className="font-medium">
                      {format(new Date(session.session_date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heure:</span>
                    <div className="font-medium">
                      {format(new Date(session.session_date), 'HH:mm')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Instructeur:</span>
                    <div className="font-medium">
                      {session.instructor_name || 'Non assigné'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Places:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {session.enrolled_students}/{session.max_participants}
                    </div>
                  </div>
                </div>
                
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    ${session.class_price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Sera débité de votre pack
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes de Réservation (optionnel)</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="notes">Informations supplémentaires</Label>
                <Textarea
                  id="notes"
                  placeholder="Ajoutez des notes pour votre réservation..."
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={() => setStep('packages')}>
                Retour
              </Button>
              <Button 
                onClick={handleReserveSession} 
                disabled={loading}
                className="min-w-[150px]"
              >
                {loading ? 'Réservation...' : 'Réserver la Session'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}