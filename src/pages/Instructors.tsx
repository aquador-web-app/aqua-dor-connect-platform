import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Award, Clock, DollarSign, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface Instructor {
  id: string;
  full_name: string;
  bio: string;
  specializations: string[];
  certifications: string[];
  experience_years: number;
  avatar_url: string;
  hourly_rate?: number;
}

export default function Instructors() {
  const { t } = useLanguage();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_instructors');
      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error("Error fetching instructors:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-16 w-16 bg-muted rounded-full" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-24" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-16">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('instructors.title') || 'Our Expert Instructors'}
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            {t('instructors.subtitle') || 'Meet our certified swimming instructors dedicated to your success'}
          </p>
        </div>
      </section>

      {/* Instructors Grid */}
      <section className="py-16">
        <div className="container mx-auto">
          {instructors.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏊‍♂️</div>
              <h3 className="text-2xl font-semibold mb-2">No Instructors Yet</h3>
              <p className="text-muted-foreground">Our amazing team of instructors will be featured here soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {instructors.map((instructor) => (
                <Card key={instructor.id} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    {/* Instructor Header */}
                    <div className="flex items-center space-x-4 mb-6">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src={instructor.avatar_url} />
                        <AvatarFallback className="bg-gradient-primary text-white text-lg">
                          {instructor.full_name?.[0]?.toUpperCase() || 'I'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">{instructor.full_name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {instructor.experience_years} {instructor.experience_years === 1 ? 'year' : 'years'} experience
                        </div>
                        {instructor.hourly_rate && (
                          <div className="flex items-center text-sm text-primary font-medium">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${instructor.hourly_rate}/hour
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {instructor.bio && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {instructor.bio}
                      </p>
                    )}

                    {/* Specializations */}
                    {instructor.specializations && instructor.specializations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Specializations</h4>
                        <div className="flex flex-wrap gap-1">
                          {instructor.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {instructor.specializations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{instructor.specializations.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {instructor.certifications && instructor.certifications.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Award className="h-4 w-4 mr-1" />
                          Certifications
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {instructor.certifications.slice(0, 2).map((cert) => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {instructor.certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{instructor.certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rating (placeholder for future implementation) */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="flex items-center">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground ml-2">5.0</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}