import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useState, useEffect } from "react";

const testimonials = [
  {
    id: 1,
    name: "Marie Dupont",
    role: "Mère d'élève",
    content: "Ma fille de 6 ans avait peur de l'eau. Grâce aux instructeurs d'A'qua D'or, elle nage maintenant avec confiance. L'approche pédagogique est exceptionnelle.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
  },
  {
    id: 2,
    name: "Jean-Claude Pierre",
    role: "Élève adulte",
    content: "À 35 ans, j'ai appris à nager chez A'qua D'or. Les cours personnalisés et la patience des instructeurs m'ont permis de surmonter mes appréhensions.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
  },
  {
    id: 3,
    name: "Sophie Laurent",
    role: "Nageuse compétitive",
    content: "L'entraînement de compétition d'A'qua D'or m'a permis de remporter trois médailles aux championnats nationaux. Une école de référence !",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
  },
  {
    id: 4,
    name: "Philippe Moïse",
    role: "Parent",
    content: "Mes deux enfants adorent leurs cours de natation. L'équipe est professionnelle et l'environnement est parfaitement sécurisé. Je recommande vivement.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
  }
];

const TestimonialsSection = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-gradient-primary">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ce Que Disent Nos Élèves
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Découvrez les témoignages de familles qui nous font confiance pour l'apprentissage de la natation.
          </p>
        </div>
        
        {/* Featured Testimonial */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-white/10 backdrop-blur border-white/20 text-white">
            <CardContent className="p-8 text-center">
              <Quote className="h-12 w-12 text-accent mx-auto mb-6" />
              <blockquote className="text-xl md:text-2xl font-medium mb-6 leading-relaxed">
                "{testimonials[currentTestimonial].content}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <img 
                  src={testimonials[currentTestimonial].image}
                  alt={testimonials[currentTestimonial].name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                />
                <div className="text-left">
                  <div className="font-semibold text-lg">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-white/70">
                    {testimonials[currentTestimonial].role}
                  </div>
                  <div className="flex items-center mt-1">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-accent fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Testimonial Indicators */}
        <div className="flex justify-center space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTestimonial(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentTestimonial ? 'bg-accent' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        
        {/* All Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-white/5 backdrop-blur border-white/10 text-white hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-white/70 text-sm">{testimonial.role}</div>
                    <div className="flex items-center mt-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-accent fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-white/90 leading-relaxed">"{testimonial.content}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;