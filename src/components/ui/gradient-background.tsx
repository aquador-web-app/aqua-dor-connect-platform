import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'subtle';
  className?: string;
}

export function GradientBackground({ 
  children, 
  variant = 'subtle',
  className 
}: GradientBackgroundProps) {
  const gradientClasses = {
    primary: "bg-gradient-to-br from-primary to-secondary",
    secondary: "bg-gradient-to-br from-secondary to-accent/20",
    accent: "bg-gradient-to-br from-accent to-secondary/20", 
    subtle: "bg-gradient-to-br from-background to-secondary/10"
  };

  return (
    <div className={cn(gradientClasses[variant], className)}>
      {children}
    </div>
  );
}