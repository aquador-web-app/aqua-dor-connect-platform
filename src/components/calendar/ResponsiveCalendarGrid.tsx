import React from 'react';
import { cn } from '@/lib/utils';
import { format, isSameMonth, isToday } from 'date-fns';

interface ResponsiveCalendarGridProps {
  calendarDays: Date[];
  currentMonth: Date;
  expandedDates: Set<string>;
  getEventsForDate: (date: Date) => any[];
  toggleDateExpansion: (date: Date) => void;
  renderDayEvents: (date: Date, isExpanded: boolean) => React.ReactNode;
  className?: string;
}

export function ResponsiveCalendarGrid({
  calendarDays,
  currentMonth,
  expandedDates,
  getEventsForDate,
  toggleDateExpansion,
  renderDayEvents,
  className
}: ResponsiveCalendarGridProps) {
  return (
    <div className={cn("grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden", className)}>
      {calendarDays.map((date, index) => {
        const dayEvents = getEventsForDate(date);
        const isCurrentMonth = isSameMonth(date, currentMonth);
        const isExpandedDate = expandedDates.has(format(date, 'yyyy-MM-dd'));
        const hasEvents = dayEvents.length > 0;

        return (
          <div
            key={index}
            className={cn(
              "bg-card p-1.5 sm:p-2 min-h-[80px] sm:min-h-[120px] md:min-h-[140px]",
              "transition-all duration-300 ease-in-out",
              "hover:shadow-sm hover:z-10 relative",
              isCurrentMonth ? "opacity-100" : "opacity-40",
              isToday(date) && "bg-primary/5 ring-1 ring-primary/20 shadow-sm",
              hasEvents && "cursor-pointer hover:bg-muted/30",
              isExpandedDate && "min-h-[120px] sm:min-h-[200px] md:min-h-[250px] bg-muted/10 shadow-lg z-20"
            )}
            onClick={() => hasEvents && toggleDateExpansion(date)}
          >
            <div className={cn(
              "text-xs sm:text-sm font-medium mb-1 transition-colors duration-200",
              "flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full",
              isToday(date) 
                ? "bg-primary text-primary-foreground font-bold" 
                : "text-foreground hover:bg-muted/50"
            )}>
              {format(date, 'd')}
            </div>
            
            <div className="overflow-hidden">
              {renderDayEvents(date, isExpandedDate)}
            </div>
          </div>
        );
      })}
    </div>
  );
}