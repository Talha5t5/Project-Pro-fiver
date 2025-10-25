import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { 
  Bell, Shield, LogOut, ChevronRight, 
  Languages, Smartphone, Moon, Sun, Info, HelpCircle,
  Building2, Users, FileText, Briefcase, UserCog, UsersRound, Lock, Settings as SettingsIcon
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import MobileLayout from "../components/MobileLayout";
import SetupWizard from "../components/SetupWizard";
import PermissionGate from "../components/PermissionGate";
import NotificationSettings from "../components/NotificationSettings";
import { Button } from "../../components/ui/button";
import { MobileLanguageSelector } from "../../components/ui/language-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { mobileGet } from "../utils/mobileApi";


interface UserSettings {
  isDarkMode: boolean;
  language: string;
  notificationsEnabled: boolean;
  syncFrequency: string;
}

interface UserSubscription {
  id: number;
  planId: number;
  status: string;
  startDate: string;
  endDate?: string;
  plan?: {
    name: string;
    features?: string;
  };
}

interface PlanConfiguration {
  id: number;
  features: Record<string, number | boolean>;
  limits: Record<string, number>;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>({
    isDarkMode: false,
    language: "it",
    notificationsEnabled: true,
    syncFrequency: "realtime"
  });
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile from mobile auth context
  const { user: profile, isLoading: isProfileLoading } = useMobileAuth();

  // Check settings.view permission using plan configuration
  const { data: planConfig, isLoading: isPlanConfigLoading } = useQuery({
    queryKey: ['/api/mobile/plan-configuration'],
    queryFn: async () => {
      const response = await mobileGet('/plan-configuration');
      if (!response.ok) {
        throw new Error('Failed to fetch plan configuration');
      }
      return response.json();
    },
    enabled: !!profile, // Only fetch if user is logged in
    retry: false
  });

  // Check if user has settings.view permission
  const hasSettingsPermission = planConfig?.features?.permissions?.['settings.view'] === true;

  // Feature flags from plan
  const featureEnabled = (id: string) => planConfig?.features?.[id] === true;

  // Fetch abbonamento utente
  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery<UserSubscription>({
    queryKey: ['/api/subscription'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/subscription');
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            // Utente non autenticato o nessun abbonamento, restituiamo null
            return null;
          }
          throw new Error('Errore nel recuperare l\'abbonamento');
        }
        return response.json();
      } catch (error) {
        console.error('Errore nel recuperare l\'abbonamento:', error);
        return null;
      }
    },
    // Non dipendere dall'esistenza del profilo
    enabled: true
  });


  // Check if this is first-time setup
  useEffect(() => {
    const hasCompletedSetup = localStorage.getItem('mobileSetupCompleted');
    if (!hasCompletedSetup) {
      setShowSetupWizard(true);
    }
  }, []);

  // Carica le impostazioni salvate
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsedSettings
        }));
      } catch (error) {
        console.error('Errore nel parsare le impostazioni salvate:', error);
      }
    }

    // Imposta il tema in base alle impostazioni
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Salva le impostazioni quando cambiano
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));

    // Applica il tema
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Funzione per aggiornare un'impostazione
  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Mutation per il logout
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Errore durante il logout');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalida tutte le query per pulire la cache
      queryClient.clear();
      // Pulisci lo storage locale
      localStorage.removeItem('userSettings');
      // Reindirizza alla pagina di login
      setLocation('/mobile/login');
      toast({
        title: 'Logout effettuato',
        description: 'Sei stato disconnesso con successo',
      });
    },
    onError: (error) => {
      console.error('Errore durante il logout:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il logout',
        variant: 'destructive'
      });
    }
  });

  // Verifica se una funzionalità è abilitata nella configurazione del piano
  const isFeatureEnabled = (featureName: string, defaultValue: boolean = false): boolean => {
    if (!planConfig || !planConfig.features) return defaultValue;
    return planConfig.features[featureName] as boolean || defaultValue;
  };

  // Ottieni il limite per una specifica funzionalità
  const getFeatureLimit = (limitName: string, defaultValue: number = 0): number => {
    if (!planConfig || !planConfig.limits) return defaultValue;
    return planConfig.limits[limitName] as number || defaultValue;
  };

  // Ottieni lo stato dell'abbonamento in formato leggibile
  const getSubscriptionStatus = (status?: string): { label: string; color: string } => {
    if (!status) return { label: 'Nessun abbonamento', color: 'bg-gray-500' };
    
    switch (status.toLowerCase()) {
      case 'active':
        return { label: 'Attivo', color: 'bg-green-500' };
      case 'canceled':
        return { label: 'Cancellato', color: 'bg-red-500' };
      case 'expired':
        return { label: 'Scaduto', color: 'bg-orange-500' };
      case 'trial':
        return { label: 'Prova', color: 'bg-blue-500' };
      case 'pending':
        return { label: 'In attesa', color: 'bg-yellow-500' };
      default:
        return { label: status, color: 'bg-gray-500' };
    }
  };

  // Formatta la data di scadenza
  const formatExpiryDate = (dateStr?: string): string => {
    if (!dateStr) return 'Non disponibile';
    
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Handle setup wizard completion
  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    localStorage.setItem('mobileSetupCompleted', 'true');
    toast({
      title: "Configurazione completata",
      description: "La configurazione iniziale è stata completata con successo!",
      variant: "default",
    });
  };

  // Renderizza un item di impostazione
  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    description: string,
    action: React.ReactNode,
    onClick?: () => void
  ) => (
    <div 
      className={`flex items-center justify-between py-3 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-gray-500">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div>{action}</div>
    </div>
  );

  // Gestisci il click su un'icona della navigazione
  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  // Show loading state while checking permissions
  if (isPlanConfigLoading) {
    return (
      <MobileLayout title={t('mobile.settings.title')}>
        <div className="p-4 text-center">
          <p>Verifica permessi...</p>
        </div>
      </MobileLayout>
    );
  }

  // Show access denied if user doesn't have settings.view permission
  if (!hasSettingsPermission) {
    return (
      <MobileLayout title={t('mobile.settings.title')}>
        <div className="p-4 text-center">
          <div className="flex flex-col items-center space-y-4 py-8">
            <Lock className="h-16 w-16 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700">Accesso Negato</h2>
            <p className="text-gray-500 text-center max-w-sm">
              Non hai il permesso di visualizzare le impostazioni. Contatta l'amministratore per ottenere l'accesso.
            </p>
            <Button 
              onClick={() => setLocation('/mobile/dashboard')}
              className="mt-4"
            >
              Torna alla Dashboard
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Show setup wizard for first-time users
  if (showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <MobileLayout title={t('mobile.settings.title')}>
      <div className="flex overflow-x-auto border-b">
        <PermissionGate permission="canViewCompany">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px] border-b-2 border-primary"
            onClick={() => handleNavigation('/mobile/settings/company')}
          >
            <Building2 className="h-5 w-5 mb-1 text-primary" />
            <span className="text-xs font-medium text-primary">Azienda</span>
          </div>
        </PermissionGate>
        
        {featureEnabled('client_management') && (
        <PermissionGate permission="canViewClients">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px]"
            onClick={() => handleNavigation('/mobile/settings/clients')}
          >
            <Users className="h-5 w-5 mb-1 text-gray-500" />
            <span className="text-xs text-gray-500">Clienti</span>
          </div>
        </PermissionGate>
        )}
        
        <PermissionGate permission="canViewJobTypes">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px]"
            onClick={() => handleNavigation('/mobile/settings/jobtypes')}
          >
            <Briefcase className="h-5 w-5 mb-1 text-gray-500" />
            <span className="text-xs text-gray-500">Tipi di Lavoro</span>
          </div>
        </PermissionGate>
        
        {featureEnabled('activity_tracking') && (
        <PermissionGate permission="canViewActivities">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px]"
            onClick={() => handleNavigation('/mobile/settings/activities')}
          >
            <FileText className="h-5 w-5 mb-1 text-gray-500" />
            <span className="text-xs text-gray-500">Attività</span>
          </div>
        </PermissionGate>
        )}
        
        {featureEnabled('collaborator_management') && (
        <PermissionGate permission="canViewRoles">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px]"
            onClick={() => handleNavigation('/mobile/settings/roles')}
          >
            <UserCog className="h-5 w-5 mb-1 text-gray-500" />
            <span className="text-xs text-gray-500">Ruoli</span>
          </div>
        </PermissionGate>
        )}
        
        {featureEnabled('collaborator_management') && (
        <PermissionGate permission="canViewCollaborators">
          <div 
            className="flex items-center justify-center flex-col p-3 min-w-[80px]"
            onClick={() => handleNavigation('/mobile/settings/collaborators')}
          >
            <UsersRound className="h-5 w-5 mb-1 text-gray-500" />
            <span className="text-xs text-gray-500">Collaboratori</span>
          </div>
        </PermissionGate>
        )}
      </div>
      <div className="p-4 pb-20">
        {/* Profilo utente */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{t('mobile.profile.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isProfileLoading ? (
              <div className="py-4 text-center">
                <p>{t('mobile.common.loading')}</p>
              </div>
            ) : profile ? (
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center text-xl font-semibold">
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{profile.fullName}</h3>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                  {profile.phone && (
                    <p className="text-sm text-gray-500">{profile.phone}</p>
                  )}
                  {profile.roleId && (
                    <Badge variant="outline" className="mt-1">
                      Collaborator
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/mobile/profile')}
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-gray-500">{t('mobile.profile.loginRequired')}</p>
                <Button 
                  className="mt-2"
                  onClick={() => setLocation('/mobile/login')}
                >
                  Accedi
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abbonamento */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Abbonamento</CardTitle>
          </CardHeader>
          <CardContent>
            {isSubscriptionLoading ? (
              <div className="py-4 text-center">
                <p>Caricamento abbonamento...</p>
              </div>
            ) : subscription ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{subscription.plan?.name || 'Piano'}</h3>
                  <Badge 
                    className={`${getSubscriptionStatus(subscription.status).color} text-white`}
                  >
                    {getSubscriptionStatus(subscription.status).label}
                  </Badge>
                </div>
                <p className="text-sm">
                  Scadenza: {formatExpiryDate(subscription.endDate)}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setLocation('/mobile/subscription-plans')}
                >
                  Gestisci abbonamento
                </Button>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-gray-500 mb-3">Non hai un abbonamento attivo</p>
                <Button 
                  className="w-full"
                  onClick={() => setLocation('/mobile/subscription-plans')}
                >
                  Visualizza piani
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impostazioni app */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{t('mobile.settings.appSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tema */}
            {renderSettingItem(
              settings.isDarkMode ? <Moon size={20} /> : <Sun size={20} />,
              t('mobile.settings.theme'),
              settings.isDarkMode ? 'Modalità scura' : 'Modalità chiara',
              <Switch 
                checked={settings.isDarkMode} 
                onCheckedChange={(checked) => updateSetting('isDarkMode', checked)} 
              />
            )}
            
            <Separator />
            
            {/* Lingua */}
            {renderSettingItem(
              <Languages size={20} />,
              t('mobile.settings.language'),
              t('mobile.settings.languageDescription'),
              <div className="w-full">
                <MobileLanguageSelector />
              </div>
            )}
            
            <Separator />
            
            {/* Notifiche */}
            {renderSettingItem(
              <Bell size={20} />,
              t('mobile.settings.notifications'),
              t('mobile.settings.notificationsDescription'),
              <div className="flex items-center gap-2">
                <Switch 
                  checked={settings.notificationsEnabled} 
                  onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)} 
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/mobile/settings/notifications')}
                >
                  <SettingsIcon size={16} className="mr-1" />
                  Configura
                </Button>
              </div>
            )}
            
            <Separator />
            
            {/* Frequenza di sincronizzazione */}
            {renderSettingItem(
              <Smartphone size={20} />,
              'Sincronizzazione',
              'Frequenza di sincronizzazione dei dati',
              <Select 
                value={settings.syncFrequency} 
                onValueChange={(value) => updateSetting('syncFrequency', value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Frequenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Frequenza</SelectLabel>
                    <SelectItem value="realtime">Tempo reale</SelectItem>
                    <SelectItem value="hourly">Ogni ora</SelectItem>
                    <SelectItem value="daily">Giornaliera</SelectItem>
                    <SelectItem value="manual">Manuale</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Funzionalità disponibili */}
        {planConfig && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Funzionalità Piano</CardTitle>
              <CardDescription>
                Funzionalità disponibili con il tuo abbonamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">Clienti:</span> {getFeatureLimit('maxClients', 10)}
                </div>
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">Lavori:</span> {getFeatureLimit('maxJobs', 50)}
                </div>
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">Collaboratori:</span> {getFeatureLimit('maxCollaborators', 5)}
                </div>
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">Storage:</span> {getFeatureLimit('maxStorage', 5)} GB
                </div>
              </div>
              
              <div className="space-y-1 mt-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isFeatureEnabled('canUseReports', true) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Report avanzati</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isFeatureEnabled('canUseCalendar', true) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Calendario</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isFeatureEnabled('canAccessMobileApp', true) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">App mobile</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isFeatureEnabled('canUseAutomaticNotifications', false) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Notifiche automatiche</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isFeatureEnabled('canUseAI', false) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Assistenza AI</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Impostazioni Aziendali */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{t('mobile.settings.businessSettings')}</CardTitle>
            <CardDescription>
              Configura i dati della tua azienda e gestisci le risorse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profilo Aziendale */}
            {renderSettingItem(
              <Building2 size={20} />,
              t('mobile.settings.businessProfile'),
              'Gestisci i dati della tua azienda',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/company')
            )}
            
            <Separator />
            
            {/* Clienti */}
            {featureEnabled('client_management') && renderSettingItem(
              <Users size={20} />,
              'Clienti',
              'Gestisci la rubrica clienti',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/clients')
            )}
            
            <Separator />
            
            {/* Tipi di Lavoro */}
            {renderSettingItem(
              <Briefcase size={20} />,
              'Tipi di Lavoro',
              'Configura i tipi di lavoro',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/jobtypes')
            )}
            
            <Separator />
            
            {/* Attività */}
            {featureEnabled('activity_tracking') && renderSettingItem(
              <FileText size={20} />,
              'Attività',
              'Gestisci le attività per i lavori',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/activities')
            )}
            
            <Separator />
            
            {/* Ruoli */}
            {featureEnabled('collaborator_management') && renderSettingItem(
              <UserCog size={20} />,
              'Ruoli',
              'Configura i ruoli del personale',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/roles')
            )}
            
            <Separator />
            
            {/* Collaboratori */}
            {featureEnabled('collaborator_management') && renderSettingItem(
              <UsersRound size={20} />,
              'Collaboratori',
              'Gestisci il team di lavoro',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/settings/collaborators')
            )}
          </CardContent>
        </Card>
        
        {/* Altre opzioni */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Altro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Informazioni */}
            {renderSettingItem(
              <Info size={20} />,
              'Informazioni',
              'Versione e dettagli app',
              <ChevronRight size={18} />,
              () => setIsAboutOpen(true)
            )}
            
            <Separator />
            
            {/* Aiuto e supporto */}
            {renderSettingItem(
              <HelpCircle size={20} />,
              'Aiuto e supporto',
              'Centro assistenza',
              <ChevronRight size={18} />,
              () => setLocation('/mobile/help')
            )}
            
            <Separator />
            
            {/* Privacy e sicurezza */}
            {renderSettingItem(
              <Shield size={20} />,
              'Privacy e sicurezza',
              t('mobile.settings.privacySecurity'),
              <ChevronRight size={18} />,
              () => setLocation('/mobile/privacy')
            )}
            
            <Separator />
            
            {/* Logout */}
            {profile && (
              <div 
                className="flex items-center space-x-3 py-3 text-red-500 cursor-pointer"
                onClick={() => setIsConfirmLogoutOpen(true)}
              >
                <LogOut size={20} />
                <span>Esci</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog di conferma logout */}
        <Dialog open={isConfirmLogoutOpen} onOpenChange={setIsConfirmLogoutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('mobile.settings.confirmLogout')}</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler uscire? Dovrai effettuare nuovamente l'accesso per utilizzare l'app.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsConfirmLogoutOpen(false)}>
                Annulla
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setIsConfirmLogoutOpen(false);
                  logout.mutate();
                }}
                disabled={logout.isPending}
              >
                {logout.isPending ? 'Disconnessione...' : 'Esci'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog informazioni app */}
        <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informazioni</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="rounded-xl bg-blue-600 text-white w-16 h-16 flex items-center justify-center text-2xl font-bold">
                  PP
                </div>
              </div>
              <h2 className="text-center text-xl font-semibold">ProjectPro</h2>
              <p className="text-center text-sm text-gray-500">Versione 1.0.0</p>
              
              <div className="text-sm space-y-2 mt-4">
                <p className="text-center">
                  Software di gestione progetti per professionisti artigiani.
                </p>
                <p className="text-center">
                  © 2025 ProjectPro. Tutti i diritti riservati.
                </p>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <Button variant="outline" onClick={() => setIsAboutOpen(false)}>
                {t('mobile.common.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}