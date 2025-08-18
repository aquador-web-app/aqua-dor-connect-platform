import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Settings, X, Edit } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingCancellationModal } from "./BookingCancellationModal";

interface Booking {
  id: string;
  status: string;
  booking_date: string;
  cancelled_at: string | null;
  invoice_number: string;
  total_amount: number;
  currency: string;
  class_sessions: {
    id: string;
    session_date: string;
    classes: {
      name: string;
      level: string;
      description: string;
    };
    instructors: {
      profiles: {
        full_name: string;
      };
    };
  };
}

interface StudentBookingManagerProps {
  bookings: Booking[];
  onBookingUpdated: () => void;
}

export function StudentBookingManager({ bookings, onBookingUpdated }: StudentBookingManagerProps) {
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
  }>({
    isOpen: false,
    booking: null
  });

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.class_sessions.session_date) > new Date() && 
    booking.status === 'confirmed'
  );

  const pastBookings = bookings.filter(booking => 
    new Date(booking.class_sessions.session_date) <= new Date() || 
    booking.status === 'cancelled'
  );

  const canModifyBooking = (booking: Booking) => {
    const hoursUntilSession = differenceInHours(
      new Date(booking.class_sessions.session_date), 
      new Date()
    );
    return hoursUntilSession >= 24; // 24 hour cancellation window
  };

  const handleCancelBooking = (booking: Booking) => {
    setCancelModal({ isOpen: true, booking });
  };

  const handleCancelModalClose = () => {
    setCancelModal({ isOpen: false, booking: null });
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.cancelled_at) return "destructive";
    if (booking.status === "confirmed") return "default";
    return "secondary";
  };

  const getStatusText = (booking: Booking) => {
    if (booking.cancelled_at) return "Annulé";
    if (booking.status === "confirmed") return "Confirmé";
    return booking.status;
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Réservations</CardTitle>
          <CardDescription>Gérez vos réservations de cours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réservation trouvée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Réservations à Venir ({upcomingBookings.length})
            </CardTitle>
            <CardDescription>
              Vous pouvez annuler ou modifier vos réservations jusqu'à 24h avant le cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{booking.class_sessions.classes.name}</h3>
                          <Badge variant="outline">{booking.class_sessions.classes.level}</Badge>
                          <Badge variant={getStatusColor(booking)}>
                            {getStatusText(booking)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(booking.class_sessions.session_date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(booking.class_sessions.session_date), 'HH:mm')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{booking.class_sessions.instructors.profiles.full_name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Facture: <span className="font-mono">{booking.invoice_number}</span>
                          </div>
                          <div className="font-semibold">
                            ${booking.total_amount} {booking.currency}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {canModifyBooking(booking) ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBooking(booking)}
                              className="flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center">
                            <Settings className="h-4 w-4 mx-auto mb-1" />
                            Modification non autorisée
                            <br />
                            (moins de 24h)
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des Réservations ({pastBookings.length})</CardTitle>
            <CardDescription>Vos réservations passées et annulées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="border rounded-lg p-3 opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{booking.class_sessions.classes.name}</span>
                        <Badge variant={getStatusColor(booking)} className="text-xs">
                          {getStatusText(booking)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.class_sessions.session_date), 'dd/MM/yyyy HH:mm')} • 
                        {booking.class_sessions.instructors.profiles.full_name}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      ${booking.total_amount} {booking.currency}
                    </div>
                  </div>
                </div>
              ))}
              {pastBookings.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... et {pastBookings.length - 5} autres réservations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Modal */}
      <BookingCancellationModal
        isOpen={cancelModal.isOpen}
        onClose={handleCancelModalClose}
        booking={cancelModal.booking}
        onSuccess={() => {
          onBookingUpdated();
          handleCancelModalClose();
        }}
      />
    </div>
  );
}