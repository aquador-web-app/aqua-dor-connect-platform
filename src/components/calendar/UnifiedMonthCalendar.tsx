import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock } from 'lucide-react';
import { useUnifiedCalendar, CalendarSession } from '@/hooks/useUnifiedCalendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UnifiedMonthCalendarProps {
  onReserve?: (session: CalendarSession) => void;
  showReserveButtons?: boolean;
}

export const UnifiedMonthCalendar: React.FC<UnifiedMonthCalendarProps> = ({
  onReserve,
  showReserveButtons = true
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { sessions, enrollments, loading, createEnrollment } = useUnifiedCalendar({
    start: monthStart,
    end: monthEnd
  });

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), day)
    );
  };

  const getEnrollmentForSession = (sessionId: string) => {
    return enrollments.find(enrollment => 
      enrollment.class_sessions?.id === sessionId
    );
  };

  const toggleDayExpansion = (dayKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey);
    } else {
      newExpanded.add(dayKey);
    }
    setExpandedDays(newExpanded);
  };

  const handleReserve = async (session: CalendarSession) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (onReserve) {
      onReserve(session);
    } else {
      try {
        await createEnrollment(session.id);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const getStatusBadge = (session: CalendarSession, enrollment: any) => {
    if (enrollment) {
      switch (enrollment.status) {
        case 'active':
          return <Badge className="bg-green-600 text-white">Inscrit</Badge>;
        case 'pending':
          return <Badge variant="secondary">En attente</Badge>;
        case 'cancelled':
          return <Badge variant="destructive">Annulé</Badge>;
        default:
          return null;
      }
    }

    if (session.seats_taken >= session.seats_available) {
      return <Badge variant="outline" className="text-red-600 border-red-600">Complet</Badge>;
    }

    return <Badge variant="outline" className="text-green-600 border-green-600">
      {session.seats_available - session.seats_taken} places
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Days */}
        {monthDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const daySessions = getSessionsForDay(day);
          const isExpanded = expandedDays.has(dayKey);
          const hasEvents = daySessions.length > 0;

          return (
            <Card key={dayKey} className={`min-h-[100px] ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}>
              <CardContent className="p-2">
                <Collapsible open={isExpanded} onOpenChange={() => hasEvents && toggleDayExpansion(dayKey)}>
                  <CollapsibleTrigger asChild>
                    <div className={`cursor-pointer ${hasEvents ? 'hover:bg-muted' : ''} rounded p-1`}>
                      <div className="text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                      
                      {/* Event indicators */}
                      {daySessions.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {isExpanded ? null : (
                            <div className="flex flex-wrap gap-1">
                              {daySessions.slice(0, 2).map(session => (
                                <div
                                  key={session.id}
                                  className="w-2 h-2 bg-primary rounded-full"
                                />
                              ))}
                              {daySessions.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{daySessions.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {daySessions.map(session => {
                        const enrollment = getEnrollmentForSession(session.id);
                        
                        return (
                          <div
                            key={session.id}
                            className="p-2 bg-muted rounded text-xs space-y-1"
                          >
                            <div className="font-medium truncate">
                              {session.class?.name}
                            </div>
                            
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.session_date), 'HH:mm')}
                            </div>
                            
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {session.seats_taken}/{session.seats_available}
                            </div>

                            <div className="flex items-center justify-between">
                              {getStatusBadge(session, enrollment)}
                              
                              {showReserveButtons && !enrollment && session.seats_taken < session.seats_available && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReserve(session);
                                  }}
                                >
                                  Réserver
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};