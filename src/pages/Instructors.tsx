import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Phone, Mail, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Instructors | A'qua D'or";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Découvrez nos instructeurs de natation - profils et bios (placeholders).');
  }, []);

  useEffect(() => {
    document.title = "Instructeurs | A'qua D'or";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', "Rencontrez nos instructeurs de natation (maquette).");
  }, []);

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
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-subtle">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {t('instructors.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('instructors.subtitle')}
          </p>
        </div>

        {/* Mockup instructors grid (2x2 responsive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="hover:shadow-elegant transition-all duration-300 overflow-hidden">
              <CardHeader className="text-center pb-4">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src="/placeholder.svg" alt="Instructeur (maquette)" />
                  <AvatarFallback className="text-lg">IN</AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">John Doe</CardTitle>
                <CardDescription>Instructeur certifié</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Brève bio de l'instructeur. Passionné par l'apprentissage de la natation et la sécurité aquatique.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Instructors;