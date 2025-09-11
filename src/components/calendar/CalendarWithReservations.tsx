import React, { useState } from 'react';
import { SimpleCalendar } from './SimpleCalendar';
import { SimpleReservationFlow } from './SimpleReservationFlow';
import { CalendarSession } from '@/hooks/useCalendarSessions';

export const CalendarWithReservations: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<CalendarSession | null>(null);
  const [reservationOpen, setReservationOpen] = useState(false);

  const handleSessionSelect = (session: CalendarSession) => {
    setSelectedSession(session);
    setReservationOpen(true);
  };

  const handleReservationClose = () => {
    setReservationOpen(false);
    setSelectedSession(null);
  };

  const handleReservationSuccess = () => {
    // Trigger a calendar refresh
    window.dispatchEvent(new CustomEvent('calendarSync', { 
      detail: { type: 'reservation_created' } 
    }));
  };

  return (
    <>
      <SimpleCalendar onSessionSelect={handleSessionSelect} />
      
      <SimpleReservationFlow
        session={selectedSession}
        isOpen={reservationOpen}
        onClose={handleReservationClose}
        onSuccess={handleReservationSuccess}
      />
    </>
  );
};