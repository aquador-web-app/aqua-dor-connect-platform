
import { useState, useEffect } from "react";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { InstructorManagement } from "@/components/dashboard/InstructorManagement";
import { CourseManagement } from "@/components/dashboard/CourseManagement";
import { EnhancedCalendar } from "@/components/dashboard/EnhancedCalendar";
import { PaymentOverview } from "@/components/dashboard/PaymentOverview";
import { ContentManager } from "@/components/dashboard/ContentManager";
import { NotificationManager } from "@/components/dashboard/NotificationManager";
import { ParentChildManager } from "@/components/dashboard/ParentChildManager";
import { ReferralDashboard } from "@/components/dashboard/ReferralDashboard";
import { InstructorAnalytics } from "@/components/dashboard/InstructorAnalytics";
import { IntelligentCalendar } from "@/components/dashboard/IntelligentCalendar";
import AdminCalendar from "@/components/dashboard/AdminCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { AdminReservationManager } from "@/components/dashboard/AdminReservationManager";

function AdminPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const { canManagePayments, canManageContent } = useAuth();

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === 'string') setActiveTab(ce.detail);
    };
    window.addEventListener('admin:setTab', handler as EventListener);
    return () => window.removeEventListener('admin:setTab', handler as EventListener);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewDashboard />;
      case "users":
        return <UserManagement />;
      case "instructors":
        return <InstructorManagement />;
      case "courses":
        return <CourseManagement />;
        case "reservations":
          return <AdminReservationManager />;
        case "calendar":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Calendrier et Réservations</h2>
                <p className="text-muted-foreground">Gérez les sessions de cours et les réservations</p>
              </div>
              <AdminCalendar />
            </div>
          );
      case "payments":
        return canManagePayments() ? <PaymentOverview /> : (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette section.</p>
          </div>
        );
      case "content":
        return canManageContent() ? <ContentManager /> : (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette section.</p>
          </div>
        );
      case "settings":
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                <NotificationManager />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Relations Parent-Enfant</h3>
                <ParentChildManager />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Programme de Parrainage</h3>
                <ReferralDashboard />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Analytics Instructeurs</h3>
                <InstructorAnalytics />
              </div>
            </div>
          </div>
        );
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNavbar />
      
      <div className="flex flex-1">
        <div className="hidden md:block">
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}

export default AdminPortal;
