import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "../../components/ui/form";

// Schema di validazione del form di login
const loginSchema = z.object({
  email: z.string().email({ message: "Email non valida" }),
  password: z.string().min(1, { message: "Password richiesta" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function MobileWelcome() {
  const { user, login } = useMobileAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  // Form React Hook Form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if this is first-time setup and redirect accordingly
  useEffect(() => {
    if (user) {
      // Check if user has completed first-time setup
      const hasCompletedSetup = localStorage.getItem('mobileSetupCompleted');
      if (!hasCompletedSetup) {
        // First time login - redirect to settings for setup
        setLocation("/mobile/settings");
      } else {
        // Regular login - redirect to dashboard
        setLocation("/mobile/dashboard");
      }
    }
  }, [user, setLocation]);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      // In una implementazione reale, qui andrebbe il codice per OAuth con Google o Facebook
      toast({
        title: "Funzionalità in sviluppo",
        description: `L'accesso con ${provider === 'google' ? 'Google' : 'Facebook'} sarà disponibile a breve`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Errore durante l'autenticazione con ${provider}:`, error);
      toast({
        title: "Errore",
        description: `Non è stato possibile effettuare l'accesso con ${provider === 'google' ? 'Google' : 'Facebook'}`,
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  // Submit del form
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
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
      toast({
        title: "Errore di accesso",
        description: err instanceof Error ? err.message : "Errore durante il login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };



  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="container px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {/* Logo dell'app */}
              <div className="bg-blue-600 text-white text-4xl font-bold rounded-xl p-4 inline-block">
                App
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-lg text-primary block mb-2">
                    Email
                  </label>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="email"
                              placeholder="Email"
                              type="email"
                              className="h-12 pl-10"
                              {...field}
                            />
                            <span className="absolute left-3 top-3 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                              </svg>
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="text-lg text-primary block mb-2">
                    Password
                  </label>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="password"
                              placeholder="Password"
                              type={showPassword ? "text" : "password"}
                              className="h-12 pl-10 pr-10"
                              {...field}
                            />
                            <span className="absolute left-3 top-3 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1"
                              onClick={toggleShowPassword}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="text-center">
                <button 
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setLocation("/mobile/reset-password")}
                >
                  Password dimenticata?
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-background border-t-transparent rounded-full mr-2"></div>
                ) : null}
                Accedi
              </Button>

              <div className="flex flex-col gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="w-full h-12 flex items-center gap-2 border"
                  onClick={() => handleSocialLogin('google')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Accedi con Google
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full h-12 flex items-center gap-2 border"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === 'facebook' ? (
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
                    </svg>
                  )}
                  Accedi con Facebook
                </Button>
              </div>

              <div className="text-center mt-6">
                <p className="text-gray-600">
                  Non hai ancora un account?{" "}
                  <button 
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setLocation("/mobile/signup")}
                  >
                    Registrati ora
                  </button>
                </p>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}