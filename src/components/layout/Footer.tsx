
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <img 
                src="/lovable-uploads/cc4f4a67-c5a7-48a5-a575-338703b7d701.png" 
                alt="A'qua D'or" 
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-muted-foreground mb-4">
              École de natation d'excellence offrant des cours personnalisés avec les meilleurs instructeurs d'Haïti.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-secondary transition-colors"
              >
                Facebook
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-secondary transition-colors"
              >
                Instagram
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/instructors" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.instructors')}
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.courses')}
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.gallery')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">{t('nav.contact')}</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Port-au-Prince, Haïti</p>
              <p>+509 1234 5678</p>
              <p>info@aquador.com</p>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 A'qua D'or. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
