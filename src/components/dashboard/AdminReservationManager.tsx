import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, User, DollarSign, Eye, Download, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminReservation {
  id: string;
  status: string;
  booking_date: string;
  total_amount: number;
  currency: string;
  invoice_number: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  modified_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  class_sessions: {
    session_date: string;
    classes: {
      name: string;
      level: string;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    };
  };
}

export function AdminReservationManager() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<AdminReservation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReservations();
    setupRealtimeSubscription();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_date,
          total_amount,
          currency,
          invoice_number,
          cancelled_at,
          cancellation_reason,
          modified_at,
          profiles!bookings_user_id_fkey (
            full_name,
            email
          ),
          class_sessions (
            session_date,
            classes (
              name,
              level
            ),
            instructors (
              profiles (
                full_name
              )
            )
          )
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-reservations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleViewReservation = (reservation: AdminReservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Numéro de Facture',
      'Client',
      'Email',
      'Cours',
      'Niveau',
      'Instructeur',
      'Date du Cours',
      'Montant',
      'Devise',
      'Statut',
      'Date de Réservation'
    ];

    const csvData = filteredReservations.map(reservation => [
      reservation.invoice_number || 'N/A',
      reservation.profiles?.full_name || 'N/A',
      reservation.profiles?.email || 'N/A',
      reservation.class_sessions?.classes?.name || 'N/A',
      reservation.class_sessions?.classes?.level || 'N/A',
      reservation.class_sessions?.instructors?.profiles?.full_name || 'N/A',
      format(new Date(reservation.class_sessions?.session_date || ''), 'dd/MM/yyyy HH:mm'),
      reservation.total_amount?.toString() || '0',
      reservation.currency || 'USD',
      getStatusText(reservation.status),
      format(new Date(reservation.booking_date), 'dd/MM/yyyy HH:mm')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'cancelled': return 'Annulé';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const getStatusVariant = (reservation: AdminReservation): "default" | "secondary" | "destructive" | "outline" => {
    if (reservation.cancelled_at) return "destructive";
    if (reservation.modified_at) return "secondary";
    if (reservation.status === 'confirmed') return "default";
    return "outline";
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = searchTerm === "" || 
      reservation.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class_sessions?.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    
    const matchesPayment = paymentFilter === "all" || 
      (paymentFilter === "paid" && reservation.total_amount > 0) ||
      (paymentFilter === "unpaid" && (!reservation.total_amount || reservation.total_amount === 0));

    return matchesSearch && matchesStatus && matchesPayment;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Réservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestion des Réservations
          </CardTitle>
          <CardDescription>
            Suivez toutes les réservations de cours en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, cours..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full md:w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="unpaid">Non payé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Instructeur</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucune réservation trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.profiles?.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{reservation.profiles?.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.class_sessions?.classes?.name || 'N/A'}</div>
                          <Badge variant="outline" className="text-xs">
                            {reservation.class_sessions?.classes?.level || 'N/A'}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {reservation.class_sessions?.instructors?.profiles?.full_name || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {reservation.class_sessions?.session_date ? 
                                format(new Date(reservation.class_sessions.session_date), 'dd MMM yyyy', { locale: fr }) 
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {reservation.class_sessions?.session_date ? 
                                format(new Date(reservation.class_sessions.session_date), 'HH:mm') 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {reservation.total_amount || 0} {reservation.currency || 'USD'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={getStatusVariant(reservation)}>
                          {getStatusText(reservation.status)}
                          {reservation.cancelled_at && ' (Annulé)'}
                          {reservation.modified_at && ' (Modifié)'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-mono">
                          {reservation.invoice_number || 'N/A'}
                        </span>
                      </TableCell>
                      
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-8 w-8 p-0"
                             onClick={() => handleViewReservation(reservation)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            {filteredReservations.length} réservation(s) trouvée(s)
          </div>
        </CardContent>
      </Card>

      {/* Reservation Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la Réservation</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">ÉTUDIANT</h3>
                  <p className="font-medium">{selectedReservation.profiles?.full_name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{selectedReservation.profiles?.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">STATUT</h3>
                  <Badge variant={getStatusVariant(selectedReservation)}>
                    {getStatusText(selectedReservation.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">COURS</h3>
                  <p className="font-medium">{selectedReservation.class_sessions?.classes?.name || 'N/A'}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {selectedReservation.class_sessions?.classes?.level || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">INSTRUCTEUR</h3>
                  <p className="font-medium">{selectedReservation.class_sessions?.instructors?.profiles?.full_name || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">DATE ET HEURE</h3>
                  <p className="font-medium">
                    {selectedReservation.class_sessions?.session_date ? 
                      format(new Date(selectedReservation.class_sessions.session_date), 'dd MMMM yyyy à HH:mm', { locale: fr }) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">MONTANT</h3>
                  <p className="font-medium">
                    {selectedReservation.total_amount || 0} {selectedReservation.currency || 'USD'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">NUMÉRO DE FACTURE</h3>
                <p className="font-mono text-sm">{selectedReservation.invoice_number || 'N/A'}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">DATE DE RÉSERVATION</h3>
                <p className="font-medium">
                  {format(new Date(selectedReservation.booking_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>

              {selectedReservation.cancellation_reason && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">RAISON D'ANNULATION</h3>
                  <p className="text-sm">{selectedReservation.cancellation_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}