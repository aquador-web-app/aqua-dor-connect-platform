import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  Settings, 
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  CalendarCheck,
  QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const sidebarItems = [
  { title: "Tableau de Bord", href: "#overview", icon: BarChart3 },
  { title: "Utilisateurs", href: "#users", icon: Users },
  { title: "Instructeurs", href: "#instructors", icon: GraduationCap },
  { title: "Cours", href: "#courses", icon: BookOpen },
  { title: "Calendrier", href: "#calendar", icon: Calendar },
  { title: "Réservations", href: "#reservations", icon: CalendarCheck },
  { title: "Présences", href: "#attendance", icon: QrCode },
  { title: "Paiements", href: "#payments", icon: CreditCard },
  { title: "Gestion Paiements", href: "#payment-manager", icon: CreditCard },
  { title: "Contenu", href: "#content", icon: FileText },
  { title: "Paramètres", href: "#settings", icon: Settings },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleTabClick = (href: string) => {
    const tab = href.replace('#', '');
    onTabChange(tab);
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">A'qua D'or</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = activeTab === item.href.replace('#', '');
          return (
            <button
              key={item.href}
              onClick={() => handleTabClick(item.href)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className={cn(
          "text-xs text-muted-foreground",
          collapsed ? "text-center" : "text-left"
        )}>
          {collapsed ? "Admin" : "Panneau d'Administration"}
        </div>
      </div>
    </div>
  );
}