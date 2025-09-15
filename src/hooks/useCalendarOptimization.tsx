import { useCallback, useMemo, useRef } from 'react';
import { CalendarEvent } from './useUniversalCalendar';
import { format, isSameDay } from 'date-fns';

export const useCalendarOptimization = (events: CalendarEvent[]) => {
  const memoizedEvents = useMemo(() => events, [events]);
  const eventsByDateCache = useRef<Map<string, CalendarEvent[]>>(new Map());

  // Clear cache when events change
  const clearCache = useCallback(() => {
    eventsByDateCache.current.clear();
  }, []);

  // Memoized event filtering by date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check cache first
    if (eventsByDateCache.current.has(dateStr)) {
      return eventsByDateCache.current.get(dateStr)!;
    }

    // Filter and cache result
    const dayEvents = memoizedEvents.filter(event => event.start_date === dateStr);
    eventsByDateCache.current.set(dateStr, dayEvents);
    
    return dayEvents;
  }, [memoizedEvents]);

  // Optimized event statistics
  const eventStats = useMemo(() => {
    const stats = {
      total: memoizedEvents.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      classes: 0,
      reservations: 0
    };

    memoizedEvents.forEach(event => {
      switch (event.status) {
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      switch (event.event_type) {
        case 'class':
          stats.classes++;
          break;
        case 'reservation':
          stats.reservations++;
          break;
      }
    });

    return stats;
  }, [memoizedEvents]);

  // Optimized upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return memoizedEvents
      .filter(event => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [memoizedEvents]);

  return {
    events: memoizedEvents,
    getEventsForDate,
    eventStats,
    upcomingEvents,
    clearCache
  };
};