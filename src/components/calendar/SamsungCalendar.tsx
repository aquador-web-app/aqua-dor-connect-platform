import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Grid3x3,
  List,
  Clock,
  Users,
  MapPin
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUniversalCalendar, CalendarEvent } from '@/hooks/useUniversalCalendar';
import { CalendarEventDialog } from './CalendarEventDialog';
import { CalendarCreateDialog } from './CalendarCreateDialog';

interface SamsungCalendarProps {
  userRole?: 'visitor' | 'student' | 'admin' | 'instructor';
  showOnlyUserEvents?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
  className?: string;
}

export function SamsungCalendar({
  userRole = 'visitor',
  showOnlyUserEvents = false,
  onEventClick,
  onCreateEvent,
  className
}: SamsungCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { 
    events, 
    loading, 
    getEventsForDate, 
    createReservation, 
    markAttendance,
    refreshEvents 
  } = useUniversalCalendar({
    userRole,
    enableRealtime: true,
    showOnlyUserEvents,
    dateRange: {
      start: startOfMonth(currentMonth),
      end: endOfMonth(addMonths(currentMonth, 2))
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  const toggleDateExpansion = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newExpanded = new Set(expandedDates);
    
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr);
    } else {
      newExpanded.add(dateStr);
    }
    
    setExpandedDates(newExpanded);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const handleCreateEvent = () => {
    if (userRole === 'admin') {
      setShowCreateDialog(true);
    }
    onCreateEvent?.();
  };

  const getEventTypeColor = (event: CalendarEvent) => {
    if (event.color_code) return event.color_code;
    
    switch (event.event_type) {
      case 'class':
        return 'hsl(var(--primary))'; // Deep navy
      case 'reservation':
        return event.status === 'cancelled' ? 'hsl(var(--destructive))' :
               event.status === 'pending' ? 'hsl(var(--accent))' : 
               'hsl(var(--secondary))'; // Aqua blue
      case 'admin_event':
        return 'hsl(var(--accent))'; // Orange
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const renderDayEvents = (date: Date, isExpanded: boolean) => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return null;

    const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, 2);
    const hasMoreEvents = dayEvents.length > 2 && !isExpanded;

    return (
      <div className="mt-1 space-y-0.5">
        {visibleEvents.map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className={cn(
              "text-xs p-1 rounded cursor-pointer transition-all duration-200 hover:scale-105",
              "bg-opacity-10 hover:bg-opacity-20 border-l-2"
            )}
            style={{ 
              backgroundColor: `${getEventTypeColor(event)}15`,
              borderLeftColor: getEventTypeColor(event)
            }}
            onClick={() => handleEventClick(event)}
          >
            <div className="font-medium truncate" title={event.title}>
              {event.start_time && (
                <span className="text-muted-foreground mr-1">
                  {event.start_time}
                </span>
              )}
              {event.title}
            </div>
            {event.available_seats !== undefined && (
              <div className="text-xs text-muted-foreground">
                {event.available_seats} places
              </div>
            )}
          </div>
        ))}
        
        {hasMoreEvents && (
          <button
            className="text-xs text-primary hover:underline w-full text-left"
            onClick={(e) => {
              e.stopPropagation();
              toggleDateExpansion(date);
            }}
          >
            +{dayEvents.length - 2} autres
          </button>
        )}
        
        {isExpanded && dayEvents.length > 2 && (
          <button
            className="text-xs text-muted-foreground hover:underline w-full text-left"
            onClick={(e) => {
              e.stopPropagation();
              toggleDateExpansion(date);
            }}
          >
            Réduire
          </button>
        )}
      </div>
    );
  };

  const renderMonthView = () => (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="h-8 px-2 text-sm"
            >
              Aujourd'hui
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-7 px-2"
            >
              <Grid3x3 className="h-3 w-3 mr-1" />
              Mois
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="h-7 px-2"
            >
              <List className="h-3 w-3 mr-1" />
              Agenda
            </Button>
          </div>

          {userRole === 'admin' && (
            <Button
              onClick={handleCreateEvent}
              size="sm"
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Créer
            </Button>
          )}
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {calendarDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isExpandedDate = expandedDates.has(format(date, 'yyyy-MM-dd'));
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={index}
              className={cn(
                "bg-card p-2 min-h-[120px] transition-all duration-200",
                isCurrentMonth ? "opacity-100" : "opacity-40",
                isToday(date) && "bg-primary/5 ring-1 ring-primary/20",
                hasEvents && "cursor-pointer hover:bg-muted/30",
                isExpandedDate && "min-h-[200px]"
              )}
              onClick={() => hasEvents && toggleDateExpansion(date)}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday(date) ? "text-primary font-bold" : "text-foreground"
              )}>
                {format(date, 'd')}
              </div>
              
              {renderDayEvents(date, isExpandedDate)}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAgendaView = () => {
    const upcomingEvents = events
      .filter(event => new Date(event.start_date) >= new Date())
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 20);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Agenda</h2>
          <Button
            variant="outline"
            onClick={() => setViewMode('month')}
            size="sm"
          >
            <Grid3x3 className="h-3 w-3 mr-1" />
            Vue mois
          </Button>
        </div>

        <div className="space-y-2 p-4">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun événement à venir</p>
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <Card 
                key={event.id} 
                className="cursor-pointer hover:bg-muted/30 transition-all duration-200 hover:scale-[1.02]"
                onClick={() => handleEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getEventTypeColor(event) }}
                        />
                        <h3 className="font-medium">{event.title}</h3>
                        <Badge variant={
                          event.status === 'confirmed' ? 'default' :
                          event.status === 'pending' ? 'secondary' :
                          event.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {event.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(event.start_date), 'dd MMM yyyy', { locale: fr })}
                        </div>
                        
                        {event.start_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.start_time}
                            {event.end_time && ` - ${event.end_time}`}
                          </div>
                        )}
                        
                        {event.available_seats !== undefined && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.available_seats} places disponibles
                          </div>
                        )}
                        
                        {event.instructor_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.instructor_name}
                          </div>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0">
          {viewMode === 'month' ? renderMonthView() : renderAgendaView()}
        </CardContent>
      </Card>

      <CalendarEventDialog
        event={selectedEvent}
        userRole={userRole}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onReserve={createReservation}
        onMarkAttendance={markAttendance}
        onRefresh={refreshEvents}
      />

      {userRole === 'admin' && (
        <CalendarCreateDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={refreshEvents}
        />
      )}
    </>
  );
}