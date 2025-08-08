
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Globe, Sun, Moon, Home, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AdminNavbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/cc4f4a67-c5a7-48a5-a575-338703b7d701.png" 
              alt="A'qua D'or" 
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center space-x-2">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 space-y-1">
                  {[
                    { key: 'overview', label: 'Aperçu' },
                    { key: 'users', label: 'Utilisateurs' },
                    { key: 'instructors', label: 'Instructeurs' },
                    { key: 'courses', label: 'Cours' },
                    { key: 'calendar', label: 'Calendrier' },
                    { key: 'payments', label: 'Paiements' },
                    { key: 'content', label: 'Contenu' },
                    { key: 'settings', label: 'Paramètres' },
                  ].map((item) => (
                    <Button
                      key={item.key}
                      variant="ghost"
                      className="w-full justify-start py-3"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('admin:setTab', { detail: item.key }));
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </nav>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                    Thème
                  </Button>
                  <Button variant="outline" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}>
                    <Globe className="h-4 w-4 mr-2" /> {language.toUpperCase()}
                  </Button>
                  <Button asChild variant="secondary" className="col-span-2">
                    <Link to="/" target="_blank" rel="noopener noreferrer">
                      <Home className="h-4 w-4 mr-2" /> Voir le site
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* View Site Button */}
            <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
              <Link to="/" target="_blank" rel="noopener noreferrer">
                <Home className="h-4 w-4 mr-2" />
                Voir le site
              </Link>
            </Button>

            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {/* Language Toggle */}
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}>
              <Globe className="h-4 w-4 mr-1" />
              {language.toUpperCase()}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
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
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
}
