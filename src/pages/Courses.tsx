import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Award, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

interface CourseClass {
  id: string;
  name: string;
  description: string | null;
  level: string;
  capacity: number;
  price: number;
  duration_minutes: number;
  instructor_id: string;
  instructors?: {
    profiles: {
      full_name: string;
    };
  };
}

const Courses = () => {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('classes-changes')
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

  const fetchClasses = async () => {
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
          instructor_id,
          instructors!inner (
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'lifesaving': return 'bg-blue-100 text-blue-800';
      case 'competition': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return t('courses.levels.beginner');
      case 'intermediate': return t('courses.levels.intermediate');
      case 'advanced': return t('courses.levels.advanced');
      case 'lifesaving': return t('courses.levels.lifesaving');
      case 'competition': return t('courses.levels.competition');
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-subtle">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {t('courses.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('courses.subtitle')}
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-8">
              {t('courses.emptyState')}
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: "Initiation Aquatique",
                  level: "beginner",
                  description: "Premiers pas dans l'eau, familiarisation et techniques de base",
                  duration: 45,
                  capacity: 6,
                  price: 25
                },
                {
                  name: "Perfectionnement",
                  level: "intermediate", 
                  description: "Amélioration des techniques de nage et développement de l'endurance",
                  duration: 60,
                  capacity: 8,
                  price: 30
                },
                {
                  name: "Natation Avancée",
                  level: "advanced",
                  description: "Techniques avancées et préparation à la compétition",
                  duration: 75,
                  capacity: 10,
                  price: 40
                },
                {
                  name: "Sauvetage Aquatique",
                  level: "lifesaving",
                  description: "Formation aux techniques de sauvetage et premiers secours",
                  duration: 90,
                  capacity: 12,
                  price: 50
                },
                {
                  name: "Compétition",
                  level: "competition",
                  description: "Entraînement intensif pour nageurs de compétition",
                  duration: 120,
                  capacity: 15,
                  price: 60
                }
              ].map((course, index) => (
                <Card key={index} className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">{course.name}</CardTitle>
                      <Badge className={getLevelColor(course.level)}>
                        {getLevelText(course.level)}
                      </Badge>
                    </div>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-accent" />
                        <span>{course.duration} {t('courses.duration')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-secondary" />
                        <span>{t('courses.maxCapacity')} {course.capacity}</span>
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{course.price}€ / session</span>
                      </div>
                    </div>
                    
                    <Button className="w-full">
                      {t('courses.register')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((courseClass) => (
              <Card key={courseClass.id} className="hover:shadow-elegant transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{courseClass.name}</CardTitle>
                    <Badge className={getLevelColor(courseClass.level)}>
                      {getLevelText(courseClass.level)}
                    </Badge>
                  </div>
                  <CardDescription>{courseClass.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <span>{courseClass.duration_minutes} {t('courses.duration')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span>{t('courses.maxCapacity')} {courseClass.capacity}</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-semibold">${courseClass.price} USD / session</span>
                    </div>
                  </div>
                  
                  {courseClass.instructors && (
                    <div className="text-sm text-muted-foreground">
                      <Award className="h-4 w-4 inline mr-1" />
                      {t('courses.instructor')} {courseClass.instructors.profiles.full_name}
                    </div>
                  )}
                  
                  <Button className="w-full">
                    {t('courses.register')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Courses;