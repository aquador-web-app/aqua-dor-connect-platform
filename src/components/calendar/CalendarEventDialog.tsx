import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useUniversalCalendar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  userRole: 'visitor' | 'student' | 'admin' | 'instructor';
  isOpen: boolean;
  onClose: () => void;
  onReserve: (sessionId: string, notes?: string) => Promise<any>;
  onMarkAttendance: (sessionId: string, isPresent: boolean) => Promise<void>;
  onRefresh: () => void;
}

export function CalendarEventDialog({
  event,
  userRole,
  isOpen,
  onClose,
  onReserve,
  onMarkAttendance,
  onRefresh
}: CalendarEventDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!event) return null;

  const handleReserve = async () => {
    if (!event.session_id) return;
    
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez vous connecter pour réserver un cours",
        variant: "destructive"
      });
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }

    setLoading(true);
    try {
      await onReserve(event.session_id, notes);
      onClose();
      onRefresh();
    } catch (error) {
      console.error('Reservation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (isPresent: boolean) => {
    if (!event.session_id) return;
    
    setLoading(true);
    try {
      await onMarkAttendance(event.session_id, isPresent);
      onClose();
      onRefresh();
    } catch (error) {
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (event.status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Confirmé</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="outline">{event.status}</Badge>;
    }
  };

  const canReserve = () => {
    return userRole !== 'visitor' && 
           event.can_reserve && 
           !event.is_enrolled && 
           event.available_seats && 
           event.available_seats > 0;
  };

  const canMarkAttendance = () => {
    return (userRole === 'student' || userRole === 'admin') && 
           event.is_enrolled && 
           event.event_type === 'reservation';
  };

  const shouldShowReserveButton = () => {
    if (userRole === 'visitor') {
      return event.event_type === 'class' && event.available_seats && event.available_seats > 0;
    }
    return canReserve();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold pr-6">
                {event.title}
              </DialogTitle>
              {event.class_name && event.title !== event.class_name && (
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {event.class_name}
                </DialogDescription>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(event.start_date), 'EEEE dd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            {event.start_time && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.start_time}
                  {event.end_time && ` - ${event.end_time}`}
                </span>
              </div>
            )}

            {event.instructor_name && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Instructeur: {event.instructor_name}</span>
              </div>
            )}

            {event.level && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Niveau: {event.level}</span>
              </div>
            )}

            {(event.capacity !== undefined || event.available_seats !== undefined) && (
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.enrolled}/{event.capacity} inscrits
                  {event.available_seats !== undefined && (
                    <span className="ml-2 text-muted-foreground">
                      ({event.available_seats} places disponibles)
                    </span>
                  )}
                </span>
              </div>
            )}

            {event.price && (
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${event.price}</span>
              </div>
            )}
          </div>

          {event.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </>
          )}

          {/* Notes for reservation */}
          {shouldShowReserveButton() && !event.is_enrolled && (
            <>
              <Separator />
              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ajoutez des notes pour votre réservation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* Available Seats Warning */}
          {event.available_seats === 0 && event.event_type === 'class' && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Session complète</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>

          {/* Mark Attendance Buttons */}
          {canMarkAttendance() && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleMarkAttendance(false)}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Absent
              </Button>
              <Button
                onClick={() => handleMarkAttendance(true)}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Présent
              </Button>
            </>
          )}

          {/* Reserve Button */}
          {shouldShowReserveButton() && !event.is_enrolled && (
            <Button
              onClick={handleReserve}
              disabled={loading || (event.available_seats !== undefined && event.available_seats === 0)}
            >
              {loading ? 'Réservation...' : 
               userRole === 'visitor' ? 'Réserver (Connexion requise)' : 'Réserver'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}