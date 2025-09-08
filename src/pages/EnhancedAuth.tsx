import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
// import { EnhancedSignupForm } from "@/components/auth/EnhancedSignupForm";
import aquaDorLogo from "/lovable-uploads/3f4900f5-5570-4e13-84b8-a4cd1545aefe.png";

const EnhancedAuth = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à l'accueil</span>
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
              <img src={aquaDorLogo} alt="A'qua D'or Logo" className="h-10 w-10 object-contain" />
              <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                A'qua D'or
              </span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Inscription Complète</h1>
            <p className="text-muted-foreground">
              Créez votre compte et configurez votre accès complet à A'qua D'or.
            </p>
          </div>

          <Card className="hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle>Formulaire d'Inscription</CardTitle>
              <CardDescription>
                Remplissez les informations nécessaires pour créer votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8">
                <p className="text-muted-foreground">Formulaire d'inscription amélioré en cours de développement...</p>
                <Button asChild className="mt-4">
                  <Link to="/auth">Utiliser le formulaire classique</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAuth;