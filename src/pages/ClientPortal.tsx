import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Package, 
  Calendar, 
  FileText, 
  MessageCircle, 
  User,
  CreditCard,
  Truck
} from "lucide-react";

const ClientPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-4">Espace Client</h1>
            <p className="text-muted-foreground">
              Gérez vos commandes, abonnements et accédez à tous nos services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Quick Actions */}
            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                  <span>Nouvelle Commande</span>
                </CardTitle>
                <CardDescription>
                  Commandez de l'eau et des produits d'hygiène
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Commander Maintenant</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-accent" />
                  <span>Mes Commandes</span>
                </CardTitle>
                <CardDescription>
                  Suivez l'état de vos commandes en cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Voir les Commandes</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  <span>Abonnements</span>
                </CardTitle>
                <CardDescription>
                  Gérez vos livraisons récurrentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Gérer Abonnements</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-accent" />
                  <span>Factures</span>
                </CardTitle>
                <CardDescription>
                  Téléchargez vos factures et reçus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Voir Factures</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <span>Support Client</span>
                </CardTitle>
                <CardDescription>
                  Contactez notre équipe de support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Contacter Support</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom hover:shadow-luxury transition-all">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-accent" />
                  <span>Mon Profil</span>
                </CardTitle>
                <CardDescription>
                  Modifiez vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Éditer Profil</Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-card-custom">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-accent" />
                  <span>Prochaines Livraisons</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Eau A'qua D'or 19L x4</p>
                      <p className="text-sm text-muted-foreground">Livraison prévue</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-accent">25 Déc</p>
                      <p className="text-sm text-muted-foreground">14h00</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Pack Hygiène Premium</p>
                      <p className="text-sm text-muted-foreground">Livraison prévue</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-accent">28 Déc</p>
                      <p className="text-sm text-muted-foreground">10h00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card-custom">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-accent" />
                  <span>Résumé de Compte</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Solde du compte</span>
                    <span className="font-semibold text-primary">45,000 FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Commandes ce mois</span>
                    <span className="font-semibold text-primary">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Points fidélité</span>
                    <span className="font-semibold text-accent">1,250 pts</span>
                  </div>
                  <Button className="w-full mt-4">Recharger le Compte</Button>
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

export default ClientPortal;