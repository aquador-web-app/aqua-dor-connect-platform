import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Droplets, Users, Building, ArrowRight } from "lucide-react";

const slides = [
  {
    title: "Eau Pure, Vie Pure",
    subtitle: "Découvrez notre gamme complète d'eau de haute qualité",
    description: "Des solutions d'hydratation premium pour votre famille et votre entreprise",
    image: "/api/placeholder/1200/600",
    cta: "Commander Maintenant"
  },
  {
    title: "Solutions d'Hygiène Complètes",
    subtitle: "Produits d'hygiène professionnels pour tous vos besoins",
    description: "De la maison au bureau, nous avons tout ce qu'il vous faut",
    image: "/api/placeholder/1200/600",
    cta: "Voir Nos Produits"
  },
  {
    title: "Devenez Notre Partenaire",
    subtitle: "Rejoignez notre réseau de distribution",
    description: "Opportunités d'affaires lucratives dans le secteur de l'eau",
    image: "/api/placeholder/1200/600",
    cta: "Devenir Partenaire"
  }
];

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-hero">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Slide Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="container mx-auto px-4 z-10">
          <div className="text-center text-white max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-blue-100">
              {slides[currentSlide].subtitle}
            </p>
            <p className="text-lg mb-8 text-blue-50 max-w-2xl mx-auto">
              {slides[currentSlide].description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white px-8 py-4 text-lg">
                {slides[currentSlide].cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary px-8 py-4 text-lg">
                En Savoir Plus
              </Button>
            </div>

            {/* Access Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link to="/client">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                  <Droplets className="h-12 w-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-2">Espace Client</h3>
                  <p className="text-blue-100">Commandez, suivez vos livraisons et gérez vos abonnements</p>
                </div>
              </Link>
              
              <Link to="/partner">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                  <Building className="h-12 w-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-2">Espace Partenaire</h3>
                  <p className="text-blue-100">Rejoignez notre réseau et développez votre activité</p>
                </div>
              </Link>
              
              <Link to="/admin">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                  <Users className="h-12 w-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-2">Administration</h3>
                  <p className="text-blue-100">Gestion complète de la plateforme et des opérations</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all z-20"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all z-20"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-accent' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};