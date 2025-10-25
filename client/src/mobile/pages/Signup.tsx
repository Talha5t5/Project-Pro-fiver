import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { useToast } from "../../hooks/use-toast";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { Separator } from "../../components/ui/separator";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

// Schema di validazione con zod
const signupSchema = z.object({
  fullName: z.string().min(2, "Il nome completo deve contenere almeno 2 caratteri"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

// Tipo separato per i dati di registrazione senza la conferma della password
type SignupData = {
  fullName: string;
  email: string;
  password: string;
};

export default function MobileSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'it');
  const { register, isLoading: authLoading } = useMobileAuth();

  // Text content based on selected language
  const textContent = {
    it: {
      title: "Registrati con la tua email",
      fullName: "Nome Completo",
      fullNamePlaceholder: "Nome e Cognome",
      email: "Email",
      password: "Password",
      confirmPassword: "Conferma password",
      confirmPasswordPlaceholder: "Conferma password",
      registerButton: "Registrati",
      registering: "Registrazione...",
      alreadyHaveAccount: "Hai già un account?",
      login: "Accedi",
      orRegisterWith: "Oppure registrati con",
      registerWithGoogle: "Registrati con Google",
      registerWithFacebook: "Registrati con Facebook",
      socialSignupInDevelopment: "Funzionalità in sviluppo",
      socialSignupComingSoon: "La registrazione con {provider} sarà disponibile a breve",
      socialSignupError: "Non è stato possibile registrarsi con {provider}",
      registrationCompleted: "Registrazione completata",
      registrationSuccess: "La tua registrazione è stata completata con successo",
      emailAlreadyRegistered: "Email già registrata",
      emailAlreadyExists: "Questa email è già associata ad un account. Effettua il login o utilizza un'altra email.",
      registrationError: "Errore durante la registrazione",
      registrationFailed: "Registrazione fallita. Riprova."
    },
    en: {
      title: "Register with your email",
      fullName: "Full Name",
      fullNamePlaceholder: "First and Last Name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm Password",
      registerButton: "Register",
      registering: "Registering...",
      alreadyHaveAccount: "Already have an account?",
      login: "Login",
      orRegisterWith: "Or register with",
      registerWithGoogle: "Register with Google",
      registerWithFacebook: "Register with Facebook",
      socialSignupInDevelopment: "Feature in development",
      socialSignupComingSoon: "Registration with {provider} will be available soon",
      socialSignupError: "Unable to register with {provider}",
      registrationCompleted: "Registration completed",
      registrationSuccess: "Your registration has been completed successfully",
      emailAlreadyRegistered: "Email already registered",
      emailAlreadyExists: "This email is already associated with an account. Login or use another email.",
      registrationError: "Registration error",
      registrationFailed: "Registration failed. Please try again."
    }
  };

  const currentText = textContent[currentLanguage as keyof typeof textContent] || textContent.it;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
  };

  const handleSignup = async (data: SignupData) => {
    try {
      setLoading(true);
      await register(data.email, data.password, data.fullName);
      
      toast({
        title: currentText.registrationCompleted,
        description: currentText.registrationSuccess,
        variant: "default",
      });
      setLocation("/mobile/plans");
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (errorMessage.includes("Email già in uso") || 
          errorMessage.includes("già registrata")) {
        toast({
          title: currentText.emailAlreadyRegistered,
          description: currentText.emailAlreadyExists,
          variant: "destructive",
        });
      } else {
        toast({
          title: currentText.registrationError,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      toast({
        title: currentText.socialSignupInDevelopment,
        description: currentText.socialSignupComingSoon.replace('{provider}', provider === 'google' ? 'Google' : 'Facebook'),
        variant: "default",
      });
    } catch (error) {
      console.error(`Errore durante la registrazione con ${provider}:`, error);
      toast({
        title: currentText.socialSignupError.replace('{provider}', provider === 'google' ? 'Google' : 'Facebook'),
        description: currentText.socialSignupError.replace('{provider}', provider === 'google' ? 'Google' : 'Facebook'),
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    // Rimuoviamo confirmPassword dai dati da inviare
    const { confirmPassword, ...signupData } = data;
    await handleSignup(signupData);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Language Selector */}
      <div className="flex justify-end p-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
          <Globe className="w-4 h-4 text-gray-600" />
          <Button
            variant={currentLanguage === 'it' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLanguageChange('it')}
            className="text-xs px-2 py-1"
          >
            IT
          </Button>
          <Button
            variant={currentLanguage === 'en' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLanguageChange('en')}
            className="text-xs px-2 py-1"
          >
            EN
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container px-4 py-8 max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{currentText.title}</h1>
          </div>
          
          <Card className="w-full mb-8">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{currentText.fullName}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={currentText.fullNamePlaceholder}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{currentText.email}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder={currentText.email}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{currentText.password}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={currentText.password}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{currentText.confirmPassword}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={currentText.confirmPasswordPlaceholder}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || authLoading}
                  >
                    {loading || authLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        {currentText.registering}
                      </div>
                    ) : (
                      currentText.registerButton
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Login Link */}
          <div className="text-center mb-8">
            <p className="text-gray-600">
              {currentText.alreadyHaveAccount}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm font-medium"
                onClick={() => setLocation("/mobile/login")}
              >
                {currentText.login}
              </Button>
            </p>
          </div>

          {/* Social Login Section */}
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm mb-4">{currentText.orRegisterWith}</p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => handleSocialSignup('google')}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'google' ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => handleSocialSignup('facebook')}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'facebook' ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}