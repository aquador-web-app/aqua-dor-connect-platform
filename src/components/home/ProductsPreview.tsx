import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star } from "lucide-react";

const products = [
  {
    id: 1,
    name: "Eau Minérale A'qua D'or 19L",
    description: "Eau pure et naturelle en bonbonne de 19 litres, idéale pour la famille",
    price: "2,500 FCFA",
    image: "/api/placeholder/300/200",
    category: "Eau",
    rating: 4.8,
    popular: true
  },
  {
    id: 2,
    name: "Pack Hygiène Premium",
    description: "Solution complète d'hygiène avec désinfectants et produits de nettoyage",
    price: "15,000 FCFA",
    image: "/api/placeholder/300/200",
    category: "Hygiène",
    rating: 4.9,
    popular: false
  },
  {
    id: 3,
    name: "Distributeur d'Eau Bureau",
    description: "Distributeur moderne pour bureaux avec système de refroidissement",
    price: "45,000 FCFA",
    image: "/api/placeholder/300/200",
    category: "Équipement",
    rating: 4.7,
    popular: true
  },
  {
    id: 4,
    name: "Abonnement Mensuel Famille",
    description: "Livraison régulière d'eau pure avec prix préférentiel",
    price: "8,000 FCFA/mois",
    image: "/api/placeholder/300/200",
    category: "Abonnement",
    rating: 4.9,
    popular: true
  }
];

export const ProductsPreview = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Nos Produits Phares
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez notre sélection de produits de qualité supérieure pour répondre 
            à tous vos besoins en eau et hygiène.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-luxury transition-all duration-300 border-0 shadow-card-custom overflow-hidden">
              <div className="relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.popular && (
                  <Badge className="absolute top-3 left-3 bg-accent hover:bg-accent">
                    Populaire
                  </Badge>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  <span className="text-xs font-medium">{product.rating}</span>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-accent transition-colors">
                  {product.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-4 line-clamp-2">
                  {product.description}
                </CardDescription>
                
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold text-primary">
                    {product.price}
                  </div>
                  <Button size="sm" className="group-hover:bg-accent group-hover:text-white transition-colors">
                    Commander
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button size="lg" variant="outline" className="px-8">
              Voir Tous les Produits
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};