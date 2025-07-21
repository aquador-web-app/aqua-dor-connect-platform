import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BarChart3, MessageSquare, FileText, Settings } from "lucide-react";

const CoachPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portail Instructeur</h1>
          <p className="text-muted-foreground">Tableau de bord pour les coaches A'qua D'or</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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