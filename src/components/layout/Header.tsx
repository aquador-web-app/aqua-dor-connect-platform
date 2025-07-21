import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Waves, User, GraduationCap, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            À Propos
          </Link>
          <Link 
            to="/instructors" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            Instructeurs
          </Link>
          <Link 
            to="/classes" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            Cours
          </Link>
          <Link 
            to="/gallery" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            Galerie
          </Link>
          <Link 
            to="/contact" 
            className="text-foreground hover:text-secondary transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Portal Access Buttons */}
        <div className="hidden md:flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/student-portal" className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>Élève</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/coach-portal" className="flex items-center space-x-1">
              <GraduationCap className="h-4 w-4" />
              <span>Coach</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin-portal" className="flex items-center space-x-1">
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </Button>
          <Button className="bg-gradient-accent">
            S'inscrire
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
              to="/classes" 
              className="block py-2 text-foreground hover:text-secondary transition-colors"
              onClick={toggleMenu}
            >
              Cours
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
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/student-portal" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Portail Élève</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/coach-portal" className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Portail Coach</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/admin-portal" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Portail Admin</span>
                </Link>
              </Button>
              <Button className="w-full bg-gradient-accent">
                S'inscrire Maintenant
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;