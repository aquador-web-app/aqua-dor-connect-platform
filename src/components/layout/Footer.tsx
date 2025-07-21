import { Link } from "react-router-dom";
import { Droplets, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-lg">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">A'qua D'or</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Votre partenaire de confiance pour une eau pure et des solutions d'hygiène de qualité supérieure.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 cursor-pointer hover:text-accent transition-colors" />
              <Twitter className="h-5 w-5 cursor-pointer hover:text-accent transition-colors" />
              <Instagram className="h-5 w-5 cursor-pointer hover:text-accent transition-colors" />
              <Linkedin className="h-5 w-5 cursor-pointer hover:text-accent transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Liens Rapides</h3>
            <div className="space-y-2">
              <Link to="/products" className="block text-sm hover:text-accent transition-colors">
                Nos Produits
              </Link>
              <Link to="/about" className="block text-sm hover:text-accent transition-colors">
                À Propos
              </Link>
              <Link to="/blog" className="block text-sm hover:text-accent transition-colors">
                Blog
              </Link>
              <Link to="/testimonials" className="block text-sm hover:text-accent transition-colors">
                Témoignages
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Services</h3>
            <div className="space-y-2">
              <Link to="/client" className="block text-sm hover:text-accent transition-colors">
                Espace Client
              </Link>
              <Link to="/partner" className="block text-sm hover:text-accent transition-colors">
                Devenir Partenaire
              </Link>
              <Link to="/support" className="block text-sm hover:text-accent transition-colors">
                Support Client
              </Link>
              <Link to="/faq" className="block text-sm hover:text-accent transition-colors">
                FAQ
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-accent" />
                <span className="text-sm">+237 XXX XXX XXX</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-accent" />
                <span className="text-sm">contact@aquador.com</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span className="text-sm">Douala, Cameroun</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-primary-foreground/80">
              © {new Date().getFullYear()} A'qua D'or. Tous droits réservés.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy" className="hover:text-accent transition-colors">
                Politique de Confidentialité
              </Link>
              <Link to="/terms" className="hover:text-accent transition-colors">
                Conditions d'Utilisation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};