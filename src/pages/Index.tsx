import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import { RobustClassesPreview } from "@/components/home/RobustClassesPreview";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import { PublicCalendarWithReservation } from "@/components/calendar/PublicCalendarWithReservation";
import { DynamicContent } from "@/components/home/DynamicContent";
import { ReservationNotificationBell } from "@/components/admin/ReservationNotificationBell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcomingSessionsList } from "@/components/dashboard/UpcomingSessionsList";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      
      {/* Calendar Booking Section */}
      <section className="py-16 bg-secondary/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('hero.cta.register')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez nos créneaux disponibles et réservez directement en ligne. 
              Nos instructeurs expérimentés vous accompagneront dans votre apprentissage.
            </p>
          </div>
          
          <Tabs defaultValue="booking" className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="booking">Réserver un cours</TabsTrigger>
              <TabsTrigger value="info">Informations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="booking" className="mt-8">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div className="bg-card border rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span>Sessions disponibles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>Places limitées</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-destructive rounded-full"></div>
                        <span>Complet</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      🔒 Connexion requise pour réserver • 📱 Mise à jour temps réel
                    </p>
                  </div>
        <div className="animate-fade-in">
          <PublicCalendarWithReservation />
        </div>
        <div className="fixed top-4 right-4 z-50">
          <ReservationNotificationBell />
        </div>
                </div>
                <div>
                  <UpcomingSessionsList mode="public" daysAhead={14} title="À venir (14 jours)" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="info" className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-primary">Cours Individuels</CardTitle>
                    <CardDescription>Apprentissage personnalisé</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Bénéficiez d'un accompagnement sur-mesure avec nos instructeurs qualifiés. 
                      Progression rapide garantie.
                    </p>
                    <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                      <p className="font-semibold text-secondary">À partir de $60 USD</p>
                      <p className="text-xs text-muted-foreground">Durée: 60 minutes</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-primary">Cours de Groupe</CardTitle>
                    <CardDescription>Apprentissage convivial</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Rejoignez nos groupes pour apprendre dans une ambiance détendue et motivante. 
                      Maximum 8 personnes par cours.
                    </p>
                    <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                      <p className="font-semibold text-secondary">À partir de $35 USD</p>
                      <p className="text-xs text-muted-foreground">Durée: 60 minutes</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-primary">Cours Enfants</CardTitle>
                    <CardDescription>Sécurité et plaisir</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Programmes spécialement conçus pour les enfants de 4 à 16 ans. 
                      Apprentissage ludique dans un environnement sécurisé.
                    </p>
                    <div className="mt-4 p-3 bg-secondary/10 rounded-lg">
                      <p className="font-semibold text-secondary">À partir de $30 USD</p>
                      <p className="text-xs text-muted-foreground">Durée: 45 minutes</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <DynamicContent />
      <FeaturesSection />
      <RobustClassesPreview />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;
