import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star } from "lucide-react";

const classes = [
  {
    id: 1,
    name: "Débutant Enfant",
    description: "Introduction à l'eau pour les enfants de 4-8 ans. Apprentissage des bases de la natation dans un environnement ludique.",
    duration: "45 min",
    capacity: "6 élèves max",
    level: "Débutant",
    price: "2,500 HTG",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 2,
    name: "Adulte Perfectionnement",
    description: "Amélioration des techniques de nage pour adultes ayant déjà des bases. Focus sur l'endurance et la technique.",
    duration: "60 min",
    capacity: "8 élèves max",
    level: "Intermédiaire",
    price: "3,000 HTG",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  },
  {
    id: 3,
    name: "Compétition",
    description: "Entraînement intensif pour nageurs souhaitant participer à des compétitions. Techniques avancées et préparation physique.",
    duration: "90 min",
    capacity: "4 élèves max",
    level: "Avancé",
    price: "4,500 HTG",
    image: "https://images.unsplash.com/photo-1571079570759-5d1b5750b596?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  }
];

const ClassesPreview = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Nos Cours de Natation
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des programmes adaptés à chaque niveau, de l'initiation à la compétition professionnelle.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="group overflow-hidden hover:shadow-elegant transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src={classItem.image} 
                  alt={classItem.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    variant="secondary" 
                    className={`${
                      classItem.level === 'Débutant' ? 'bg-secondary/20 text-secondary' :
                      classItem.level === 'Intermédiaire' ? 'bg-accent/20 text-accent' :
                      'bg-primary/20 text-primary'
                    }`}
                  >
                    {classItem.level}
                  </Badge>
                  <div className="flex items-center text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                <CardTitle className="text-xl">{classItem.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  {classItem.description}
                </CardDescription>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{classItem.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{classItem.capacity}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="text-2xl font-bold text-primary">
                    {classItem.price}
                  </div>
                  <Button className="bg-gradient-accent">
                    Réserver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" variant="outline" className="px-8">
            Voir Tous les Cours
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ClassesPreview;