import { Waves, MapPin, Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Waves className="h-6 w-6 text-secondary" />
              <span className="text-xl font-bold">A'qua D'or</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              École de natation prestigieuse en Haïti, offrant des services d'entraînement aquatique personnalisés pour tous les âges et niveaux.
            </p>
            <div className="flex space-x-3">
              <Facebook className="h-5 w-5 text-secondary cursor-pointer hover:text-accent transition-colors" />
              <Instagram className="h-5 w-5 text-secondary cursor-pointer hover:text-accent transition-colors" />
              <Youtube className="h-5 w-5 text-secondary cursor-pointer hover:text-accent transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Liens Rapides</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  À Propos
                </Link>
              </li>
              <li>
                <Link to="/classes" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Nos Cours
                </Link>
              </li>
              <li>
                <Link to="/instructors" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Nos Instructeurs
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Galerie
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Nos Services</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-primary-foreground/80">Cours pour Débutants</li>
              <li className="text-primary-foreground/80">Entraînement Avancé</li>
              <li className="text-primary-foreground/80">Sessions Privées</li>
              <li className="text-primary-foreground/80">Cours de Sauvetage</li>
              <li className="text-primary-foreground/80">Préparation Compétition</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                <span className="text-primary-foreground/80">
                  123 Avenue de la Plage<br />
                  Port-au-Prince, Haïti
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-secondary" />
                <span className="text-primary-foreground/80">+509 1234-5678</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-secondary" />
                <span className="text-primary-foreground/80">info@aquador.ht</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-primary-foreground/80">
            <p>&copy; 2024 A'qua D'or. Tous droits réservés.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link to="/privacy" className="hover:text-secondary transition-colors">
                Politique de Confidentialité
              </Link>
              <Link to="/terms" className="hover:text-secondary transition-colors">
                Conditions d'Utilisation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;