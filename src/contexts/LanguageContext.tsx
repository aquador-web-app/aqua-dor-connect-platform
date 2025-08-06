
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

// Complete translations object
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
    
    // Authentication
    "auth.signIn": "Se Connecter",
    "auth.signOut": "Se Déconnecter",
    "auth.signUp": "S'inscrire",
    "auth.email": "Email",
    "auth.password": "Mot de passe",
    "auth.confirmPassword": "Confirmer le mot de passe",
    "auth.fullName": "Nom complet",
    
    // Common
    "common.welcome": "Bienvenue",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.save": "Sauvegarder",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.view": "Voir",
    "common.close": "Fermer",
    
    // Profile
    "profile.viewProfile": "Voir le profil",
    "profile.editProfile": "Modifier le profil",
    "profile.settings": "Paramètres",
    "profile.personalInfo": "Informations personnelles",
    "profile.contactInfo": "Informations de contact",
    "profile.phone": "Téléphone",
    "profile.emergencyContact": "Contact d'urgence",
    "profile.medicalNotes": "Notes médicales",
    "profile.dateOfBirth": "Date de naissance",
    "profile.profilePicture": "Photo de profil",
    "profile.uploadImage": "Télécharger une image",
    "profile.changePassword": "Changer le mot de passe",
    "profile.currentPassword": "Mot de passe actuel",
    "profile.newPassword": "Nouveau mot de passe",
    
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
    "features.excellence.description": "Méthodes d'enseignement modernes et éprouvées",
    
    // Admin Dashboard
    "admin.dashboard": "Tableau de bord",
    "admin.overview": "Aperçu",
    "admin.users": "Utilisateurs",
    "admin.instructors": "Instructeurs",
    "admin.courses": "Cours",
    "admin.calendar": "Calendrier",
    "admin.payments": "Paiements",
    "admin.content": "Contenu",
    "admin.settings": "Paramètres",
    "admin.courseManagement": "Gestion des Cours",
    "admin.createCourse": "Créer un Cours",
    "admin.courseList": "Liste des Cours",
    
    // Course Management
    "course.title": "Titre",
    "course.description": "Description",
    "course.level": "Niveau",
    "course.price": "Prix",
    "course.duration": "Durée",
    "course.capacity": "Capacité",
    "course.status": "Statut",
    "course.actions": "Actions",
    "course.active": "Actif",
    "course.inactive": "Inactif",
    "course.beginner": "Débutant",
    "course.intermediate": "Intermédiaire",
    "course.advanced": "Avancé",
    "course.competition": "Compétition",
    "course.lifesaving": "Sauvetage",
    
    // Calendar
    "calendar.title": "Calendrier",
    "calendar.createSession": "Créer une Session",
    "calendar.reservation": "Réservation",
    "calendar.attendance": "Présence",
    "calendar.purpose": "Objectif",
    "calendar.duration": "Durée",
    "calendar.notes": "Notes",
    "calendar.markAttendance": "Marquer la Présence",
    "calendar.present": "Présent",
    "calendar.absent": "Absent",
    "calendar.reserve": "Réserver",
    "calendar.available": "Disponible",
    "calendar.reserved": "Réservé",
    "calendar.occupied": "Occupé"
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
    
    // Authentication
    "auth.signIn": "Sign In",
    "auth.signOut": "Sign Out",
    "auth.signUp": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.fullName": "Full Name",
    
    // Common
    "common.welcome": "Welcome",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.view": "View",
    "common.close": "Close",
    
    // Profile
    "profile.viewProfile": "View Profile",
    "profile.editProfile": "Edit Profile",
    "profile.settings": "Settings",
    "profile.personalInfo": "Personal Information",
    "profile.contactInfo": "Contact Information",
    "profile.phone": "Phone",
    "profile.emergencyContact": "Emergency Contact",
    "profile.medicalNotes": "Medical Notes",
    "profile.dateOfBirth": "Date of Birth",
    "profile.profilePicture": "Profile Picture",
    "profile.uploadImage": "Upload Image",
    "profile.changePassword": "Change Password",
    "profile.currentPassword": "Current Password",
    "profile.newPassword": "New Password",
    
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
    "features.excellence.description": "Modern and proven teaching methods",
    
    // Admin Dashboard
    "admin.dashboard": "Dashboard",
    "admin.overview": "Overview",
    "admin.users": "Users",
    "admin.instructors": "Instructors",
    "admin.courses": "Courses",
    "admin.calendar": "Calendar",
    "admin.payments": "Payments",
    "admin.content": "Content",
    "admin.settings": "Settings",
    "admin.courseManagement": "Course Management",
    "admin.createCourse": "Create Course",
    "admin.courseList": "Course List",
    
    // Course Management
    "course.title": "Title",
    "course.description": "Description",
    "course.level": "Level",
    "course.price": "Price",
    "course.duration": "Duration",
    "course.capacity": "Capacity",
    "course.status": "Status",
    "course.actions": "Actions",
    "course.active": "Active",
    "course.inactive": "Inactive",
    "course.beginner": "Beginner",
    "course.intermediate": "Intermediate",
    "course.advanced": "Advanced",
    "course.competition": "Competition",
    "course.lifesaving": "Lifesaving",
    
    // Calendar
    "calendar.title": "Calendar",
    "calendar.createSession": "Create Session",
    "calendar.reservation": "Reservation",
    "calendar.attendance": "Attendance",
    "calendar.purpose": "Purpose",
    "calendar.duration": "Duration",
    "calendar.notes": "Notes",
    "calendar.markAttendance": "Mark Attendance",
    "calendar.present": "Present",
    "calendar.absent": "Absent",
    "calendar.reserve": "Reserve",
    "calendar.available": "Available",
    "calendar.reserved": "Reserved",
    "calendar.occupied": "Occupied"
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
