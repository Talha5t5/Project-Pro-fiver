import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { useToast } from "../hooks/use-toast";
import { Separator } from "../components/ui/separator";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { mobileApiCall } from "../mobile/utils/mobileApi";
import { useQuery } from "@tanstack/react-query";

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

export default function RegistrationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'it');

  // Fetch subscription plans
  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/mobile/subscription-plans"],
    queryFn: () => mobileApiCall("GET", "/api/mobile/subscription-plans").then(res => res.json()),
    enabled: true
  });

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
      registrationFailed: "Registrazione fallita. Riprova.",
      selectPlan: "Seleziona un piano",
      planRequired: "Devi selezionare un piano per continuare",
      monthly: "Mensile",
      yearly: "Annuale",
      free: "Gratuito",
      paid: "A pagamento"
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
      registrationFailed: "Registration failed. Please try again.",
      selectPlan: "Select a plan",
      planRequired: "You must select a plan to continue",
      monthly: "Monthly",
      yearly: "Yearly",
      free: "Free",
      paid: "Paid"
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
      
      if (!selectedPlan) {
        toast({
          title: currentText.registrationError,
          description: currentText.planRequired,
          variant: "destructive",
        });
        return;
      }
      
      const response = await mobileApiCall('POST', '/api/mobile/register', {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        username: data.email.split('@')[0]
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la registrazione');
      }
      
      const userData = await response.json();
      
      toast({
        title: currentText.registrationCompleted,
        description: currentText.registrationSuccess,
        variant: "default",
      });
      
      // Redirect to checkout with selected plan
      setTimeout(() => {
        setLocation(`/checkout/${selectedPlan}/monthly`);
      }, 1500);
      
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
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">ProjectPro</h1>
          </div>
          <div className="flex items-center space-x-4">
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
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Registration Form */}
            <Card className="w-full">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">{currentText.title}</CardTitle>
                <CardDescription>
                  {currentText.description}
                </CardDescription>
              </CardHeader>
        
              <CardContent>
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
                      disabled={loading || !selectedPlan}
                    >
                      {loading ? (
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

            {/* Plan Selection */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>{currentText.selectPlan}</CardTitle>
                <CardDescription>
                  Scegli il piano che meglio si adatta alle tue esigenze
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Caricamento piani...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptionPlans?.map((plan: any) => (
                      <div
                        key={plan.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{plan.name}</h3>
                              {plan.isFree && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  {currentText.free}
                                </span>
                              )}
                              {!plan.isFree && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {currentText.paid}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">€{plan.monthlyPrice}/{currentText.monthly}</span>
                              <span className="font-medium">€{plan.yearlyPrice}/{currentText.yearly}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            {selectedPlan === plan.id && (
                              <Check className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Login Link */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              {currentText.alreadyHaveAccount}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm font-medium"
                onClick={() => setLocation("/login")}
              >
                {currentText.login}
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}