import React, { useState } from 'react';
import { PublicCalendar } from './PublicCalendar';
import { SessionReservationFlow } from '@/components/reservation/SessionReservationFlow';
import { PublicCalendarSession } from '@/hooks/usePublicCalendar';

export const PublicCalendarWithReservation: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<PublicCalendarSession | null>(null);
  const [reservationFlowOpen, setReservationFlowOpen] = useState(false);

  const handleSessionSelect = (session: PublicCalendarSession) => {
    setSelectedSession(session);
    setReservationFlowOpen(true);
  };

  const handleReservationClose = () => {
    setReservationFlowOpen(false);
    setSelectedSession(null);
  };

  const handleReservationSuccess = () => {
    // Optionally trigger a refresh of the calendar
    setReservationFlowOpen(false);
    setSelectedSession(null);
  };

  return (
    <>
      <PublicCalendar onSessionSelect={handleSessionSelect} />
      
      <SessionReservationFlow
        isOpen={reservationFlowOpen}
        onClose={handleReservationClose}
        session={selectedSession}
        onSuccess={handleReservationSuccess}
      />
    </>
  );
};