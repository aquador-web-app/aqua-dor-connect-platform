import { Button } from "@/components/ui/button";
import { Play, Award, Users, Waves } from "lucide-react";
const HeroSection = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-30"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container text-center text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Apprenez à Nager avec
            <span className="block bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              A'qua D'or
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            École de natation prestigieuse en Haïti offrant des cours personnalisés 
            pour tous les âges et niveaux avec des instructeurs certifiés.
          </p>
          
          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 my-12">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-2 bg-secondary/20 rounded-full">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm text-white/80">Élèves Satisfaits</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-2 bg-accent/20 rounded-full">
                <Award className="h-8 w-8 text-accent" />
              </div>
              <div className="text-2xl font-bold">15+</div>
              <div className="text-sm text-white/80">Instructeurs Certifiés</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-2 bg-secondary/20 rounded-full">
                <Waves className="h-8 w-8 text-secondary" />
              </div>
              <div className="text-2xl font-bold">10+</div>
              <div className="text-sm text-white/80">Années d'Expérience</div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg">
              S'inscrire Maintenant
            </Button>
            <Button size="lg" variant="outline" className="border-white hover:bg-white px-8 py-4 text-lg text-slate-900">
              <Play className="h-5 w-5 mr-2" />
              Voir nos Cours
            </Button>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;