import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  BookOpen, 
  FileCheck, 
  Award,
  BarChart3,
  Target
} from "lucide-react";

const PartnerPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-4">Espace Partenaire</h1>
            <p className="text-muted-foreground">
              Développez votre activité avec A'qua D'or et accédez à tous vos outils de gestion
            </p>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-0 shadow-card-custom">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ventes ce mois</p>
                    <p className="text-2xl font-bold text-primary">850,000</p>
                    <p className="text-xs text-green-600">+15% vs mois dernier</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Nouveaux clients</p>
                    <p className="text-2xl font-bold text-primary">24</p>
                    <p className="text-xs text-green-600">+8% vs mois dernier</p>
                  </div>
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commissions</p>
                    <p className="text-2xl font-bold text-primary">125,000</p>
                    <p className="text-xs text-green-600">+12% vs mois dernier</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Objectif mensuel</p>
                    <p className="text-2xl font-bold text-primary">78%</p>
                    <p className="text-xs text-accent">22% restant</p>
                  </div>
                  <Target className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  <span>Tableau de Bord</span>
                </CardTitle>
                <CardDescription>
                  Analysez vos performances et statistiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Voir les Analytics</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <span>Formation</span>
                </CardTitle>
                <CardDescription>
                  Accédez aux ressources de formation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Centre de Formation</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-accent" />
                  <span>Documents</span>
                </CardTitle>
                <CardDescription>
                  Catalogues, tarifs et documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Télécharger</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span>Mes Clients</span>
                </CardTitle>
                <CardDescription>
                  Gérez votre portefeuille client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Gérer Clients</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-accent" />
                  <span>Commissions</span>
                </CardTitle>
                <CardDescription>
                  Consultez vos gains et paiements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Voir Commissions</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-accent" />
                  <span>Programme Fidélité</span>
                </CardTitle>
                <CardDescription>
                  Vos récompenses et avantages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Mes Récompenses</Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-card-custom">
              <CardHeader>
                <CardTitle>Objectifs et Performances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Objectif mensuel</span>
                      <span className="text-sm font-medium">780,000 / 1,000,000 FCFA</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{width: '78%'}}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Nouveaux clients</span>
                      <span className="text-sm font-medium">24 / 30</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{width: '80%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom">
              <CardHeader>
                <CardTitle>Dernières Activités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Nouvelle commande</p>
                      <p className="text-sm text-muted-foreground">Client: Marie K.</p>
                    </div>
                    <span className="text-sm text-accent">25,000 FCFA</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Commission versée</p>
                      <p className="text-sm text-muted-foreground">Décembre 2024</p>
                    </div>
                    <span className="text-sm text-green-600">+45,000 FCFA</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Nouveau client</p>
                      <p className="text-sm text-muted-foreground">Jean-Paul M.</p>
                    </div>
                    <span className="text-sm text-accent">Aujourd'hui</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PartnerPortal;