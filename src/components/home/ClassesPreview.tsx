import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CourseClass {
  id: string;
  name: string;
  description: string | null;
  level: string;
  capacity: number;
  price: number;
  duration_minutes: number;
  instructors?: {
    profiles: {
      full_name: string;
    };
  };
}

const fallbackClasses = [
  {
    id: "1",
    name: "Débutant Enfant",
    description: "Introduction à l'eau pour les enfants de 4-8 ans. Apprentissage des bases de la natation dans un environnement ludique.",
    duration_minutes: 45,
    capacity: 6,
    level: "beginner",
    price: 25,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  },
  {
    id: "2",
    name: "Adulte Perfectionnement",
    description: "Amélioration des techniques de nage pour adultes ayant déjà des bases. Focus sur l'endurance et la technique.",
    duration_minutes: 60,
    capacity: 8,
    level: "intermediate",
    price: 30,
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  },
  {
    id: "3",
    name: "Compétition",
    description: "Entraînement intensif pour nageurs souhaitant participer à des compétitions. Techniques avancées et préparation physique.",
    duration_minutes: 90,
    capacity: 4,
    level: "advanced",
    price: 45,
    image: "https://images.unsplash.com/photo-1571079570759-5d1b5750b596?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
  }
];

const ClassesPreview = () => {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('classes-preview-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        () => {
          fetchClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClasses = async (retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          level,
          capacity,
          price,
          duration_minutes,
          instructors!inner (
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('is_active', true)
        .limit(3)
        .abortSignal(AbortSignal.timeout(10000));

      if (error && !error.message.includes('aborted')) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      
      // Retry logic for network failures
      if (retryCount < 2 && (error instanceof TypeError || error?.message?.includes('fetch'))) {
        console.log(`Retrying classes fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchClasses(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      // Use fallback classes if fetch fails completely
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      case 'lifesaving': return 'Sauvetage';
      case 'competition': return 'Compétition';
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-secondary/20 text-secondary';
      case 'intermediate': return 'bg-accent/20 text-accent';
      case 'advanced': return 'bg-primary/20 text-primary';
      case 'lifesaving': return 'bg-blue-500/20 text-blue-500';
      case 'competition': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getClassImage = (level: string) => {
    switch (level) {
      case 'beginner': return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
      case 'intermediate': return "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
      case 'advanced': return "https://images.unsplash.com/photo-1571079570759-5d1b5750b596?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
      default: return "https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
    }
  };

  const displayClasses = classes.length > 0 ? classes : fallbackClasses;

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
          {displayClasses.map((classItem) => (
            <Card key={classItem.id} className="group overflow-hidden hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl">{classItem.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  {classItem.description}
                </CardDescription>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{classItem.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Max {classItem.capacity}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="text-2xl font-bold text-primary">
                    ${Number(classItem.price).toFixed(2)} USD
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