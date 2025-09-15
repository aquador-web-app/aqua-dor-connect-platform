import React from 'react';
import { SamsungCalendar } from './SamsungCalendar';

interface UnifiedCalendarProps {
  userRole?: 'visitor' | 'student' | 'admin' | 'instructor';
  showOnlyUserEvents?: boolean;
}

export function UnifiedCalendar({ 
  userRole = 'visitor', 
  showOnlyUserEvents = false 
}: UnifiedCalendarProps) {
  // Use Samsung Calendar for better UX with animations
  return (
    <div className="animate-fade-in">
      <SamsungCalendar 
        userRole={userRole}
        showOnlyUserEvents={showOnlyUserEvents}
      />
    </div>
  );
}

// Legacy component - now using SamsungCalendar for better UX