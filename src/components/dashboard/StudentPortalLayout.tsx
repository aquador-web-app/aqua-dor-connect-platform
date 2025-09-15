import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentBookingManager } from "./StudentBookingManager";
import { StudentPayments } from "./StudentPayments";
import { CreditCard, BookOpen, Bell } from "lucide-react";
import { StudentCalendar } from "@/components/calendar/StudentCalendar";
import { useToast } from "@/hooks/use-toast";

export function StudentPortalLayout() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portail Étudiant</h1>
          <p className="text-muted-foreground">Gérez vos cours, réservations et paiements</p>
        </div>
      </div>

      {/* Calendar Component */}
      <StudentCalendar />
    </div>
  );
}