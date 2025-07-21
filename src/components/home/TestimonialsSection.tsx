import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Marie Kouam",
    role: "Directrice d'entreprise",
    content: "A'qua D'or nous fournit une eau de qualité exceptionnelle depuis 3 ans. Leur service de livraison est toujours ponctuel et leur équipe très professionnelle.",
    rating: 5,
    avatar: "/api/placeholder/100/100"
  },
  {
    id: 2,
    name: "Jean-Paul Mendomo",
    role: "Gérant de restaurant",
    content: "Excellent partenariat ! Leurs produits d'hygiène sont de top qualité et essentiels pour notre établissement. Je recommande vivement leurs services.",
    rating: 5,
    avatar: "/api/placeholder/100/100"
  },
  {
    id: 3,
    name: "Fatima Njoya",
    role: "Mère de famille",
    content: "Depuis que nous utilisons l'eau A'qua D'or, toute la famille se porte mieux. L'abonnement mensuel nous fait économiser et c'est très pratique.",
    rating: 5,
    avatar: "/api/placeholder/100/100"
  },
  {
    id: 4,
    name: "Paul Eteme",
    role: "Responsable d'école",
    content: "Service impeccable pour notre école. Les distributeurs d'eau sont de très bonne qualité et l'eau est toujours fraîche pour nos élèves.",
    rating: 5,
    avatar: "/api/placeholder/100/100"
  }
];

export const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Ce Que Disent Nos Clients
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les témoignages de nos clients satisfaits qui nous font confiance 
            au quotidien pour leurs besoins en eau et hygiène.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Card className="border-0 shadow-luxury bg-gradient-card">
              <CardContent className="p-8 md:p-12">
                <div className="text-center">
                  <Quote className="h-12 w-12 text-accent mx-auto mb-6" />
                  
                  <blockquote className="text-xl md:text-2xl text-primary mb-8 leading-relaxed">
                    "{currentTestimonial.content}"
                  </blockquote>
                  
                  <div className="flex justify-center mb-6">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-accent text-accent mx-0.5" />
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4">
                    <img 
                      src={currentTestimonial.avatar} 
                      alt={currentTestimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-accent/20"
                    />
                    <div className="text-left">
                      <div className="font-semibold text-primary text-lg">
                        {currentTestimonial.name}
                      </div>
                      <div className="text-muted-foreground">
                        {currentTestimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm border-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm border-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Testimonial Indicators */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? 'bg-accent' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* All Testimonials Grid (Hidden on mobile) */}
          <div className="hidden lg:grid grid-cols-2 gap-6 mt-16">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.id} 
                className={`border-0 shadow-card-custom transition-all duration-300 ${
                  index === currentIndex ? 'ring-2 ring-accent' : 'hover:shadow-luxury'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent mx-0.5" />
                    ))}
                  </div>
                  
                  <p className="text-muted-foreground mb-4 text-sm">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center space-x-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-primary text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};