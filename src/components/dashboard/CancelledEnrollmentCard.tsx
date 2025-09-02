import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CancelledEnrollmentCardProps {
  enrollment: {
    id: string;
    status: string;
    cancelled_at: string | null;
    classes: {
      name: string;
      instructors?: {
        profiles: {
          full_name: string;
        };
      };
    };
  };
  onReactivate?: () => void;
}

export function CancelledEnrollmentCard({ 
  enrollment, 
  onReactivate 
}: CancelledEnrollmentCardProps) {
  const { toast } = useToast();

  const handleReactivate = async () => {
    try {
      // Use the database function to handle reactivation with proper event logging
      const { error } = await supabase.rpc('reactivate_enrollment_with_event', {
        p_enrollment_id: enrollment.id
      });

      if (error) throw error;

      toast({
        title: "Cours réactivé",
        description: "Votre cours a été réactivé avec succès",
      });

      onReactivate?.();
    } catch (error) {
      console.error('Error reactivating enrollment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réactiver le cours",
        variant: "destructive",
      });
    }
  };

  const getTimeRemaining = () => {
    if (!enrollment.cancelled_at) return null;
    
    const cancelledTime = new Date(enrollment.cancelled_at);
    const expiryTime = new Date(cancelledTime.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeLeft = Math.max(0, expiryTime.getTime() - now.getTime());
    
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours: hoursLeft, minutes: minutesLeft, expired: timeLeft === 0 };
  };

  const timeInfo = getTimeRemaining();

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium line-through text-muted-foreground">
                {enrollment.classes.name}
              </h3>
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Annulé
              </Badge>
            </div>
            
            {enrollment.classes.instructors?.profiles?.full_name && (
              <p className="text-sm text-muted-foreground line-through">
                Instructeur: {enrollment.classes.instructors.profiles.full_name}
              </p>
            )}
            
            {timeInfo && !timeInfo.expired && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                <span>
                  Visible encore {timeInfo.hours}h {timeInfo.minutes}m
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {!timeInfo?.expired && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReactivate}
                className="text-xs"
              >
                Réactiver
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}