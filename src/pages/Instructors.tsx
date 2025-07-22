import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Phone, Mail, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Instructor {
  id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    phone: string | null;
  };
  bio: string | null;
  specializations: string[];
  certifications: string[];
  experience_years: number;
  hourly_rate: number | null;
}

const Instructors = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select(`
          id,
          bio,
          specializations,
          certifications,
          experience_years,
          hourly_rate,
          profiles!inner (
            full_name,
            avatar_url,
            email,
            phone
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const formattedInstructors = data?.map((instructor: any) => ({
        id: instructor.id,
        profile: instructor.profiles,
        bio: instructor.bio,
        specializations: instructor.specializations || [],
        certifications: instructor.certifications || [],
        experience_years: instructor.experience_years || 0,
        hourly_rate: instructor.hourly_rate
      })) || [];

      setInstructors(formattedInstructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Nos Instructeurs
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Rencontrez notre équipe d'instructeurs certifiés et passionnés, 
            dédiés à vous accompagner dans votre apprentissage aquatique.
          </p>
        </div>

        {instructors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Nos instructeurs seront bientôt présentés ici. Restez connectés!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {instructors.map((instructor) => (
              <Card key={instructor.id} className="hover:shadow-elegant transition-all duration-300 overflow-hidden">
                <CardHeader className="text-center pb-4">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage 
                      src={instructor.profile.avatar_url || ""} 
                      alt={instructor.profile.full_name || "Instructeur"} 
                    />
                    <AvatarFallback className="text-lg">
                      {instructor.profile.full_name?.split(' ').map(n => n[0]).join('') || 'IN'}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl">
                    {instructor.profile.full_name || 'Instructeur'}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center space-x-1">
                    <Award className="h-4 w-4" />
                    <span>{instructor.experience_years} ans d'expérience</span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {instructor.bio && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {instructor.bio}
                    </p>
                  )}
                  
                  {instructor.specializations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Spécialisations:</h4>
                      <div className="flex flex-wrap gap-1">
                        {instructor.specializations.map((spec, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {instructor.certifications.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Certifications:</h4>
                      <div className="flex flex-wrap gap-1">
                        {instructor.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-2 pt-4">
                    {instructor.profile.email && (
                      <Button variant="outline" size="sm" className="justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Contacter
                      </Button>
                    )}
                    
                    {instructor.hourly_rate && (
                      <div className="text-center p-2 bg-accent/10 rounded-md">
                        <span className="text-sm text-muted-foreground">Tarif: </span>
                        <span className="font-semibold text-accent">
                          {instructor.hourly_rate}€/h
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Instructors;