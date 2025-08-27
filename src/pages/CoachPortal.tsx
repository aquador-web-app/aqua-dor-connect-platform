import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BarChart3, MessageSquare, FileText, Settings, Scan } from "lucide-react";
import { EnhancedBarcodeScanner } from "@/components/dashboard/EnhancedBarcodeScanner";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { InstructorAnalytics } from "@/components/dashboard/InstructorAnalytics";
import { InstructorStudentManager } from "@/components/dashboard/InstructorStudentManager";
import { BulletinManager } from "@/components/dashboard/BulletinManager";
import { useAuth } from "@/hooks/useAuth";
import { useInstructorStats } from "@/hooks/useInstructorStats";

const CoachPortal = () => {
  const { profile, isInstructor, hasAnyRole } = useAuth();
  const { stats: instructorStats, loading: statsLoading } = useInstructorStats();
  const [activeTab, setActiveTab] = useState("overview");

  if (!isInstructor() && !hasAnyRole(['admin', 'co_admin'])) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">Vous devez être instructeur pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portail Instructeur</h1>
          <p className="text-muted-foreground">Tableau de bord pour les coaches A'qua D'or</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
            <TabsTrigger value="students">Mes Élèves</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                  title="Total Élèves"
                  value={instructorStats?.totalStudents || 0}
                  icon={Users}
                />
                <StatCard
                  title="Cours cette semaine"
                  value={instructorStats?.classesThisWeek || 0}
                  icon={Calendar}
                />
                <StatCard
                  title="Note moyenne"
                  value={instructorStats?.averageRating || 0}
                  icon={BarChart3}
                />
                <StatCard
                  title="Sessions terminées"
                  value={instructorStats?.completedSessions || 0}
                  icon={FileText}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sessions à venir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {instructorStats?.upcomingSessions || 0}
                  </div>
                  <p className="text-muted-foreground">sessions programmées</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={() => setActiveTab("scanner")}>
                    <Scan className="h-4 w-4 mr-2" />
                    Scanner présences
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab("students")}>
                    <Users className="h-4 w-4 mr-2" />
                    Gérer mes élèves
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab("reports")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Créer un rapport
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <InstructorAnalytics />
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <InstructorStudentManager />
          </TabsContent>

          <TabsContent value="scanner" className="mt-6">
            <EnhancedBarcodeScanner />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <BulletinManager />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default CoachPortal;