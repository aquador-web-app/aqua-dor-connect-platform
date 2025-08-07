
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Settings, Sun, Moon, Globe, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProfileModal } from "@/components/profile/ProfileModal";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/cc4f4a67-c5a7-48a5-a575-338703b7d701.png" 
              alt="A'qua D'or" 
              className="h-10 w-auto"
            />
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

          {/* Dashboard Login Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin-login">Admin</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/coach-login">Coach</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Étudiant</Link>
            </Button>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback>
                        {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{profile?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('profile.viewProfile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('profile.settings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('auth.signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button className="bg-gradient-accent" asChild>
                <Link to="/auth">{t('auth.signIn')}</Link>
              </Button>
            )}
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
                {t('nav.about')}
              </Link>
              <Link 
                to="/instructors" 
                className="block py-2 text-foreground hover:text-secondary transition-colors"
                onClick={toggleMenu}
              >
                {t('nav.instructors')}
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
                {t('nav.gallery')}
              </Link>
              <Link 
                to="/contact" 
                className="block py-2 text-foreground hover:text-secondary transition-colors"
                onClick={toggleMenu}
              >
                {t('nav.contact')}
              </Link>
              
              <div className="pt-4 space-y-2">
                {user ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        toggleMenu();
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      {t('profile.viewProfile')}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('auth.signOut')}
                    </Button>
                  </>
                ) : (
                  <Button className="w-full bg-gradient-accent" asChild>
                    <Link to="/auth">{t('auth.signIn')}</Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
};

export default Header;
