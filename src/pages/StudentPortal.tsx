import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, CreditCard, Award, Bell, User } from "lucide-react";

const StudentPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portail Élève</h1>
          <p className="text-muted-foreground">Bienvenue dans votre espace personnel A'qua D'or</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <span>Mes Cours</span>
              </CardTitle>
              <CardDescription>Consultez vos horaires et réservations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Voir le Planning</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-accent" />
                <span>Progression</span>
              </CardTitle>
              <CardDescription>Suivez votre évolution et vos acquis</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Voir les Progrès</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Paiements</span>
              </CardTitle>
              <CardDescription>Gérez vos factures et abonnements</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Mes Factures</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-accent" />
                <span>Badges</span>
              </CardTitle>
              <CardDescription>Vos récompenses et certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Mes Réussites</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-secondary" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>Messages et rappels importants</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Voir les Messages</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Mon Profil</span>
              </CardTitle>
              <CardDescription>Informations personnelles et préférences</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Modifier le Profil</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;