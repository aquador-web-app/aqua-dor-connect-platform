import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BarChart3, MessageSquare, FileText, Settings, Scan } from "lucide-react";
import { BarcodeScanner } from "@/components/dashboard/BarcodeScanner";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/hooks/useAuth";

const CoachPortal = () => {
  const { profile, isInstructor, hasAnyRole } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for instructor stats
  const instructorStats = {
    totalStudents: 24,
    classesThisWeek: 8,
    averageRating: 4.8,
    completedSessions: 156
  };

  const attendanceData = [
    { week: "S1", attendance: 85 },
    { week: "S2", attendance: 92 },
    { week: "S3", attendance: 88 },
    { week: "S4", attendance: 95 },
  ];

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="students">Mes Élèves</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Total Élèves"
                value={instructorStats.totalStudents}
                icon={Users}
              />
              <StatCard
                title="Cours cette semaine"
                value={instructorStats.classesThisWeek}
                icon={Calendar}
              />
              <StatCard
                title="Note moyenne"
                value={instructorStats.averageRating}
                icon={BarChart3}
              />
              <StatCard
                title="Sessions terminées"
                value={instructorStats.completedSessions}
                icon={FileText}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceChart data={attendanceData} title="Présence de mes élèves" />
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

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes Élèves</CardTitle>
                <CardDescription>Liste et gestion de vos élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fonctionnalité de gestion des élèves en développement...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanner" className="mt-6">
            <BarcodeScanner />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rapports d'Évaluation</CardTitle>
                <CardDescription>Créer des rapports sur le progrès des élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Système de rapports en développement...</p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-secondary" />
                <span>Mes Élèves</span>
              </CardTitle>
              <CardDescription>Liste et suivi de vos élèves</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Gérer les Élèves</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-accent" />
                <span>Planning</span>
              </CardTitle>
              <CardDescription>Horaires et disponibilités</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Mon Calendrier</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span>Performances</span>
              </CardTitle>
              <CardDescription>Statistiques d'enseignement</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Voir les Stats</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-secondary" />
                <span>Messages</span>
              </CardTitle>
              <CardDescription>Communication avec élèves et parents</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Messagerie</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-accent" />
                <span>Rapports</span>
              </CardTitle>
              <CardDescription>Évaluations et commentaires</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Créer un Rapport</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <span>Paramètres</span>
              </CardTitle>
              <CardDescription>Configuration du profil coach</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Configurer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoachPortal;