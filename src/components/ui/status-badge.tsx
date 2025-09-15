import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'confirmed' | 'pending' | 'cancelled' | 'scheduled' | 'active' | 'inactive';
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: status === 'confirmed' ? 'Confirmé' : 'Actif'
        };
      case 'pending':
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          text: 'En attente'
        };
      case 'cancelled':
      case 'inactive':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: status === 'cancelled' ? 'Annulé' : 'Inactif'
        };
      case 'scheduled':
        return {
          variant: 'outline' as const,
          icon: Clock,
          text: 'Programmé'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Info,
          text: status
        };
    }
  };

  const { variant, icon: Icon, text } = getStatusConfig();

  return (
    <Badge variant={variant} className={cn("flex items-center gap-1", className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {text}
    </Badge>
  );
}