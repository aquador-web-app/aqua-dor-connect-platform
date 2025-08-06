
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/placeholder.svg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          {t('hero.title')}
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          {t('hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-accent text-lg px-8 py-3" asChild>
            <Link to="/auth">{t('hero.cta.register')}</Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-foreground"
            asChild
          >
            <Link to="/about">{t('hero.cta.learn')}</Link>
          </Button>
        </div>
      </div>

      {/* Floating Animation Elements */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-4 h-4 bg-secondary/30 rounded-full animate-bounce" 
             style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-20 w-3 h-3 bg-primary/40 rounded-full animate-bounce" 
             style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-accent/50 rounded-full animate-bounce" 
             style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
      </div>
    </section>
  );
};

export default HeroSection;
