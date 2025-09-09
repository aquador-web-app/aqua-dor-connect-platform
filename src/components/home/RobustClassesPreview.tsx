import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CourseClass {
  id: string;
  name: string;
  description: string | null;
  level: string;
  capacity: number;
  price: number;
  duration_minutes: number;
  instructor_name?: string;
}

// Fallback classes for offline mode
const fallbackClasses: CourseClass[] = [
  {
    id: "demo-1",
    name: "Natation Débutant",
    description: "Introduction à l'eau pour débutants. Apprentissage des mouvements de base dans un environnement sécurisé.",
    duration_minutes: 45,
    capacity: 8,
    level: "beginner",
    price: 35,
    instructor_name: "Instructeur Principal"
  },
  {
    id: "demo-2",
    name: "Perfectionnement Adulte",
    description: "Amélioration des techniques pour nageurs ayant des bases. Perfectionnement de la respiration et de l'endurance.",
    duration_minutes: 60,
    capacity: 6,
    level: "intermediate",
    price: 45,
    instructor_name: "Expert Technique"
  },
  {
    id: "demo-3",
    name: "Compétition Avancée",
    description: "Entraînement intensif pour nageurs confirmés. Préparation aux compétitions avec techniques avancées.",
    duration_minutes: 90,
    capacity: 4,
    level: "advanced",
    price: 60,
    instructor_name: "Coach Champion"
  }
];

export function RobustClassesPreview() {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
    
    // Set up real-time subscription with error handling
    let channel: any = null;
    try {
      channel = supabase
        .channel('classes-preview-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'classes'
        }, () => {
          console.log('Classes updated, refreshing...');
          fetchClasses();
        })
        .subscribe();
    } catch (realtimeError) {
      console.warn('Failed to setup real-time subscription for classes:', realtimeError);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.warn('Failed to cleanup classes subscription:', cleanupError);
        }
      }
    };
  }, []);

  const fetchClasses = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      setIsOffline(false);
      
      // Simple query with timeout
      const { data, error } = await Promise.race([
        supabase
          .from('classes')
          .select(`
            id,
            name,
            description,
            level,
            capacity,
            price,
            duration_minutes
          `)
          .eq('is_active', true)
          .order('level', { ascending: true })
          .limit(6),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 8000)
        )
      ]) as any;

      if (error) throw error;

      // Try to get instructor info separately (non-blocking)
      const classesWithInstructors = await Promise.allSettled(
        (data || []).map(async (classItem: any) => {
          try {
            const { data: instructorData } = await Promise.race([
              supabase
                .from('instructors')
                .select('profiles!inner(full_name)')
                .eq('id', classItem.instructor_id)
                .limit(1)
                .single(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Instructor timeout')), 3000)
              )
            ]) as any;

            return {
              ...classItem,
              instructor_name: instructorData?.profiles?.full_name || 'Instructeur qualifié'
            };
          } catch {
            return {
              ...classItem,
              instructor_name: 'Instructeur qualifié'
            };
          }
        })
      );

      const resolvedClasses = classesWithInstructors.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ).filter(item => item && typeof item === 'object');

      setClasses(resolvedClasses);
      
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setError(error.message);
      
      // Retry logic for network failures
      if (retryCount < 2 && (
        error.message?.includes('fetch') || 
        error.message?.includes('timeout') ||
        error.name === 'TypeError'
      )) {
        console.log(`Retrying classes fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchClasses(retryCount + 1), 1500 * (retryCount + 1));
        return;
      }
      
      // Use fallback data on final failure
      console.log('Using fallback classes data');
      setClasses(fallbackClasses);
      setIsOffline(true);
      
      if (retryCount >= 2) {
        toast({
          title: "Mode démonstration",
          description: "Affichage des cours de démonstration",
          variant: "default"
        });
      }
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

  const handleReserveClick = (classId: string) => {
    if (!user) {
      navigate('/auth', { 
        state: { 
          redirectTo: '/courses',
          classId 
        }
      });
      return;
    }
    navigate(`/courses?class=${classId}`);
  };

  if (loading) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Nos Cours de Natation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Chargement des programmes disponibles...
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <div className="h-6 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                  <div className="flex justify-between">
                    <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Nos Cours de Natation
            </h2>
            {isOffline && (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                Démo
              </Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des programmes adaptés à chaque niveau, de l'initiation à la compétition professionnelle.
          </p>
          {isOffline && (
            <p className="text-sm text-orange-600 mt-2">
              Mode démonstration - Les données affichées sont des exemples
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="group overflow-hidden hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{classItem.name}</CardTitle>
                  <Badge className={getLevelColor(classItem.level)}>
                    {getLevelText(classItem.level)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base min-h-[60px]">
                  {classItem.description || 'Programme de natation professionnel'}
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

                {classItem.instructor_name && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Instructeur:</strong> {classItem.instructor_name}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4">
                  <div className="text-2xl font-bold text-primary">
                    ${Number(classItem.price).toFixed(2)} USD
                  </div>
                  <Button 
                    className="bg-gradient-accent"
                    onClick={() => handleReserveClick(classItem.id)}
                  >
                    Réserver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" variant="outline" className="px-8" asChild>
            <Link to="/courses">Voir Tous les Cours</Link>
          </Button>
        </div>

        {error && !isOffline && (
          <div className="text-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchClasses()}
              className="text-orange-600 border-orange-600"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}