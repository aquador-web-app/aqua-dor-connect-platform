import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealTimeCalendarSyncProps {
  onSync: () => void;
  tables?: string[];
}

export const useRealTimeCalendarSync = ({ 
  onSync, 
  tables = ['class_sessions', 'session_reservations', 'bookings', 'enrollments'] 
}: UseRealTimeCalendarSyncProps) => {
  
  useEffect(() => {
    // Set up real-time subscriptions for all calendar-related tables
    const channel = supabase.channel('calendar-sync');
    
    tables.forEach(table => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table
      }, (payload) => {
        console.log(`Calendar sync triggered by ${table} change:`, payload);
        onSync();
        
        // Dispatch global event for cross-component synchronization
        window.dispatchEvent(new CustomEvent('calendarSync', { 
          detail: { 
            type: `${table}_changed`, 
            payload,
            source: 'realtime' 
          } 
        }));
      });
    });

    channel.subscribe();

    // Listen for external calendar sync events
    const handleExternalSync = (event: CustomEvent) => {
      if (event.detail?.type) {
        console.log('External calendar sync received:', event.detail.type);
        onSync();
      }
    };

    window.addEventListener('calendarSync', handleExternalSync as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('calendarSync', handleExternalSync as EventListener);
    };
  }, [onSync, tables]);
};