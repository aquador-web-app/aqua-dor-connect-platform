import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Clock, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Calendar,
  Package,
  FileText,
  DollarSign
} from "lucide-react";

interface PendingReservation {
  id: string;
  class_session_id: string;
  student_id: string;
  status: string;
  reservation_notes: string | null;
  created_at: string;
  session_packages: {
    package_type: string;
    total_sessions: number;
    used_sessions: number;
    price_per_session: number;
  };
  profiles: {
    full_name: string;
    email: string;
  };
  class_sessions: {
    session_date: string;
    max_participants: number;
    enrolled_students: number;
    classes: {
      name: string;
      level: string;
      price: number;
    };
    instructors?: {
      profiles: {
        full_name: string;
      };
    };
  };
}

export function PendingReservationsManager() {
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedReservation, setSelectedReservation] = useState<PendingReservation | null>(null);
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReservations();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('admin_reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_reservations'
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('session_reservations')
        .select(`
          *,
          session_packages (
            package_type,
            total_sessions,
            used_sessions,
            price_per_session
          ),
          profiles!session_reservations_student_id_fkey (
            full_name,
            email
          ),
          class_sessions!inner (
            session_date,
            max_participants,
            enrolled_students,
            classes!inner (
              name,
              level,
              price
            ),
            instructors (
              profiles (
                full_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectedReservation || !profile) return;

    try {
      setConfirming(true);

      const { data, error } = await supabase.rpc('confirm_reservation_payment', {
        p_reservation_id: selectedReservation.id,
        p_admin_profile_id: profile.id,
        p_confirmation_notes: confirmationNotes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Confirmation failed');
      }

      toast({
        title: "✅ Réservation Confirmée!",
        description: (
          <div className="space-y-1">
            <div><strong>Étudiant:</strong> {selectedReservation.profiles.full_name}</div>
            <div><strong>Cours:</strong> {selectedReservation.class_sessions.classes.name}</div>
            <div><strong>Statut:</strong> <span className="text-green-600">Confirmé</span></div>
            <div className="text-sm text-muted-foreground">
              Reçu généré automatiquement
            </div>
          </div>
        ),
      });

      setDialogOpen(false);
      setSelectedReservation(null);
      setConfirmationNotes("");
      fetchReservations();
    } catch (error: any) {
      console.error('Error confirming reservation:', error);
      toast({
        title: "Erreur de Confirmation",
        description: error.message || "Impossible de confirmer la réservation",
        variant: "destructive"
      });
    } finally {
      setConfirming(false);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      reservation.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.profiles.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class_sessions.classes.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPackageTypeBadge = (packageType: string) => {
    switch (packageType) {
      case 'single':
        return <Badge variant="outline">Session Unique</Badge>;
      case 'monthly':
        return <Badge className="bg-blue-100 text-blue-800">Pack Mensuel</Badge>;
      case 'unlimited':
        return <Badge className="bg-purple-100 text-purple-800">Pack Illimité</Badge>;
      default:
        return <Badge variant="outline">{packageType}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Réservations en Attente</h2>
          <p className="text-muted-foreground">
            Confirmez les paiements et activez les réservations des étudiants
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">En Attente</span>
              <Badge variant="secondary">
                {filteredReservations.filter(r => r.status === 'pending').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Confirmées</span>
              <Badge className="bg-green-100 text-green-800">
                {filteredReservations.filter(r => r.status === 'confirmed').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Revenus Potentiels</span>
              <Badge variant="outline">
                ${filteredReservations
                  .filter(r => r.status === 'pending')
                  .reduce((sum, r) => sum + r.session_packages.price_per_session, 0)}
              </Badge>
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="confirmed">Confirmés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Réservations ({filteredReservations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date Demande</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reservation.profiles.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {reservation.profiles.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {reservation.class_sessions.classes.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reservation.class_sessions.session_date), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {reservation.class_sessions.enrolled_students}/{reservation.class_sessions.max_participants}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {getPackageTypeBadge(reservation.session_packages.package_type)}
                        <div className="text-xs text-muted-foreground">
                          {reservation.session_packages.used_sessions}/{reservation.session_packages.total_sessions} utilisées
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="font-semibold">
                      ${reservation.session_packages.price_per_session}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(reservation.status)}
                    </TableCell>
                    
                    <TableCell>
                      {format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    
                    <TableCell>
                      {reservation.status === 'pending' && (
                        <Dialog open={dialogOpen && selectedReservation?.id === reservation.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (open) {
                            setSelectedReservation(reservation);
                          } else {
                            setSelectedReservation(null);
                            setConfirmationNotes("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmer la Réservation</DialogTitle>
                              <DialogDescription>
                                Confirmez le paiement et activez la réservation de l'étudiant
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedReservation && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Étudiant:</span>
                                    <div className="font-medium">{selectedReservation.profiles.full_name}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Cours:</span>
                                    <div className="font-medium">{selectedReservation.class_sessions.classes.name}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Prix:</span>
                                    <div className="font-medium">${selectedReservation.session_packages.price_per_session}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <div className="font-medium">
                                      {format(new Date(selectedReservation.class_sessions.session_date), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                  </div>
                                </div>
                                
                                {selectedReservation.reservation_notes && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Notes de l'étudiant:</span>
                                    <div className="text-sm bg-muted p-2 rounded">
                                      {selectedReservation.reservation_notes}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Notes de confirmation (optionnel)</label>
                                  <Textarea
                                    placeholder="Ajoutez des notes pour cette confirmation..."
                                    value={confirmationNotes}
                                    onChange={(e) => setConfirmationNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>
                                
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    Annuler
                                  </Button>
                                  <Button 
                                    onClick={handleConfirmReservation} 
                                    disabled={confirming}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {confirming ? 'Confirmation...' : 'Confirmer et Générer Reçu'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {reservation.status === 'confirmed' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmé
                        </Badge>
                      )}
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