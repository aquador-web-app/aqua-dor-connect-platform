import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Users, DollarSign, Calendar, Settings, BarChart3, Bell, Shield } from "lucide-react";

const AdminPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portail Administrateur</h1>
          <p className="text-muted-foreground">Tableau de bord de gestion A'qua D'or</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-secondary" />
                <span>Utilisateurs</span>
              </CardTitle>
              <CardDescription>Gestion des élèves et instructeurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Gérer</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-accent" />
                <span>Finances</span>
              </CardTitle>
              <CardDescription>Revenus et paiements</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Finances</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Plannings</span>
              </CardTitle>
              <CardDescription>Horaires et réservations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Calendrier</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-secondary" />
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>Statistiques détaillées</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Rapports</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-accent" />
                <span>CRM</span>
              </CardTitle>
              <CardDescription>Gestion de la relation client</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">CRM</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>Alertes système</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Alertes</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-secondary" />
                <span>Sécurité</span>
              </CardTitle>
              <CardDescription>Accès et permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Sécurité</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-accent" />
                <span>Configuration</span>
              </CardTitle>
              <CardDescription>Paramètres généraux</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Config</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;