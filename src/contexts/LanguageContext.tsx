import React, { createContext, useContext, useState } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

// Simple translations object
const translations = {
  fr: {
    // Navigation
    "nav.about": "À Propos",
    "nav.instructors": "Instructeurs",
    "nav.courses": "Cours",
    "nav.gallery": "Galerie",
    "nav.contact": "Contact",
    "nav.student": "Élève",
    "nav.coach": "Coach",
    "nav.admin": "Admin",
    "nav.register": "S'inscrire",
    
    // Common
    "common.welcome": "Bienvenue",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    
    // Homepage
    "hero.title": "École de Natation d'Excellence",
    "hero.subtitle": "Apprenez à nager avec les meilleurs instructeurs d'Haïti",
    "hero.cta.register": "S'inscrire Maintenant",
    "hero.cta.learn": "En Savoir Plus",
    
    // Features
    "features.title": "Pourquoi Choisir A'qua D'or ?",
    "features.safety.title": "Sécurité Maximale",
    "features.safety.description": "Instructeurs certifiés et équipements de sécurité de pointe",
    "features.personalized.title": "Cours Personnalisés",
    "features.personalized.description": "Programmes adaptés à votre niveau et vos objectifs",
    "features.excellence.title": "Excellence Pédagogique",
    "features.excellence.description": "Méthodes d'enseignement modernes et éprouvées"
  },
  en: {
    // Navigation
    "nav.about": "About",
    "nav.instructors": "Instructors",
    "nav.courses": "Courses",
    "nav.gallery": "Gallery",
    "nav.contact": "Contact",
    "nav.student": "Student",
    "nav.coach": "Coach",
    "nav.admin": "Admin",
    "nav.register": "Register",
    
    // Common
    "common.welcome": "Welcome",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    
    // Homepage
    "hero.title": "Excellence Swimming School",
    "hero.subtitle": "Learn to swim with Haiti's best instructors",
    "hero.cta.register": "Register Now",
    "hero.cta.learn": "Learn More",
    
    // Features
    "features.title": "Why Choose A'qua D'or?",
    "features.safety.title": "Maximum Safety",
    "features.safety.description": "Certified instructors and state-of-the-art safety equipment",
    "features.personalized.title": "Personalized Classes",
    "features.personalized.description": "Programs adapted to your level and goals",
    "features.excellence.title": "Teaching Excellence",
    "features.excellence.description": "Modern and proven teaching methods"
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem("language") as Language;
    return savedLang || "fr";
  });

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const setLanguageAndSave = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: setLanguageAndSave, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};