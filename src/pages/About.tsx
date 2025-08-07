import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, Heart, Target } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-subtle">
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              {t('about.title')}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t('about.subtitle')}
            </p>
          </div>

          {/* Mission & Values */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <Target className="h-6 w-6 text-secondary" />
                  <span>{t('about.mission.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.mission.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <Heart className="h-6 w-6 text-accent" />
                  <span>{t('about.values.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="secondary" className="mr-2">{t('about.values.safety')}</Badge>
                  <Badge variant="secondary" className="mr-2">{t('about.values.excellence')}</Badge>
                  <Badge variant="secondary" className="mr-2">{t('about.values.kindness')}</Badge>
                  <Badge variant="secondary" className="mr-2">{t('about.values.innovation')}</Badge>
                  <Badge variant="secondary" className="mr-2">{t('about.values.community')}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="text-center hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <Users className="h-8 w-8 text-secondary mx-auto mb-2" />
                <CardTitle className="text-3xl font-bold text-primary">500+</CardTitle>
                <CardDescription>{t('about.stats.students')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <Award className="h-8 w-8 text-accent mx-auto mb-2" />
                <CardTitle className="text-3xl font-bold text-primary">15</CardTitle>
                <CardDescription>{t('about.stats.instructors')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <Target className="h-8 w-8 text-secondary mx-auto mb-2" />
                <CardTitle className="text-3xl font-bold text-primary">10+</CardTitle>
                <CardDescription>{t('about.stats.experience')}</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Our Story */}
          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl">{t('about.story.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <p className="leading-relaxed mb-4">
                  Fondée en 2014, A'qua D'or est née d'une vision simple : rendre la natation accessible à tous les Haïtiens, 
                  quel que soit leur âge ou leur niveau de départ. Nous avons commencé avec une petite piscine et une grande 
                  passion pour l'enseignement aquatique.
                </p>
                <p className="leading-relaxed mb-4">
                  Aujourd'hui, nous sommes fiers d'être reconnus comme l'une des écoles de natation les plus réputées d'Haïti, 
                  avec des installations modernes et une équipe d'instructeurs hautement qualifiés. Nos programmes incluent 
                  l'apprentissage de base, le perfectionnement, la natation de compétition, et même le sauvetage aquatique.
                </p>
                <p className="leading-relaxed">
                  Notre approche pédagogique unique combine techniques modernes d'enseignement, sécurité maximale, et 
                  respect du rythme individuel de chaque apprenant. Nous créons des nageurs confiants et des citoyens 
                  responsables autour de l'eau.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;