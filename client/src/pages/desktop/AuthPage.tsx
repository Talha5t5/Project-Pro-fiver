import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Link } from 'wouter';
import { Workflow, Briefcase, Calendar, Users, Shield } from 'lucide-react';
import { LanguageSelector } from '../../components/ui/language-selector';

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { toast } = useToast();
  const { t } = useTranslation();
  // Leggi query string per selezionare tab e trial
  useEffect(() => {
    try {
      const url = new URL(location, window.location.origin);
      const tab = url.searchParams.get('tab');
      if (tab === 'register') setActiveTab('register');
    } catch {}
  }, [location]);

  
  // Stati per il form di login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Stati per il form di registrazione
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerCompanyName, setRegisterCompanyName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Funzione per gestire il login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername || !loginPassword) {
      toast({
        title: t('errors.generic', 'Errore'),
        description: t('errors.enterUsernamePassword', 'Inserisci username e password'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoggingIn(true);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      
      if (response.ok) {
        toast({
          title: t('auth.loginSuccess', 'Login effettuato'),
          description: t('auth.welcomeMessage', 'Benvenuto su ProjectPro!'),
        });
        
        // Reindirizza alla dashboard
        setTimeout(() => {
          setLocation('/mobile/dashboard');
        }, 1500);
      } else {
        const errorData = await response.json();
        toast({
          title: t('errors.loginError', 'Errore di login'),
          description: errorData.message || t('errors.invalidCredentials', 'Credenziali non valide. Riprova.'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Errore durante il login:', error);
      toast({
        title: t('errors.generic', 'Errore'),
        description: t('errors.genericDesc', 'Si è verificato un errore. Riprova più tardi.'),
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Funzione per gestire la registrazione
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione
    if (!registerUsername || !registerPassword || !registerConfirmPassword || !registerEmail || !registerCompanyName) {
      toast({
        title: t('errors.generic', 'Errore'),
        description: t('errors.fillAllFields', 'Compila tutti i campi richiesti'),
        variant: "destructive",
      });
      return;
    }
    
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: t('errors.generic', 'Errore'),
        description: t('errors.passwordsDoNotMatch', 'Le password non coincidono'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsRegistering(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
          email: registerEmail,
          fullName: registerCompanyName,
        }),
      });
      
      if (response.ok) {
        toast({
          title: t('auth.registrationSuccess', 'Registrazione completata'),
          description: t('auth.registrationMessage', 'Account creato con successo! Ora puoi effettuare il login.'),
        });
        
        // Se è un flusso trial, reindirizza al checkout con il piano free
        try {
          const url = new URL(location, window.location.origin);
          const trial = url.searchParams.get('trial');
          if (trial === '1') {
            // Recupera piani e trova quello gratuito
            const res = await fetch('/api/subscription-plans');
            if (res.ok) {
              const plans = await res.json();
              const freePlan = plans.find((p: any) => p.isFree);
              if (freePlan) {
                setLocation(`/desktop/checkout/${freePlan.id}/monthly`);
                return;
              }
            }
          }
        } catch {}

        // Reset dei campi del form
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setRegisterEmail('');
        setRegisterCompanyName('');
        
        // Passa alla scheda di login
        setActiveTab('login');
      } else {
        const errorData = await response.json();
        toast({
          title: t('errors.registrationError', 'Errore di registrazione'),
          description: errorData.message || t('errors.registrationFailed', 'Non è stato possibile creare l\'account. Riprova.'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      toast({
        title: t('errors.generic', 'Errore'),
        description: t('errors.genericDesc', 'Si è verificato un errore. Riprova più tardi.'),
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <Link href="/desktop" className="text-xl font-bold flex items-center">
            <Workflow className="h-6 w-6 mr-2 text-primary" />
            ProjectPro
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/desktop" className="text-sm font-medium hover:text-primary">
              Home
            </Link>
            <Link href="/desktop#features" className="text-sm font-medium hover:text-primary">
              Funzionalità
            </Link>
            <Link href="/desktop#pricing" className="text-sm font-medium hover:text-primary">
              Prezzi
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>
      
      <div className="flex-1 bg-gray-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.loginTab', 'Accedi')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.registerTab', 'Registrati')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{t('auth.loginTitle', 'Accedi al tuo account')}</CardTitle>
                  <CardDescription>
                    {t('auth.loginDescription', 'Inserisci le tue credenziali per accedere a ProjectPro')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('auth.usernameLabel', 'Username o Email')}</Label>
                      <Input 
                        id="username" 
                        placeholder={t('auth.usernamePlaceholder', 'Il tuo username o email')}
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('auth.passwordLabel', 'Password')}</Label>
                        <Link href="/reset-password" className="text-xs text-primary hover:underline">
                          {t('auth.forgotPassword', 'Password dimenticata?')}
                        </Link>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder={t('auth.passwordPlaceholder', 'La tua password')}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          {t('auth.loggingIn', 'Accesso...')}
                        </>
                      ) : (
                        t('auth.loginButton', 'Accedi')
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-sm text-center text-gray-500">
                    {t('auth.noAccount', 'Non hai un account?')}
                    <button
                      onClick={() => setActiveTab('register')}
                      className="text-primary hover:underline"
                    >
                      {t('auth.registerNow', 'Registrati ora')}
                    </button>
                  </div>
                  <div className="text-xs text-center text-gray-500">
                    {t('auth.termsOfService', 'Accedendo, accetti i')}{" "}
                    <a href="#" className="hover:underline">
                      {t('auth.termsOfServiceLink', 'Termini di Servizio')}
                    </a>{" "}
                    {t('auth.and', 'e l\'')}{" "}
                    <a href="#" className="hover:underline">
                      {t('auth.privacyPolicyLink', 'Informativa sulla Privacy')}
                    </a>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>{t('auth.registerTitle', 'Crea un nuovo account')}</CardTitle>
                  <CardDescription>
                    {t('auth.registerDescription', 'Registrati per iniziare a utilizzare ProjectPro')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">{t('auth.companyLabel', 'Nome Azienda')}</Label>
                      <Input 
                        id="company"
                        placeholder={t('auth.companyPlaceholder', 'Nome della tua azienda')} 
                        value={registerCompanyName}
                        onChange={(e) => setRegisterCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.emailLabel', 'Email')}</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder={t('auth.emailPlaceholder', 'esempio@azienda.it')}
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username">{t('auth.registerUsernameLabel', 'Username')}</Label>
                      <Input 
                        id="register-username" 
                        placeholder={t('auth.registerUsernamePlaceholder', 'Scegli un username')}
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-password">{t('auth.registerPasswordLabel', 'Password')}</Label>
                        <Input 
                          id="register-password" 
                          type="password" 
                          placeholder={t('auth.registerPasswordPlaceholder', 'Crea password')}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t('auth.registerConfirmPasswordLabel', 'Conferma Password')}</Label>
                        <Input 
                          id="confirm-password" 
                          type="password" 
                          placeholder={t('auth.registerConfirmPasswordPlaceholder', 'Conferma password')}
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="terms" 
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        required
                      />
                      <label htmlFor="terms" className="text-sm">
                        {t('auth.acceptTerms', 'Accetto i')}{" "}
                        <a href="#" className="text-primary hover:underline">
                          {t('auth.termsOfServiceLink', 'Termini di Servizio')}
                        </a>{" "}
                        {t('auth.and', 'e l\'')}{" "}
                        <a href="#" className="text-primary hover:underline">
                          {t('auth.privacyPolicyLink', 'Informativa sulla Privacy')}
                        </a>
                      </label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isRegistering}>
                      {isRegistering ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          {t('auth.registering', 'Registrazione...')}
                        </>
                      ) : (
                        t('auth.registerButton', 'Registrati')
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <div className="text-sm text-gray-500">
                    {t('auth.alreadyHaveAccount', 'Hai già un account?')}
                    <button
                      onClick={() => setActiveTab('login')}
                      className="text-primary hover:underline"
                    >
                      {t('auth.loginButton', 'Accedi')}
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <footer className="bg-gray-100 border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <div className="flex justify-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>{t('footer.workManagement', 'Gestione lavori')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{t('footer.planning', 'Pianificazione')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{t('footer.collaborators', 'Collaboratori')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>{t('footer.security', 'Sicurezza')}</span>
            </div>
          </div>
          <p>© {new Date().getFullYear()} ProjectPro. {t('footer.allRightsReserved', 'Tutti i diritti riservati.')}</p>
        </div>
      </footer>
    </div>
  );
}