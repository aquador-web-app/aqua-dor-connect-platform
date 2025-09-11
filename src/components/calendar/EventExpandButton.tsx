import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Clock, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PublicCalendarSession } from "@/hooks/usePublicCalendar";
import { AttendanceButton } from "./AttendanceButton";
import { useAuth } from "@/hooks/useAuth";

interface EventExpandButtonProps {
  sessions: PublicCalendarSession[];
  date: Date;
  onSessionSelect?: (session: PublicCalendarSession) => void;
}

export function EventExpandButton({ sessions, date, onSessionSelect }: EventExpandButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { userRole } = useAuth();

  if (sessions.length <= 1) {
    const session = sessions[0];
    if (!session) return null;

    return (
      <div className="text-xs p-1 bg-primary/10 rounded border cursor-pointer hover:bg-primary/20 transition-colors">
        <div 
          className="font-medium truncate"
          onClick={() => onSessionSelect?.(session)}
        >
          {session.class_name}
        </div>
        <div className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(session.session_date), 'HH:mm')}
        </div>
        {userRole === 'student' && (
          <div className="mt-1">
            <AttendanceButton session={session} variant="ghost" size="sm" />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-xs">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 w-full"
          onClick={() => setDialogOpen(true)}
        >
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="font-medium">{sessions.length} événements</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <div className="text-muted-foreground">
              {format(date, 'dd MMM', { locale: fr })}
            </div>
          </div>
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Événements du {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  onSessionSelect?.(session);
                  setDialogOpen(false);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{session.class_name}</h3>
                  <Badge variant="outline">{session.class_level}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(session.session_date), 'HH:mm')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {session.enrolled_students}/{session.max_participants}
                  </div>
                </div>
                
                {session.class_description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {session.class_description}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <div className="text-lg font-semibold text-primary">
                    ${session.class_price}
                  </div>
                  
                  <div className="flex gap-2">
                    {userRole === 'student' && (
                      <AttendanceButton session={session} variant="outline" size="sm" />
                    )}
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionSelect?.(session);
                        setDialogOpen(false);
                      }}
                    >
                      {userRole ? 'Réserver' : 'S\'inscrire'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}