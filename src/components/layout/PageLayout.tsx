import { ReactNode } from "react";
import { GradientBackground } from "@/components/ui/gradient-background";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { BreadcrumbNav } from "@/components/navigation/BreadcrumbNav";
import Header from "./Header";
import Footer from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showHeader?: boolean;
  showFooter?: boolean;
  backgroundVariant?: 'primary' | 'secondary' | 'accent' | 'subtle';
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function PageLayout({
  children,
  title,
  description,
  breadcrumbs,
  showHeader = true,
  showFooter = true,
  backgroundVariant = 'subtle',
  containerSize = 'lg',
  className
}: PageLayoutProps) {
  return (
    <GradientBackground variant={backgroundVariant} className="min-h-screen flex flex-col">
      {showHeader && <Header />}
      
      <main className="flex-1">
        <ResponsiveContainer size={containerSize} className={className}>
          {breadcrumbs && <BreadcrumbNav items={breadcrumbs} className="mb-6" />}
          
          {(title || description) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-3xl font-bold mb-2">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          
          {children}
        </ResponsiveContainer>
      </main>
      
      {showFooter && <Footer />}
    </GradientBackground>
  );
}