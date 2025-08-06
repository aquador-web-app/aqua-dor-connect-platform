import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Waves, User, GraduationCap, Settings, Sun, Moon, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <Waves className="h-8 w-8 text-secondary" />
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            A'qua D'or
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link 
            to="/about" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            {t('nav.about')}
          </Link>
          <Link 
            to="/instructors" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            {t('nav.instructors')}
          </Link>
          <Link 
            to="/courses" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            {t('nav.courses')}
          </Link>
          <Link 
            to="/gallery" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            {t('nav.gallery')}
          </Link>
          <Link 
            to="/contact" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            {t('nav.contact')}
          </Link>
        </nav>

        {/* Theme & Language Controls */}
        <div className="hidden md:flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}>
            <Globe className="h-4 w-4 mr-1" />
            {language.toUpperCase()}
          </Button>
        </div>

        {/* Single Sign In Button */}
        <div className="hidden md:flex items-center space-x-2">
          <Button className="bg-gradient-accent" asChild>
            <Link to="/auth">Se Connecter</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t">
          <nav className="container py-4 space-y-3">
            <Link 
              to="/about" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              À Propos
            </Link>
            <Link 
              to="/instructors" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              Instructeurs
            </Link>
            <Link 
              to="/courses" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              {t('nav.courses')}
            </Link>
            <Link 
              to="/gallery" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              Galerie
            </Link>
            <Link 
              to="/contact" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              Contact
            </Link>
            
            <div className="pt-4 space-y-2">
              <Button className="w-full bg-gradient-accent" asChild>
                <Link to="/auth">Se Connecter</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;