import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, Calendar, Heart, Shield, Trophy } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Cours pour Tous Âges",
    description: "Des programmes adaptés pour enfants, adolescents et adultes avec des méthodes d'enseignement personnalisées."
  },
  {
    icon: Award,
    title: "Instructeurs Certifiés",
    description: "Équipe d'instructeurs qualifiés et expérimentés, certifiés par les organismes internationaux de natation."
  },
  {
    icon: Calendar,
    title: "Horaires Flexibles",
    description: "Sessions disponibles 7j/7 avec possibilité de cours privés et en groupe selon votre emploi du temps."
  },
  {
    icon: Heart,
    title: "Approche Bienveillante",
    description: "Environnement sûr et encourageant pour surmonter la peur de l'eau et développer la confiance."
  },
  {
    icon: Shield,
    title: "Sécurité Maximale",
    description: "Standards de sécurité les plus élevés avec surveillance constante et équipements de sauvetage."
  },
  {
    icon: Trophy,
    title: "Préparation Compétition",
    description: "Entraînement spécialisé pour les nageurs souhaitant participer à des compétitions locales et nationales."
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi Choisir A'qua D'or ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez ce qui fait de notre école de natation le choix préféré des familles haïtiennes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg"
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;