import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Waves, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';
import { Link } from "react-router-dom";
import aquaDorLogo from "/lovable-uploads/3f4900f5-5570-4e13-84b8-a4cd1545aefe.png";
const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    role: 'student' as 'student' | 'instructor',
    referralCode: ''
  });
  const [isAdult, setIsAdult] = useState<'yes' | 'no' | ''>('');
  const [isParent, setIsParent] = useState<'yes' | 'no'>('no');
  const [hasReferral, setHasReferral] = useState<'yes' | 'no'>('no');
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const getRedirectPath = (role: string) => {
    switch (role) {
      case 'admin':
      case 'co_admin':
        return '/admin-portal';
      case 'instructor':
        return '/coach-portal';
      case 'parent':
        return '/parent-portal';
      case 'student':
        return '/student-portal';
      default:
        return '/';
    }
  };
  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    if (referralCode) {
      setSignupForm(prev => ({ ...prev, referralCode }));
    }

    // Set up auth state listener FIRST
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Redirect authenticated users based on role
      if (session?.user) {
        setTimeout(async () => {
          try {
            const {
              data: roleData
            } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
            const role = roleData?.role || 'student';
            const redirectPath = getRedirectPath(role);
            navigate(redirectPath);
          } catch (error) {
            console.error('Error fetching user role:', error);
            navigate('/');
          }
        }, 1000);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        try {
          // Check user role and redirect accordingly
          const {
            data: roleData
          } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
          const role = roleData?.role || 'student';
          const redirectPath = getRedirectPath(role);
          navigate(redirectPath);
        } catch (error) {
          console.error('Error fetching user role:', error);
          navigate('/');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      if (error) throw error;
      toast({
        title: "Connexion réussie!",
        description: "Vous êtes maintenant connecté."
      });
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur s'est produite lors de la connexion.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive"
      });
      return;
    }
    if (signupForm.password.length < 12) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 12 caractères.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Determine role based on age/parent answers
      if (isAdult === '') {
        toast({
          title: 'Information manquante',
          description: 'Veuillez indiquer si vous avez 18 ans ou plus.',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }
      if (isAdult === 'no') {
        toast({
          title: 'Inscription parent requise',
          description: 'Un parent doit créer le compte. Redirection vers le formulaire parent...'
        });
        setIsParent('yes');
        navigate('/auth?as=parent');
        setIsSubmitting(false);
        return;
      }
      const computedRole = isParent === 'yes' ? 'parent' : 'student';
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupForm.fullName,
            phone: signupForm.phone,
            referral_code: signupForm.referralCode || null
          }
        }
      });
      if (error) throw error;
      toast({
        title: "Inscription réussie!",
        description: "Vérifiez votre email pour confirmer votre compte."
      });

      // Reset form
      setSignupForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phone: '',
        role: 'student',
        referralCode: ''
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur s'est produite lors de l'inscription.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  if (user) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Waves className="h-12 w-12 text-secondary mx-auto mb-4" />
            <CardTitle className="text-2xl">Connexion réussie!</CardTitle>
            <CardDescription>
              Redirection en cours...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-subtle">
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

        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
              <img src={aquaDorLogo} alt="A'qua D'or Logo" className="h-10 w-10 object-contain" />
              <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                A'qua D'or
              </span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Bienvenue</h1>
            <p className="text-muted-foreground">
              Connectez-vous ou créez votre compte pour accéder à votre espace personnel.
            </p>
          </div>


          <Card className="hover:shadow-elegant transition-all duration-300">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <CardHeader>
                  <CardTitle>Se Connecter</CardTitle>
                  <CardDescription>
                    Entrez vos identifiants pour accéder à votre compte.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="votre@email.com" value={loginForm.email} onChange={e => setLoginForm(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} required autoFocus />
                  </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <div className="relative">
                        <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="Votre mot de passe" value={loginForm.password} onChange={e => setLoginForm(prev => ({
                        ...prev,
                        password: e.target.value
                      }))} required />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connexion...
                        </> : 'Se Connecter'}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <CardHeader>
                  <CardTitle>Créer un Compte</CardTitle>
                  <CardDescription>
                    Rejoignez la communauté A'qua D'or.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nom complet</Label>
                      <Input id="signup-name" placeholder="Votre nom complet" value={signupForm.fullName} onChange={e => setSignupForm(prev => ({
                      ...prev,
                      fullName: e.target.value
                    }))} required autoFocus />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="votre@email.com" value={signupForm.email} onChange={e => setSignupForm(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Téléphone</Label>
                      <Input id="signup-phone" type="tel" placeholder="+509 XXXX-XXXX" value={signupForm.phone} onChange={e => setSignupForm(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))} />
                    </div>

                    <div className="space-y-2">
                      <Label>Âgé de 18 ans ou plus ?</Label>
                      <Select value={isAdult} onValueChange={(v: any) => setIsAdult(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Oui</SelectItem>
                          <SelectItem value="no">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Êtes-vous parent ?</Label>
                      <Select value={isParent} onValueChange={(v: any) => setIsParent(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Non</SelectItem>
                          <SelectItem value="yes">Oui</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Avez-vous été référé par quelqu'un ?</Label>
                      <Select value={hasReferral} onValueChange={(v: any) => setHasReferral(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Non</SelectItem>
                          <SelectItem value="yes">Oui</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {hasReferral === 'yes' && (
                      <div className="space-y-2">
                        <Label htmlFor="referral-code">Code de parrainage</Label>
                        <Input
                          id="referral-code"
                          placeholder="Entrez le code de parrainage"
                          value={signupForm.referralCode}
                          onChange={e => setSignupForm(prev => ({
                            ...prev,
                            referralCode: e.target.value
                          }))}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <Input id="signup-password" type="password" placeholder="Au moins 6 caractères" value={signupForm.password} onChange={e => setSignupForm(prev => ({
                      ...prev,
                      password: e.target.value
                    }))} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                      <Input id="signup-confirm" type="password" placeholder="Confirmez votre mot de passe" value={signupForm.confirmPassword} onChange={e => setSignupForm(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))} required />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Inscription...
                        </> : 'Créer mon Compte'}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>;
};
export default Auth;