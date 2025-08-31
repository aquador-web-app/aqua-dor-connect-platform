import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  Columns
} from "lucide-react";
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  startOfWeek as getStartOfWeek,
  endOfWeek as getEndOfWeek,
  startOfDay,
  endOfDay,
  parseISO
} from "date-fns";
import { fr } from "date-fns/locale";

export type ViewMode = 'agenda' | 'day' | 'week' | 'month';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'class' | 'event' | 'reservation';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  color: string;
  description?: string;
  location?: string;
  attendees?: number;
  maxAttendees?: number;
  level?: string;
  instructor?: string;
}

interface CalendarViewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onEventCreate?: (date: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isAdmin?: boolean;
  loading?: boolean;
}

export function CalendarView({
  viewMode,
  onViewModeChange,
  onEventCreate,
  onEventSelect,
  events,
  selectedDate,
  onDateSelect,
  isAdmin = false,
  loading = false
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);

  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    
    switch (viewMode) {
      case 'day':
        newDate = direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
        break;
      case 'week':
        newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
        break;
      case 'month':
        newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        break;
      case 'agenda':
        newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }
    
    setCurrentDate(newDate);
    onDateSelect(newDate);
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
      case 'week':
        const weekStart = getStartOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = getEndOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd', { locale: fr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: fr });
      case 'agenda':
        return format(currentDate, 'MMMM yyyy', { locale: fr });
      default:
        return '';
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(event.start, date) || 
      (event.start <= date && event.end >= date)
    );
  };

  const getEventsForDateRange = (start: Date, end: Date) => {
    return events.filter(event => 
      (event.start >= start && event.start <= end) ||
      (event.end >= start && event.end <= end) ||
      (event.start <= start && event.end >= end)
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleDateClick = (date: Date) => {
    if (onEventCreate && (isAdmin || viewMode === 'agenda')) {
      if (date.getTime() >= Date.now() - 24 * 60 * 60 * 1000) { // Allow creating events from yesterday
        onEventCreate(date);
      }
    }
    onDateSelect(date);
  };

  const renderViewModeSelector = () => (
    <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
      {[
        { mode: 'agenda', icon: List, label: 'Agenda' },
        { mode: 'day', icon: Columns, label: 'Jour' },
        { mode: 'week', icon: Grid3X3, label: 'Semaine' },
        { mode: 'month', icon: CalendarIcon, label: 'Mois' }
      ].map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant={viewMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange(mode as ViewMode)}
          className={cn(
            "h-8 px-3 transition-all duration-200",
            viewMode === mode && "shadow-sm"
          )}
        >
          <Icon className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );

  const renderAgendaView = () => {
    const agendaStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const agendaEnd = endOfWeek(addWeeks(currentDate, 2), { weekStartsOn: 1 });
    const agendaEvents = getEventsForDateRange(agendaStart, agendaEnd);

    const groupedEvents = agendaEvents.reduce((groups, event) => {
      const dateKey = format(event.start, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => {
          const date = parseISO(dateKey);
          return (
            <Card key={dateKey} className={cn(
              "border-l-4 transition-all duration-200 hover:shadow-md",
              isToday(date) ? "border-l-primary bg-primary/5" : "border-l-muted",
              isSameDay(date, selectedDate) && "ring-2 ring-primary/20"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {format(date, 'EEEE d MMMM', { locale: fr })}
                    </h3>
                    {isToday(date) && (
                      <Badge variant="secondary" className="mt-1">Aujourd'hui</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDateClick(date)}
                      className="opacity-60 hover:opacity-100"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
                        "hover:scale-[1.02] transform"
                      )}
                      style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
                      onClick={() => onEventSelect?.(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                          </p>
                          {event.level && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {event.level}
                            </Badge>
                          )}
                        </div>
                        {event.maxAttendees && (
                          <div className="text-xs text-muted-foreground">
                            {event.attendees || 0}/{event.maxAttendees}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {Object.keys(groupedEvents).length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">Aucun événement</h3>
              <p className="text-muted-foreground mb-4">
                Il n'y a aucun événement prévu pour cette période.
              </p>
              {isAdmin && (
                <Button onClick={() => handleDateClick(new Date())}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un événement
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {format(currentDate, 'EEEE', { locale: fr })}
              </CardTitle>
              <p className="text-2xl font-bold">
                {format(currentDate, 'd', { locale: fr })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-2 rounded border-l-4 cursor-pointer hover:bg-muted/50"
                    style={{ borderLeftColor: event.color }}
                    onClick={() => onEventSelect?.(event)}
                  >
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </p>
                  </div>
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun événement
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3 overflow-y-auto">
          <div className="space-y-px">
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter(event => 
                event.start.getHours() === hour
              );
              
              return (
                <div
                  key={hour}
                  className="flex border-b border-border hover:bg-muted/30 transition-colors min-h-[60px]"
                  onClick={() => {
                    const eventDate = new Date(currentDate);
                    eventDate.setHours(hour, 0, 0, 0);
                    handleDateClick(eventDate);
                  }}
                >
                  <div className="w-16 p-2 text-sm text-muted-foreground border-r">
                    {format(new Date().setHours(hour, 0), 'HH:mm')}
                  </div>
                  <div className="flex-1 p-2 relative">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute left-2 right-2 p-2 rounded text-sm cursor-pointer shadow-sm"
                        style={{ 
                          backgroundColor: event.color + '20',
                          borderLeft: `3px solid ${event.color}`,
                          top: `${(event.start.getMinutes() / 60) * 60 + 8}px`,
                          height: `${((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) * 60}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventSelect?.(event);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs opacity-75">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getStartOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: getEndOfWeek(currentDate, { weekStartsOn: 1 })
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-x-auto h-[70vh]">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 border-r text-sm font-medium"></div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 border-r text-center cursor-pointer hover:bg-muted/50",
                  isToday(day) && "bg-primary/10",
                  isSameDay(day, selectedDate) && "bg-primary/20"
                )}
                onClick={() => onDateSelect(day)}
              >
                <div className="font-medium text-sm">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={cn(
                  "text-lg mt-1",
                  isToday(day) && "font-bold text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          
          <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                <div className="p-2 border-r text-sm text-muted-foreground">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
                {weekDays.map((day) => {
                  const hourEvents = events.filter(event => 
                    isSameDay(event.start, day) && event.start.getHours() === hour
                  );
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="border-r p-1 relative hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const eventDate = new Date(day);
                        eventDate.setHours(hour, 0, 0, 0);
                        handleDateClick(eventDate);
                      }}
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded mb-1 cursor-pointer shadow-sm"
                          style={{ 
                            backgroundColor: event.color + '20',
                            borderLeft: `2px solid ${event.color}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventSelect?.(event);
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="opacity-75">
                            {format(event.start, 'HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
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

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {weeks.map((week, weekIndex) =>
            week.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "bg-background p-2 min-h-[100px] cursor-pointer transition-colors hover:bg-muted/50",
                    !isCurrentMonth && "opacity-40",
                    isToday(day) && "bg-primary/10",
                    isSameDay(day, selectedDate) && "ring-2 ring-primary/50"
                  )}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={cn(
                    "text-sm mb-1",
                    isToday(day) && "font-bold text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded truncate cursor-pointer"
                        style={{ 
                          backgroundColor: event.color + '30',
                          color: event.color
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventSelect?.(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} plus
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case 'agenda':
        return renderAgendaView();
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      default:
        return renderAgendaView();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    onDateSelect(today);
                  }}
                  className="px-4"
                >
                  Aujourd'hui
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <h2 className="text-xl font-semibold capitalize">
                {getViewTitle()}
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              {renderViewModeSelector()}
              
              {isAdmin && (
                <Button onClick={() => handleDateClick(new Date())}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {renderCurrentView()}
        </CardContent>
      </Card>
    </div>
  );
}