import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, Users, DollarSign } from 'lucide-react';
import { useCalendarSessions, CalendarSession } from '@/hooks/useCalendarSessions';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface SimpleCalendarProps {
  onSessionSelect?: (session: CalendarSession) => void;
  enableReservations?: boolean;
  showAttendance?: boolean;
}

export const SimpleCalendar: React.FC<SimpleCalendarProps> = ({ 
  onSessionSelect, 
  enableReservations = true,
  showAttendance = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { user } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { sessions, loading, error } = useCalendarSessions({
    dateRange: { start: monthStart, end: monthEnd },
    enableRealtime: true
  });

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), day)
    );
  };

  const getDayOfWeekName = (dayIndex: number) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[dayIndex];
  };

  const getAvailabilityColor = (session: CalendarSession) => {
    const available = session.max_participants - session.enrolled_students;
    if (available <= 0) return 'bg-destructive/20 text-destructive';
    if (available <= 2) return 'bg-orange-500/20 text-orange-700';
    return 'bg-green-500/20 text-green-700';
  };

  const handleSessionClick = (session: CalendarSession) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  const isPoolClosed = (date: Date) => {
    return getDay(date) === 0; // Sunday
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p>Erreur de chargement du calendrier</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
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
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => (
                <div key={dayIndex} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {getDayOfWeekName(dayIndex)}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map(day => {
                const daySessions = getSessionsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isClosed = isPoolClosed(day);
                
                return (
                  <div
                    key={day.toString()}
                    className={`
                      min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                      ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                      ${isToday ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}
                      ${isSelected ? 'bg-accent/20 border-accent' : ''}
                      ${isClosed ? 'bg-red-50 border-red-200' : ''}
                    `}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    
                    {isClosed ? (
                      <div className="text-xs text-red-600 font-medium">Fermé</div>
                    ) : (
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map(session => (
                          <div
                            key={session.id}
                            className={`
                              text-xs p-1 rounded cursor-pointer transition-colors
                              ${getAvailabilityColor(session)}
                              hover:opacity-80
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionClick(session);
                            }}
                          >
                            <div className="font-medium truncate">
                              {session.classes.name}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.session_date), 'HH:mm')}
                            </div>
                          </div>
                        ))}
                        
                        {daySessions.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySessions.length - 3} autres
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Selected day details */}
            {selectedDay && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(selectedDay, 'dd MMMM yyyy', { locale: fr })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const daySessions = getSessionsForDay(selectedDay);
                    
                    if (isPoolClosed(selectedDay)) {
                      return (
                        <div className="text-center py-4 text-red-600">
                          <p className="font-medium">Piscine fermée</p>
                          <p className="text-sm">La piscine est fermée le dimanche</p>
                        </div>
                      );
                    }
                    
                    if (daySessions.length === 0) {
                      return (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>Aucune session prévue</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {daySessions.map(session => {
                          const available = session.max_participants - session.enrolled_students;
                          
                          return (
                            <div
                              key={session.id}
                              className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleSessionClick(session)}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{session.classes.name}</h4>
                                <Badge variant="outline">{session.classes.level}</Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(session.session_date), 'HH:mm')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {session.enrolled_students}/{session.max_participants}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${session.classes.price}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Badge 
                                  className={
                                    available <= 0 ? 'bg-destructive/20 text-destructive' :
                                    available <= 2 ? 'bg-orange-500/20 text-orange-700' :
                                    'bg-green-500/20 text-green-700'
                                  }
                                >
                                  {available <= 0 ? 'Complet' : `${available} places`}
                                </Badge>
                                
                                {enableReservations && available > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSessionClick(session);
                                    }}
                                  >
                                    {user ? 'Réserver' : 'Se connecter'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};