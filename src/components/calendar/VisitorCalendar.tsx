import React from 'react';
import { SamsungCalendar } from './SamsungCalendar';
import { CalendarErrorBoundary } from './CalendarErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Users, Clock } from 'lucide-react';
import { CalendarEvent } from '@/hooks/useUniversalCalendar';

interface VisitorCalendarProps {
  className?: string;
}

export function VisitorCalendar({ className }: VisitorCalendarProps) {
  const handleEventClick = (event: CalendarEvent) => {
    // For visitors, clicking any event will show details but redirect to auth for reservations
    console.log('Visitor clicked event:', event);
  };

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Calendrier des Cours</CardTitle>
          <CardDescription className="max-w-2xl mx-auto">
            Découvrez nos cours de natation disponibles. Cliquez sur "Réserver" pour vous inscrire et accéder au système de paiement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium text-sm">Cours Disponibles</h3>
              <p className="text-xs text-muted-foreground">Tous niveaux</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-secondary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-secondary" />
              </div>
              <h3 className="font-medium text-sm">Places Limitées</h3>
              <p className="text-xs text-muted-foreground">Réservez vite</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-accent/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <h3 className="font-medium text-sm">Horaires Flexibles</h3>
              <p className="text-xs text-muted-foreground">Matin & soir</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CalendarErrorBoundary>
        <SamsungCalendar
          userRole="visitor"
          showOnlyUserEvents={false}
          onEventClick={handleEventClick}
          className="animate-fade-in"
        />
      </CalendarErrorBoundary>
    </div>
  );
}