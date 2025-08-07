import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message envoyé!",
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const openWhatsApp = () => {
    const phoneNumber = "+50937654321"; // Replace with actual WhatsApp number
    const message = "Bonjour! Je souhaite obtenir des informations sur vos cours de natation.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-subtle">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {t('contact.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-6">Informations de Contact</h2>
              
              <div className="space-y-6">
                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <MapPin className="h-6 w-6 text-secondary mr-3" />
                    <CardTitle className="text-lg">Adresse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Rue des Palmiers, Pétion-Ville<br />
                      Port-au-Prince, Haïti<br />
                      HT-6110
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Phone className="h-6 w-6 text-accent mr-3" />
                    <CardTitle className="text-lg">Téléphone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      <a href="tel:+50937654321" className="hover:text-accent transition-colors">
                        +509 3765-4321
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      Lundi - Vendredi: 8h00 - 18h00
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Mail className="h-6 w-6 text-primary mr-3" />
                    <CardTitle className="text-lg">Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      <a href="mailto:info@aquador.ht" className="hover:text-primary transition-colors">
                        info@aquador.ht
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      Réponse sous 24h
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Clock className="h-6 w-6 text-secondary mr-3" />
                    <CardTitle className="text-lg">Horaires d'Ouverture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lundi - Vendredi:</span>
                      <span className="font-medium">6h00 - 21h00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Samedi:</span>
                      <span className="font-medium">7h00 - 19h00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimanche:</span>
                      <span className="font-medium">8h00 - 17h00</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* WhatsApp Button */}
            <Card className="bg-green-50 border-green-200 hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <MessageCircle className="h-6 w-6 mr-3" />
                  Chat WhatsApp
                </CardTitle>
                <CardDescription className="text-green-700">
                  Pour une réponse immédiate, contactez-nous via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={openWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ouvrir WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card className="hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle>Notre Localisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Carte interactive bientôt disponible
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">Envoyez-nous un Message</CardTitle>
                <CardDescription>
                  Remplissez ce formulaire et nous vous répondrons rapidement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Votre nom complet"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+509 XXXX-XXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Informations sur les cours"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Décrivez votre demande..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer le Message'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    * Champs obligatoires. Vos données sont protégées et ne seront pas partagées.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;