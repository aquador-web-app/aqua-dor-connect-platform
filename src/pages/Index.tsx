import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ClassesPreview from "@/components/home/ClassesPreview";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import { UnifiedCalendar } from "@/components/calendar/UnifiedCalendar";
import { DynamicContent } from "@/components/home/DynamicContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcomingSessionsList } from "@/components/dashboard/UpcomingSessionsList";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      
      {/* Calendar Booking Section */}
      <section className="py-16 bg-secondary/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Réservez Votre Cours</h2>
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
                  <UnifiedCalendar mode="public" showBookingActions={true} maxDaysAhead={90} />
                </div>
                <div>
                  {/* Upcoming list replacing any previous "Today's activity" concept */}
                  <UpcomingSessionsList mode="public" daysAhead={14} title="À venir (7–14 jours)" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="info" className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cours Individuels</CardTitle>
                    <CardDescription>Apprentissage personnalisé</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Bénéficiez d'un accompagnement sur-mesure avec nos instructeurs qualifiés. 
                      Progression rapide garantie.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Cours de Groupe</CardTitle>
                    <CardDescription>Apprentissage convivial</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Rejoignez nos groupes pour apprendre dans une ambiance détendue et motivante. 
                      Maximum 8 personnes par cours.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Cours Enfants</CardTitle>
                    <CardDescription>Sécurité et plaisir</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Programmes spécialement conçus pour les enfants de 4 à 16 ans. 
                      Apprentissage ludique dans un environnement sécurisé.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <DynamicContent />
      <FeaturesSection />
      <ClassesPreview />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;
