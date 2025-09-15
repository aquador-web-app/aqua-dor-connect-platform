import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import { RobustClassesPreview } from "@/components/home/RobustClassesPreview";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import { DynamicContent } from "@/components/home/DynamicContent";
import { VisitorCalendar } from "@/components/calendar/VisitorCalendar";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <DynamicContent />
      <FeaturesSection />
      
      {/* Calendar Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <VisitorCalendar />
        </div>
      </section>
      
      <RobustClassesPreview />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;
