
import { useState, useEffect } from "react";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { InstructorManagement } from "@/components/dashboard/InstructorManagement";
import { CourseManagement } from "@/components/dashboard/CourseManagement";
import { EnhancedCalendar } from "@/components/dashboard/EnhancedCalendar";
import { PaymentOverview } from "@/components/dashboard/PaymentOverview";
import { AdminPaymentManager } from "@/components/dashboard/AdminPaymentManager";
import { ContentManager } from "@/components/dashboard/ContentManager";
import { NotificationManager } from "@/components/dashboard/NotificationManager";
import { ParentChildManager } from "@/components/dashboard/ParentChildManager";
import { ReferralDashboard } from "@/components/dashboard/ReferralDashboard";
import { InstructorAnalytics } from "@/components/dashboard/InstructorAnalytics";
import { IntelligentCalendar } from "@/components/dashboard/IntelligentCalendar";
import { UnifiedCalendar } from "@/components/calendar/UnifiedCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { ProductManagement } from "@/components/dashboard/ProductManagement";
import { SubscriptionPlansManagement } from "@/components/dashboard/SubscriptionPlansManagement";
import { EnhancedBarcodeScanner } from "@/components/dashboard/EnhancedBarcodeScanner";
import { PendingReservationsManager } from "@/components/admin/PendingReservationsManager";
import { DocumentManagement } from "@/components/admin/DocumentManagement";
import { ReferralManagement } from "@/components/admin/ReferralManagement";
import { InvoiceManagement } from "@/components/admin/InvoiceManagement";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { StoreManagement } from "@/components/store/StoreManagement";

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
        case 'products':
          return <ProductManagement />;
        case 'subscriptions':
          return <SubscriptionPlansManagement />;
        case "documents":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Gestion des Documents</h2>
                <p className="text-muted-foreground">Gérez les documents obligatoires et les ressources</p>
              </div>
              <DocumentManagement />
            </div>
          );
        case "referrals":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Gestion des Parrainages</h2>
                <p className="text-muted-foreground">Suivez et gérez le programme de parrainage</p>
              </div>
              <ReferralManagement />
            </div>
          );
        case "invoices":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Gestion des Factures</h2>
                <p className="text-muted-foreground">Créez et gérez les factures</p>
              </div>
              <InvoiceManagement />
            </div>
          );
        case "store":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Gestion de la Boutique</h2>
                <p className="text-muted-foreground">Gérez les produits, catégories et commandes</p>
              </div>
              <StoreManagement />
            </div>
          );
        case "reservations":
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">🔄 Gestion des Réservations</h2>
                  <p className="text-muted-foreground">
                    Gérez les demandes de réservation et confirmez les paiements • Mises à jour temps réel
                  </p>
                </div>
              </div>
              <PendingReservationsManager />
            </div>
          );
        case "attendance":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Gestion des Présences</h2>
                <p className="text-muted-foreground">Scanner les codes-barres des étudiants pour marquer leur présence</p>
              </div>
              <EnhancedBarcodeScanner />
            </div>
          );
        case "calendar":
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Calendrier et Réservations</h2>
                <p className="text-muted-foreground">Gérez les sessions de cours et les réservations</p>
              </div>
              <UnifiedCalendar mode="admin" showBookingActions={false} maxDaysAhead={365} />
            </div>
          );
      case "payments":
        return canManagePayments() ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">💳 Gestion des Paiements</h2>
              <p className="text-muted-foreground">
                Confirmez les paiements et gérez les finances • Synchronisation automatique
              </p>
            </div>
            <PendingReservationsManager />
            <PaymentOverview />
            <AdminPaymentManager />
          </div>
        ) : (
          <div className="text-center py-8">
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
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <div className="flex items-center gap-4">
          <AdminNotificationBell />
          <AdminNavbar />
        </div>
      </div>
      
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
