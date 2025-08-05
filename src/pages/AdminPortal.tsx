import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Users, DollarSign, Calendar, Settings, BarChart3, Bell, Shield, Scan, Gift, FileText, UserCheck, GraduationCap, BookOpen } from "lucide-react";
import { AdminNavbar } from "@/components/layout/AdminNavbar";
import { BarcodeScanner } from "@/components/dashboard/BarcodeScanner";
import { ReferralDashboard } from "@/components/dashboard/ReferralDashboard";
import { ParentChildManager } from "@/components/dashboard/ParentChildManager";
import { ContentManager } from "@/components/dashboard/ContentManager";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { InstructorManagement } from "@/components/dashboard/InstructorManagement";
import { ClassScheduler } from "@/components/dashboard/ClassScheduler";
import { PaymentOverview } from "@/components/dashboard/PaymentOverview";
import { NotificationManager } from "@/components/dashboard/NotificationManager";
import { CourseCreator } from "@/components/dashboard/CourseCreator";
import { useAuth } from "@/hooks/useAuth";

const AdminPortal = () => {
  const { canManagePayments, canManageContent } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Portail Administrateur</h1>
              <p className="text-muted-foreground">Tableau de bord de gestion A'qua D'or</p>
            </div>
            <div className="flex space-x-2">
              <CourseCreator />
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-9 text-xs">
            <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="instructors" className="text-xs">Instructeurs</TabsTrigger>
            <TabsTrigger value="scheduler" className="text-xs">Planificateur</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Paiements</TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs">Parrainages</TabsTrigger>
            <TabsTrigger value="families" className="text-xs">Familles</TabsTrigger>
            <TabsTrigger value="content" className="text-xs">Contenu</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40"
                onClick={() => setActiveTab("users")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Utilisateurs</span>
                  </CardTitle>
                  <CardDescription>Gestion des comptes utilisateurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="sm">Gérer</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-secondary/20 hover:border-secondary/40"
                onClick={() => setActiveTab("instructors")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <GraduationCap className="h-5 w-5 text-secondary" />
                    <span>Instructeurs</span>
                  </CardTitle>
                  <CardDescription>Gestion des coachs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Instructeurs</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-accent/20 hover:border-accent/40"
                onClick={() => setActiveTab("scheduler")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Calendar className="h-5 w-5 text-accent" />
                    <span>Plannings</span>
                  </CardTitle>
                  <CardDescription>Horaires et réservations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Calendrier</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40"
                onClick={() => setActiveTab("payments")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>Paiements</span>
                  </CardTitle>
                  <CardDescription>Revenus et transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Finances</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-secondary/20 hover:border-secondary/40"
                onClick={() => setActiveTab("referrals")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Gift className="h-5 w-5 text-secondary" />
                    <span>Parrainages</span>
                  </CardTitle>
                  <CardDescription>Programme de parrainage</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Parrainages</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-accent/20 hover:border-accent/40"
                onClick={() => setActiveTab("families")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <UserCheck className="h-5 w-5 text-accent" />
                    <span>Familles</span>
                  </CardTitle>
                  <CardDescription>Relations parent-enfant</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Familles</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40"
                onClick={() => setActiveTab("content")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Contenu</span>
                  </CardTitle>
                  <CardDescription>Gestion du contenu site</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">CMS</Button>
                </CardContent>
              </Card>
              
              <Card 
                className="hover:shadow-elegant transition-all duration-300 cursor-pointer border-secondary/20 hover:border-secondary/40"
                onClick={() => setActiveTab("notifications")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Bell className="h-5 w-5 text-secondary" />
                    <span>Notifications</span>
                  </CardTitle>
                  <CardDescription>Communications utilisateurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" size="sm">Notifications</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="instructors" className="mt-6">
            <InstructorManagement />
          </TabsContent>

          <TabsContent value="scheduler" className="mt-6">
            <ClassScheduler />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            {canManagePayments() ? <PaymentOverview /> : <div>Accès refusé</div>}
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationManager />
          </TabsContent>


          <TabsContent value="referrals" className="mt-6">
            {canManagePayments() ? <ReferralDashboard /> : <div>Accès refusé</div>}
          </TabsContent>

          <TabsContent value="families" className="mt-6">
            <ParentChildManager />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            {canManageContent() ? <ContentManager /> : <div>Accès refusé</div>}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default AdminPortal;