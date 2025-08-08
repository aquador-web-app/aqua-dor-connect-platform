
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
    "profile.address": "Adresse",
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
    "features.subtitle": "Découvrez ce qui fait de A'qua D'or l'école de natation de référence en Haïti",
    "features.safety.title": "Sécurité Maximale",
    "features.safety.description": "Instructeurs certifiés et équipements de sécurité de pointe",
    "features.personalized.title": "Cours Personnalisés",
    "features.personalized.description": "Programmes adaptés à votre niveau et vos objectifs",
    "features.excellence.title": "Excellence Pédagogique",
    "features.excellence.description": "Méthodes d'enseignement modernes et éprouvées",
    
    // About page
    "about.title": "À Propos d'A'qua D'or",
    "about.subtitle": "École de natation de référence en Haïti, nous transformons la peur de l'eau en confiance et passion aquatique depuis plus de 10 ans.",
    "about.mission.title": "Notre Mission",
    "about.mission.description": "Démocratiser l'apprentissage de la natation en Haïti en offrant des cours personnalisés, sécurisés et adaptés à tous les âges. Nous créons un environnement bienveillant où chaque élève peut développer ses compétences aquatiques à son rythme.",
    "about.values.title": "Nos Valeurs",
    "about.values.safety": "Sécurité",
    "about.values.excellence": "Excellence", 
    "about.values.kindness": "Bienveillance",
    "about.values.innovation": "Innovation",
    "about.values.community": "Communauté",
    "about.stats.students": "Élèves formés",
    "about.stats.instructors": "Instructeurs certifiés",
    "about.stats.experience": "Années d'expérience",
    "about.story.title": "Notre Histoire",
    
    // Instructors page
    "instructors.title": "Nos Instructeurs",
    "instructors.subtitle": "Rencontrez notre équipe d'instructeurs certifiés et passionnés, dédiés à vous accompagner dans votre apprentissage aquatique.",
    "instructors.emptyState": "Nos instructeurs seront bientôt présentés ici. Restez connectés!",
    "instructors.experience": "ans d'expérience",
    "instructors.specializations": "Spécialisations:",
    "instructors.certifications": "Certifications:",
    "instructors.contact": "Contacter",
    "instructors.rate": "Tarif:",
    
    // Courses page
    "courses.title": "Nos Cours",
    "courses.subtitle": "Découvrez nos programmes d'apprentissage adaptés à tous les niveaux, du débutant au nageur de compétition.",
    "courses.emptyState": "Nos cours seront bientôt disponibles. En attendant, voici un aperçu de nos programmes:",
    "courses.register": "S'inscrire au cours",
    "courses.instructor": "Instructeur:",
    "courses.duration": "min",
    "courses.maxCapacity": "Max",
    
    // Gallery page
    "gallery.title": "Galerie",
    "gallery.subtitle": "Découvrez les moments forts de notre école de natation à travers photos et vidéos.",
    "gallery.filters.all": "Tout",
    "gallery.filters.photos": "Photos",
    "gallery.filters.videos": "Vidéos",
    "gallery.types.photo": "Photo",
    "gallery.types.video": "Vidéo",
    "gallery.featured": "À la une",
    "gallery.emptyState": "Aucun élément trouvé pour cette catégorie.",
    "gallery.videoNotSupported": "Votre navigateur ne supporte pas la lecture vidéo.",
    
    // Contact page
    "contact.title": "Contactez-Nous",
    "contact.subtitle": "Vous avez des questions ? Nous sommes là pour vous aider ! Contactez-nous par téléphone, email ou visitez-nous directement.",
    "contact.info.title": "Informations de Contact",
    "contact.info.address": "Adresse",
    "contact.info.phone": "Téléphone",
    "contact.info.email": "Email",
    "contact.info.hours": "Horaires d'Ouverture",
    "contact.form.title": "Envoyez-nous un Message",
    "contact.form.subtitle": "Remplissez ce formulaire et nous vous répondrons rapidement.",
    "contact.form.name": "Nom complet",
    "contact.form.email": "Email",
    "contact.form.phone": "Téléphone",
    "contact.form.subject": "Sujet",
    "contact.form.message": "Message",
    "contact.form.send": "Envoyer le Message",
    "contact.form.sending": "Envoi en cours...",
    "contact.form.required": "Champs obligatoires. Vos données sont protégées et ne seront pas partagées.",
    "contact.whatsapp.title": "Chat WhatsApp",
    "contact.whatsapp.subtitle": "Pour une réponse immédiate, contactez-nous via WhatsApp",
    "contact.whatsapp.button": "Ouvrir WhatsApp",
    "contact.map.title": "Notre Localisation",
    "contact.map.placeholder": "Carte interactive bientôt disponible",
    
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
    "profile.address": "Address",
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
    "features.subtitle": "Discover what makes A'qua D'or Haiti's leading swimming school",
    "features.safety.title": "Maximum Safety",
    "features.safety.description": "Certified instructors and state-of-the-art safety equipment",
    "features.personalized.title": "Personalized Classes",
    "features.personalized.description": "Programs adapted to your level and goals",
    "features.excellence.title": "Teaching Excellence",
    "features.excellence.description": "Modern and proven teaching methods",
    
    // About page
    "about.title": "About A'qua D'or",
    "about.subtitle": "Haiti's leading swimming school, we transform fear of water into confidence and aquatic passion for over 10 years.",
    "about.mission.title": "Our Mission",
    "about.mission.description": "Democratize swimming education in Haiti by offering personalized, secure courses adapted to all ages. We create a caring environment where each student can develop their aquatic skills at their own pace.",
    "about.values.title": "Our Values",
    "about.values.safety": "Safety",
    "about.values.excellence": "Excellence",
    "about.values.kindness": "Kindness",
    "about.values.innovation": "Innovation",
    "about.values.community": "Community",
    "about.stats.students": "Students trained",
    "about.stats.instructors": "Certified instructors",
    "about.stats.experience": "Years of experience",
    "about.story.title": "Our Story",
    
    // Instructors page
    "instructors.title": "Our Instructors", 
    "instructors.subtitle": "Meet our team of certified and passionate instructors, dedicated to supporting you in your aquatic learning.",
    "instructors.emptyState": "Our instructors will be featured here soon. Stay tuned!",
    "instructors.experience": "years of experience",
    "instructors.specializations": "Specializations:",
    "instructors.certifications": "Certifications:",
    "instructors.contact": "Contact",
    "instructors.rate": "Rate:",
    
    // Courses page
    "courses.title": "Our Courses",
    "courses.subtitle": "Discover our learning programs adapted to all levels, from beginner to competitive swimmer.",
    "courses.emptyState": "Our courses will be available soon. Meanwhile, here's an overview of our programs:",
    "courses.register": "Register for course",
    "courses.instructor": "Instructor:",
    "courses.duration": "min",
    "courses.maxCapacity": "Max",
    
    // Gallery page
    "gallery.title": "Gallery",
    "gallery.subtitle": "Discover the highlights of our swimming school through photos and videos.",
    "gallery.filters.all": "All",
    "gallery.filters.photos": "Photos",
    "gallery.filters.videos": "Videos",
    "gallery.types.photo": "Photo",
    "gallery.types.video": "Video",
    "gallery.featured": "Featured",
    "gallery.emptyState": "No items found for this category.",
    "gallery.videoNotSupported": "Your browser does not support video playback.",
    
    // Contact page
    "contact.title": "Contact Us",
    "contact.subtitle": "Have questions? We're here to help! Contact us by phone, email or visit us directly.",
    "contact.info.title": "Contact Information",
    "contact.info.address": "Address",
    "contact.info.phone": "Phone",
    "contact.info.email": "Email",
    "contact.info.hours": "Opening Hours",
    "contact.form.title": "Send us a Message",
    "contact.form.subtitle": "Fill out this form and we'll get back to you quickly.",
    "contact.form.name": "Full name",
    "contact.form.email": "Email",
    "contact.form.phone": "Phone",
    "contact.form.subject": "Subject",
    "contact.form.message": "Message",
    "contact.form.send": "Send Message",
    "contact.form.sending": "Sending...",
    "contact.form.required": "Required fields. Your data is protected and will not be shared.",
    "contact.whatsapp.title": "WhatsApp Chat",
    "contact.whatsapp.subtitle": "For an immediate response, contact us via WhatsApp",
    "contact.whatsapp.button": "Open WhatsApp",
    "contact.map.title": "Our Location",
    "contact.map.placeholder": "Interactive map coming soon",
    
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
