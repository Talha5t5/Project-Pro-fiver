import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Loader2, Globe } from "lucide-react";
import { Separator } from "../../components/ui/separator";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { useToast } from "../../hooks/use-toast";
import { useTranslation } from "react-i18next";

// Schema di validazione
const loginSchema = z.object({
  email: z.string().email({ message: "Email non valida" }),
  password: z.string().min(6, { message: "La password deve avere almeno 6 caratteri" }),
});

// Tipo dai valori del form
type LoginFormValues = z.infer<typeof loginSchema>;

export default function MobileLogin() {
  const [, setLocation] = useLocation();
  const { login, isLoading } = useMobileAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'it');

  // React hook form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      toast({
        title: currentText.socialLoginInDevelopment,
        description: currentText.socialLoginComingSoon.replace('{provider}', provider === 'google' ? 'Google' : 'Facebook'),
        variant: "default",
      });
    } catch (error) {
      console.error(`Errore durante l'autenticazione con ${provider}:`, error);
      toast({
        title: "Errore",
        description: currentText.socialLoginError.replace('{provider}', provider === 'google' ? 'Google' : 'Facebook'),
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  // Submit del form
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      await login(data.email, data.password);
      // Check if this is first-time setup
      const hasCompletedSetup = localStorage.getItem('mobileSetupCompleted');
      if (!hasCompletedSetup) {
        // First time login - redirect to settings for setup
        setLocation("/mobile/settings");
      } else {
        // Regular login - redirect to dashboard
        setLocation("/mobile/dashboard");
      }
    } catch (err) {
      console.error("Errore login:", err);
      setError(err instanceof Error ? err.message : currentText.loginError);
    }
  };

  // Text content based on selected language
  const textContent = {
    it: {
      title: "Accedi",
      description: "Inserisci le tue credenziali per accedere",
      email: "Email",
      password: "Password",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      loginButton: "Accedi",
      loggingIn: "Accesso in corso...",
      forgotPassword: "Password dimenticata?",
      dontHaveAccount: "Non hai un account?",
      registerNow: "Registrati ora",
      loginWithGoogle: "Accedi con Google",
      loginWithFacebook: "Accedi con Facebook",
      socialLoginInDevelopment: "Funzionalità in sviluppo",
      socialLoginComingSoon: "L'accesso con {provider} sarà disponibile a breve",
      socialLoginError: "Non è stato possibile effettuare l'accesso con {provider}",
      loginError: "Errore durante il login"
    },
    en: {
      title: "Login",
      description: "Enter your credentials to access",
      email: "Email",
      password: "Password",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      loginButton: "Login",
      loggingIn: "Logging in...",
      forgotPassword: "Forgot Password?",
      dontHaveAccount: "Don't have an account?",
      registerNow: "Register now",
      loginWithGoogle: "Login with Google",
      loginWithFacebook: "Login with Facebook",
      socialLoginInDevelopment: "Feature in development",
      socialLoginComingSoon: "Login with {provider} will be available soon",
      socialLoginError: "Unable to login with {provider}",
      loginError: "Login error"
    }
  };

  const currentText = textContent[currentLanguage as keyof typeof textContent] || textContent.it;

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
          {/* Blue App Logo */}
          <div className="text-center mb-10 mt-8">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-600 text-white text-4xl font-bold rounded-xl p-4 inline-block">
                App
              </div>
            </div>
          </div>
          
          <Card className="w-full mb-8">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{currentText.title}</CardTitle>
              <CardDescription>
                {currentText.description}
              </CardDescription>
            </CardHeader>
        
            <CardContent>
              {/* Pulsanti social */}
              <div className="space-y-4 mb-6">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={() => handleSocialLogin('google')}
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
                  {currentText.loginWithGoogle}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'facebook' ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
                    </svg>
                  )}
                  {currentText.loginWithFacebook}
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{currentText.email}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder={currentText.emailPlaceholder}
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
                            placeholder={currentText.passwordPlaceholder}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {error && (
                    <div className="text-red-600 text-sm text-center">
                      {error}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {currentText.loggingIn}
                      </>
                    ) : (
                      currentText.loginButton
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                variant="link" 
                className="w-full text-sm"
                onClick={() => setLocation("/mobile/forgot-password")}
              >
                {currentText.forgotPassword}
              </Button>
              
              <div className="text-center text-sm">
                <span className="text-gray-600">{currentText.dontHaveAccount} </span>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm"
                  onClick={() => setLocation("/mobile/signup")}
                >
                  {currentText.registerNow}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}