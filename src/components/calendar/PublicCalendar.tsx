import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Clock, DollarSign, LogIn } from 'lucide-react';
import { usePublicCalendar, PublicCalendarSession } from '@/hooks/usePublicCalendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AttendanceButton } from './AttendanceButton';

interface PublicCalendarProps {
  onSessionSelect?: (session: PublicCalendarSession) => void;
}

export const PublicCalendar: React.FC<PublicCalendarProps> = ({ onSessionSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { sessions, loading, error, fetchPublicSessions } = usePublicCalendar({
    start: monthStart,
    end: monthEnd
  });

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), day)
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

  const handleSessionAction = (session: PublicCalendarSession) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  const triggerCalendarSync = () => {
    // Trigger global sync event when reservations are made
    window.dispatchEvent(new CustomEvent('calendarSync', { 
      detail: { type: 'reservation_created', source: 'public_calendar' } 
    }));
  };

  const getAvailabilityBadge = (session: PublicCalendarSession) => {
    const available = session.max_participants - session.enrolled_students;
    
    if (available <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Complet
        </Badge>
      );
    }
    
    if (available <= 2) {
      return (
        <Badge variant="secondary" className="text-xs border-orange-500 text-orange-700">
          {available} place{available > 1 ? 's' : ''}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-xs border-green-500 text-green-700">
        {available} places
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-destructive">
          <p>Erreur de chargement du calendrier</p>
          <Button onClick={fetchPublicSessions} className="mt-2">
            Réessayer
          </Button>
        </div>
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
                      {daySessions.map(session => (
                        <div
                          key={session.id}
                          className="p-2 bg-muted rounded text-xs space-y-2"
                        >
                          <div className="font-medium truncate">
                            {session.class_name}
                          </div>
                          
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.session_date), 'HH:mm')}
                          </div>
                          
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {session.enrolled_students}/{session.max_participants}
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            ${session.class_price}
                          </div>

                          <div className="flex items-center justify-between">
                            {getAvailabilityBadge(session)}
                            
                            <div className="flex items-center gap-1">
                              {user && (
                                <AttendanceButton 
                                  session={session} 
                                  variant="ghost" 
                                  size="sm" 
                                />
                              )}
                              
                              {session.enrolled_students < session.max_participants && (
                                <Button
                                  size="sm"
                                  variant={user ? "default" : "outline"}
                                  className="text-xs h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSessionAction(session);
                                  }}
                                >
                                  {user ? (
                                    'Réserver'
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <LogIn className="h-3 w-3" />
                                      Se connecter
                                    </div>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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