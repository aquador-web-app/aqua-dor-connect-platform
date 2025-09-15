import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CalendarPerformanceMonitorProps {
  isLoading: boolean;
  eventCount: number;
  className?: string;
}

export function CalendarPerformanceMonitor({ 
  isLoading, 
  eventCount, 
  className 
}: CalendarPerformanceMonitorProps) {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading && loadTime === null) {
      setLoadTime(Date.now() - startTime);
    }
  }, [isLoading, loadTime, startTime]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <Badge variant="outline">
        {eventCount} événements
      </Badge>
      {loadTime && (
        <Badge variant={loadTime > 2000 ? 'destructive' : loadTime > 1000 ? 'secondary' : 'default'}>
          {loadTime}ms
        </Badge>
      )}
      {isLoading && (
        <Badge variant="secondary" className="animate-pulse">
          Chargement...
        </Badge>
      )}
    </div>
  );
}