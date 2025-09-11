import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, BookOpen, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as UICalendar } from '@/components/ui/calendar';

interface StudentBooking {
  id: string;
  status: string;
  enrollment_status: string;
  total_amount: number;
  booking_date: string;
  notes?: string;
  class_sessions: {
    id: string;
    session_date: string;
    max_participants: number;
    enrolled_students: number;
    classes: {
      name: string;
      level: string;
      price: number;
      description?: string;
    };
    instructors?: {
      profiles: {
        full_name: string;
      };
    };
  };
}

export const SimpleStudentCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchStudentBookings = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          enrollment_status,
          total_amount,
          booking_date,
          notes,
          class_sessions!inner (
            id,
            session_date,
            max_participants,
            enrolled_students,
            classes!inner (
              name,
              level,
              price,
              description
            ),
            instructors (
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('user_id', profile.id)
        .gte('class_sessions.session_date', startOfMonth.toISOString())
        .lte('class_sessions.session_date', endOfMonth.toISOString())
        .order('booking_date', { ascending: false });
        
      if (error) throw error;
      setBookings(data || []);
      
    } catch (error: any) {
      console.error('Error fetching student bookings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos réservations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (sessionId: string) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          student_id: profile.id,
          class_session_id: sessionId,
          status: 'present',
          marked_by: profile.id,
          marked_by_role: 'student'
        });
        
      if (error) {
        // If already exists, update it
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('attendance')
            .update({
              status: 'present',
              marked_at: new Date().toISOString()
            })
            .eq('student_id', profile.id)
            .eq('class_session_id', sessionId);
            
          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }
      
      toast({
        title: "Présence marquée",
        description: "Votre présence a été enregistrée"
      });
      
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la présence",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (profile) {
      fetchStudentBookings();
    }
  }, [profile, selectedDate]);

  useEffect(() => {
    // Real-time sync
    const channel = supabase
      .channel('student-bookings-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, () => {
        fetchStudentBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.class_sessions.session_date), day)
    );
  };

  const getStatusBadge = (booking: StudentBooking) => {
    if (booking.enrollment_status === 'confirmed') {
      return <Badge className="bg-green-500/20 text-green-700">Confirmé</Badge>;
    }
    if (booking.enrollment_status === 'pending') {
      return <Badge variant="secondary">En attente</Badge>;
    }
    if (booking.enrollment_status === 'cancelled') {
      return <Badge variant="destructive">Annulé</Badge>;
    }
    return <Badge variant="outline">{booking.enrollment_status}</Badge>;
  };

  const dayHasEvents = (date: Date) => {
    return getBookingsForDay(date).length > 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-96 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Mon Calendrier</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UICalendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border pointer-events-auto"
              modifiers={{ hasEvents: dayHasEvents }}
              modifiersStyles={{ 
                hasEvents: { backgroundColor: 'hsl(var(--primary) / 0.2)' } 
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Sessions du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const dayBookings = getBookingsForDay(selectedDate);
              
              if (dayBookings.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune session pour cette date</p>
                  </div>
                );
              }

              return dayBookings.map((booking) => {
                const sessionDate = new Date(booking.class_sessions.session_date);
                const isToday = isSameDay(sessionDate, new Date());
                const isPast = sessionDate < new Date();
                const canMarkAttendance = isToday && booking.enrollment_status === 'confirmed';
                
                return (
                  <div
                    key={booking.id}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${booking.enrollment_status === 'confirmed' 
                        ? 'border-green-200 bg-green-50/50' 
                        : booking.enrollment_status === 'pending'
                        ? 'border-orange-200 bg-orange-50/50'
                        : 'border-gray-200 bg-gray-50/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {booking.class_sessions.classes.name}
                            {getStatusBadge(booking)}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(sessionDate, 'HH:mm')} - 
                            Instructeur: {booking.class_sessions.instructors?.profiles.full_name || 'Non assigné'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Réservé le {format(new Date(booking.booking_date), 'dd/MM/yyyy à HH:mm')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{booking.class_sessions.classes.level}</Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">${booking.total_amount}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {booking.class_sessions.enrolled_students}/{booking.class_sessions.max_participants}
                            </div>
                          </div>
                        </div>
                        
                        {canMarkAttendance && (
                          <Button
                            size="sm"
                            onClick={() => markAttendance(booking.class_sessions.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Marquer présence
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {booking.notes && (
                      <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                        <strong>Notes:</strong> {booking.notes}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};