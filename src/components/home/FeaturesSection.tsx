import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Droplets, 
  Shield, 
  Truck, 
  Clock, 
  Award, 
  Recycle,
  Users,
  MapPin,
  Phone,
  Star
} from "lucide-react";

const features = [
  {
    icon: Droplets,
    title: "Eau 100% Pure",
    description: "Eau traitée selon les standards internationaux avec analyses régulières de qualité"
  },
  {
    icon: Shield,
    title: "Garantie Qualité",
    description: "Certifications ISO et contrôles qualité stricts pour votre sécurité"
  },
  {
    icon: Truck,
    title: "Livraison Rapide",
    description: "Service de livraison fiable dans toute la région avec suivi en temps réel"
  },
  {
    icon: Clock,
    title: "Service 24/7",
    description: "Support client disponible à tout moment pour vos urgences"
  },
  {
    icon: Award,
    title: "Expertise Reconnue",
    description: "Plus de 10 ans d'expérience dans le secteur de l'eau et de l'hygiène"
  },
  {
    icon: Recycle,
    title: "Éco-Responsable",
    description: "Solutions durables et respect de l'environnement dans tous nos processus"
  }
];

const stats = [
  { number: "10,000+", label: "Clients Satisfaits", icon: Users },
  { number: "50+", label: "Villes Desservies", icon: MapPin },
  { number: "24/7", label: "Support Client", icon: Phone },
  { number: "4.9/5", label: "Note Moyenne", icon: Star }
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Features Grid */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Pourquoi Choisir A'qua D'or ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nous nous engageons à fournir des solutions d'eau et d'hygiène de qualité supérieure 
            avec un service client exceptionnel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-card-custom bg-gradient-card hover:shadow-luxury transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-gradient-hero rounded-full w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl text-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-primary rounded-2xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Nos Performances en Chiffres
            </h3>
            <p className="text-primary-foreground/80">
              Des résultats qui témoignent de notre engagement envers l'excellence
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-4 p-3 bg-accent rounded-full w-16 h-16 flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
                  {stat.number}
                </div>
                <div className="text-primary-foreground/80 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};