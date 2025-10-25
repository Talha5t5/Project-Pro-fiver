import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, CheckCircle, Ban, Clock, Settings, Sliders } from "lucide-react";
import { format, differenceInDays, addMonths, addYears, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

interface ClientPlanPageProps {
  id?: string;
}

export default function ClientPlanPage(props: ClientPlanPageProps) {
  const params = useParams();
  const clientId = props.id || params.id;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Carica i dati del cliente
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: () => apiRequest("GET", `/api/clients/${clientId}`).then(res => res.json()),
    enabled: !!clientId,
  });

  // Carica la sottoscrizione del cliente
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: [`/api/users/${clientId}/subscription`],
    queryFn: () => apiRequest("GET", `/api/users/${clientId}/subscription`).then(res => res.json()),
    enabled: !!clientId,
  });

  // Carica tutti i piani disponibili
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/subscription-plans").then(res => res.json()),
  });
  
  // Carica la configurazione personalizzata del piano
  const { data: planConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/plan-configurations?userId=${clientId}`],
    queryFn: () => apiRequest("GET", `/api/plan-configurations?userId=${clientId}`)
      .then(res => res.json())
      .catch(() => null),
    enabled: !!clientId,
  });

  // Stati per il form
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingFrequency, setBillingFrequency] = useState<string>("monthly");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>("active");
  const [isTrial, setIsTrial] = useState<boolean>(false);
  
  // Imposta i valori iniziali quando il componente si carica
  useEffect(() => {
    if (subscription) {
      setSelectedPlanId(subscription.planId);
      setBillingFrequency(subscription.billingFrequency || "monthly");
      if (subscription.startDate) {
        const date = new Date(subscription.startDate);
        setStartDate(date.toISOString().split('T')[0]);
      }
      setStatus(subscription.status || "active");
      setIsTrial(subscription.status === "trial");
    }
  }, [subscription]);

  // Calcola la data di fine in base al piano e alla frequenza di fatturazione
  const calculateEndDate = () => {
    if (!selectedPlanId || !startDate) return null;
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) return null;
    
    const startDateObj = new Date(startDate);
    
    if (billingFrequency === "monthly") {
      const months = selectedPlan.monthlyDuration || 1;
      return addMonths(startDateObj, months);
    } else if (billingFrequency === "yearly") {
      const years = selectedPlan.yearlyDuration || 1;
      return addYears(startDateObj, years);
    }
    
    return null;
  };
  
  // Calcola il prezzo in base al piano e alla frequenza di fatturazione
  const calculatePrice = () => {
    if (!selectedPlanId) return 0;
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) return 0;
    
    if (billingFrequency === "monthly") {
      return selectedPlan.monthlyPrice;
    } else if (billingFrequency === "yearly") {
      return selectedPlan.yearlyPrice;
    }
    
    return 0;
  };
  
  const endDate = calculateEndDate();
  const price = calculatePrice();
  
  // Calcola giorni rimanenti alla scadenza
  const getRemainingDays = () => {
    if (!subscription?.endDate) return null;
    
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    return differenceInDays(endDate, today);
  };
  
  // Mutation per aggiornare la sottoscrizione
  const updateSubscription = useMutation({
    mutationFn: (data: any) => {
      // Se esiste già la sottoscrizione, aggiornala
      if (subscription?.id) {
        return apiRequest("PUT", `/api/user-subscriptions/${subscription.id}`, data)
          .then(res => res.json());
      } 
      // Altrimenti crea una nuova sottoscrizione
      else {
        return apiRequest("POST", "/api/user-subscriptions", data)
          .then(res => res.json());
      }
    },
    onSuccess: () => {
      toast({
        title: "Operazione completata",
        description: "Piano aggiornato con successo",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${clientId}/subscription`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il piano",
        variant: "destructive",
      });
      console.error("Errore nell'aggiornare la sottoscrizione:", error);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subscriptionData = {
      userId: Number(clientId),
      planId: selectedPlanId,
      status: isTrial ? "trial" : status,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      billingFrequency
    };
    
    updateSubscription.mutate(subscriptionData);
  };
  
  // Stati per la configurazione avanzata
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean>>({});
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [pageAccess, setPageAccess] = useState<Record<string, boolean>>({});
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isConfigActive, setIsConfigActive] = useState<boolean>(true);
  
  // Imposta i valori iniziali per la configurazione quando i dati si caricano
  useEffect(() => {
    if (planConfig) {
      // Imposta funzionalità del piano
      if (planConfig.features) {
        const features = planConfig.features as Record<string, any>;
        const extractedFeatures: Record<string, boolean> = {};
        
        // Estrai le funzionalità booleane
        Object.keys(features).forEach(key => {
          if (typeof features[key] === 'boolean') {
            extractedFeatures[key] = features[key];
          }
        });
        
        setPlanFeatures(extractedFeatures);
      }
      
      // Imposta limiti del piano
      if (planConfig.limits) {
        const limits = planConfig.limits as Record<string, any>;
        const extractedLimits: Record<string, number> = {};
        
        // Estrai i limiti numerici
        Object.keys(limits).forEach(key => {
          if (typeof limits[key] === 'number') {
            extractedLimits[key] = limits[key];
          }
        });
        
        setPlanLimits(extractedLimits);
      }
      
      // Imposta accesso alle pagine (se presente)
      if (planConfig.features && planConfig.features.pageAccess) {
        setPageAccess(planConfig.features.pageAccess as Record<string, boolean>);
      }
      
      // Imposta visibilità dei campi (se presente)
      if (planConfig.features && planConfig.features.fieldVisibility) {
        setFieldVisibility(planConfig.features.fieldVisibility as Record<string, boolean>);
      }
      
      // Imposta permessi (se presente)
      if (planConfig.features && planConfig.features.permissions) {
        setPermissions(planConfig.features.permissions as Record<string, boolean>);
      }
      
      // Imposta stato attivo
      setIsConfigActive(planConfig.isActive !== null ? planConfig.isActive : true);
    }
  }, [planConfig]);
  
  // Mutation per aggiornare o creare la configurazione del piano
  const updatePlanConfig = useMutation({
    mutationFn: (data: any) => {
      if (planConfig?.id) {
        // Aggiorna una configurazione esistente
        return apiRequest("PUT", `/api/plan-configurations/${planConfig.id}`, data)
          .then(res => res.json());
      } else {
        // Crea una nuova configurazione
        return apiRequest("POST", "/api/plan-configurations", data)
          .then(res => res.json());
      }
    },
    onSuccess: () => {
      toast({
        title: "Operazione completata",
        description: "Configurazione del piano aggiornata con successo",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/plan-configurations?userId=${clientId}`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la configurazione del piano",
        variant: "destructive",
      });
      console.error("Errore nell'aggiornare la configurazione:", error);
    }
  });
  
  // Funzioni di utilità per la configurazione avanzata
  const getPlanFeatureValue = (key: string, defaultValue: boolean = false): boolean => {
    return planFeatures[key] !== undefined ? planFeatures[key] : defaultValue;
  };
  
  const updatePlanFeature = (key: string, value: boolean) => {
    setPlanFeatures(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const getPlanLimitValue = (key: string, defaultValue: number = 0): number => {
    return planLimits[key] !== undefined ? planLimits[key] : defaultValue;
  };
  
  const updatePlanLimit = (key: string, value: number) => {
    setPlanLimits(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const getPlanPageAccess = (key: string, defaultValue: boolean = false): boolean => {
    return pageAccess[key] !== undefined ? pageAccess[key] : defaultValue;
  };
  
  const updatePlanPageAccess = (key: string, value: boolean) => {
    setPageAccess(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const getFieldVisibility = (key: string, defaultValue: boolean = false): boolean => {
    return fieldVisibility[key] !== undefined ? fieldVisibility[key] : defaultValue;
  };
  
  const updateFieldVisibility = (key: string, value: boolean) => {
    setFieldVisibility(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const getPermission = (key: string, defaultValue: boolean = false): boolean => {
    return permissions[key] !== undefined ? permissions[key] : defaultValue;
  };
  
  const updatePermission = (key: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Submit per la configurazione avanzata
  const handleConfigSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Compila i dati delle funzionalità
    const features = {
      ...planFeatures,
      // Aggiungi anche le sezioni specializzate
      pageAccess: pageAccess,
      fieldVisibility: fieldVisibility,
      permissions: permissions
    };
    
    const configData = {
      userId: Number(clientId),
      planId: selectedPlanId,
      features: features,
      limits: planLimits,
      isActive: isConfigActive
    };
    
    updatePlanConfig.mutate(configData);
  };
  
  const isLoading = clientLoading || subscriptionLoading || plansLoading || configLoading;
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/dashboard")}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <h1 className="text-3xl font-bold">{t('admin.settings.clientPlan.title')}</h1>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settings.clientPlan.title')}</CardTitle>
                <CardDescription>
                  {t('admin.settings.clientPlan.description')} {client?.name || "il cliente"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Piano di Abbonamento</Label>
                    <Select 
                      value={selectedPlanId?.toString() || ''} 
                      onValueChange={(value) => setSelectedPlanId(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un piano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingFrequency">Frequenza di Fatturazione</Label>
                      <Select 
                        value={billingFrequency} 
                        onValueChange={(value) => setBillingFrequency(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona frequenza" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensile</SelectItem>
                          <SelectItem value="yearly">Annuale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data di Inizio</Label>
                      <Input 
                        id="startDate" 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">{t('admin.settings.clientPlan.subscriptionStatus')}</Label>
                    <Select 
                      value={status} 
                      onValueChange={(value) => setStatus(value)}
                      disabled={isTrial}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.settings.clientPlan.selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('admin.settings.clientPlan.active')}</SelectItem>
                        <SelectItem value="pending">{t('admin.settings.clientPlan.pending')}</SelectItem>
                        <SelectItem value="cancelled">{t('admin.settings.clientPlan.cancelled')}</SelectItem>
                        <SelectItem value="expired">{t('admin.settings.clientPlan.expired')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="trialMode"
                      checked={isTrial}
                      onCheckedChange={setIsTrial}
                    />
                    <Label htmlFor="trialMode">{t('admin.settings.clientPlan.trialVersion')}</Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!selectedPlanId || updateSubscription.isPending}
                    >
                      {updateSubscription.isPending ? (
                        <>{t('admin.settings.clientPlan.saving')}</>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('admin.settings.clientPlan.saveChanges')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Configurazione Avanzata</CardTitle>
                <CardDescription>
                  Personalizza le funzionalità e i limiti del piano per questo cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="funzionalita" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="funzionalita">Funzionalità</TabsTrigger>
                    <TabsTrigger value="pagine">Pagine</TabsTrigger>
                    <TabsTrigger value="campi-visibili">Campi Visibili</TabsTrigger>
                    <TabsTrigger value="permessi">Permessi</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="funzionalita">
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-700">
                          In questa sezione puoi selezionare quali funzionalità includere nel piano di
                          abbonamento. Per alcune funzionalità è possibile impostare dei limiti (ad esempio
                          il numero massimo di clienti).
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg">
                          <h3 className="font-medium text-lg px-4 pt-4">Gestione Entità</h3>
                          
                          <div className="divide-y">
                            {/* Gestione Clienti */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Gestione Clienti</h4>
                                <p className="text-sm text-gray-500">Aggiunta e gestione dei clienti</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="client_management"
                                  checked={getPlanFeatureValue("client_management", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("client_management", checked)}
                                />
                              </div>
                            </div>
                            
                            {/* Gestione Lavori */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Gestione Lavori</h4>
                                <p className="text-sm text-gray-500">Creazione e gestione di lavori</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="job_management"
                                  checked={getPlanFeatureValue("job_management", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("job_management", checked)}
                                />
                              </div>
                            </div>
                            
                            {/* Gestione Collaboratori */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Gestione Collaboratori</h4>
                                <p className="text-sm text-gray-500">Aggiunta e gestione di collaboratori</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="collaborator_management"
                                  checked={getPlanFeatureValue("collaborator_management", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("collaborator_management", checked)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          <h3 className="font-medium text-lg px-4 pt-4">Strumenti Operativi</h3>
                          
                          <div className="divide-y">
                            {/* Calendar */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Calendario</h4>
                                <p className="text-sm text-gray-500">Pianificazione e visualizzazione calendario</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="calendar"
                                  checked={getPlanFeatureValue("calendar", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("calendar", checked)}
                                />
                              </div>
                            </div>
                            
                            {/* Report */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Report e Statistiche</h4>
                                <p className="text-sm text-gray-500">Visualizzazione di report e statistiche</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="reports"
                                  checked={getPlanFeatureValue("reports", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("reports", checked)}
                                />
                              </div>
                            </div>
                            
                            {/* Notifiche */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Notifiche</h4>
                                <p className="text-sm text-gray-500">Sistema di notifiche via email e WhatsApp</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="notifications"
                                  checked={getPlanFeatureValue("notifications", true)}
                                  onCheckedChange={(checked) => updatePlanFeature("notifications", checked)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          <h3 className="font-medium text-lg px-4 pt-4">Limiti Operativi</h3>
                          
                          <div className="divide-y">
                            {/* Numero massimo di clienti */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Numero massimo di clienti</h4>
                                <p className="text-sm text-gray-500">Limita il numero di clienti che possono essere gestiti</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  className="w-20" 
                                  min="0"
                                  value={getPlanLimitValue("max_clients", 50)}
                                  onChange={(e) => updatePlanLimit("max_clients", parseInt(e.target.value))}
                                />
                              </div>
                            </div>
                            
                            {/* Numero massimo di lavori */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Numero massimo di lavori</h4>
                                <p className="text-sm text-gray-500">Limita il numero di lavori che possono essere creati</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  className="w-20" 
                                  min="0"
                                  value={getPlanLimitValue("max_jobs", 100)}
                                  onChange={(e) => updatePlanLimit("max_jobs", parseInt(e.target.value))}
                                />
                              </div>
                            </div>
                            
                            {/* Numero massimo di collaboratori */}
                            <div className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Numero massimo di collaboratori</h4>
                                <p className="text-sm text-gray-500">Limita il numero di collaboratori che possono essere gestiti</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  className="w-20" 
                                  min="0"
                                  value={getPlanLimitValue("max_collaborators", 10)}
                                  onChange={(e) => updatePlanLimit("max_collaborators", parseInt(e.target.value))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pagine">
                    <div className="space-y-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-700">
                          Qui puoi decidere quali pagine dell'applicazione sono accessibili con questo piano.
                          Per ciascuna pagina puoi impostare i permessi di accesso.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-1/2">Pagina</TableHead>
                              <TableHead className="text-center">Accesso</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Dashboard */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Dashboard</p>
                                  <p className="text-sm text-gray-500">Pannello di controllo principale</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("dashboard", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("dashboard", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Clienti */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Clienti</p>
                                  <p className="text-sm text-gray-500">Gestione dei clienti</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("clients", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("clients", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Lavori */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Lavori</p>
                                  <p className="text-sm text-gray-500">Gestione dei lavori</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("jobs", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("jobs", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Collaboratori */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Collaboratori</p>
                                  <p className="text-sm text-gray-500">Gestione dei collaboratori</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("collaborators", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("collaborators", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Calendario */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Calendario</p>
                                  <p className="text-sm text-gray-500">Visualizzazione del calendario</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("calendar", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("calendar", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Report */}
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">Report</p>
                                  <p className="text-sm text-gray-500">Visualizzazione dei report</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPlanPageAccess("reports", true)}
                                  onCheckedChange={(checked) => updatePlanPageAccess("reports", checked)}
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="campi-visibili">
                    <div className="space-y-4">
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-sm text-amber-700">
                          Configura quali campi sono visibili per ciascuna entità (clienti, lavori, etc.)
                          in base al piano di abbonamento.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-1/2">Campo</TableHead>
                              <TableHead className="text-center">Visibilità</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Campi Cliente */}
                            <TableRow>
                              <TableCell colSpan={2}>
                                <p className="font-medium text-blue-600">Campi Cliente</p>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Contatti Aggiuntivi</p>
                                <p className="text-sm text-gray-500">Permette di aggiungere contatti multipli per cliente</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getFieldVisibility("client_additional_contacts", true)}
                                  onCheckedChange={(checked) => updateFieldVisibility("client_additional_contacts", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Note Estese</p>
                                <p className="text-sm text-gray-500">Consente di aggiungere note estese ai clienti</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getFieldVisibility("client_extended_notes", true)}
                                  onCheckedChange={(checked) => updateFieldVisibility("client_extended_notes", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Campi Lavoro */}
                            <TableRow>
                              <TableCell colSpan={2}>
                                <p className="font-medium text-blue-600">Campi Lavoro</p>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Tracciamento Costi</p>
                                <p className="text-sm text-gray-500">Consente di tracciare i costi dei materiali e della manodopera</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getFieldVisibility("job_cost_tracking", true)}
                                  onCheckedChange={(checked) => updateFieldVisibility("job_cost_tracking", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Allegati Multipli</p>
                                <p className="text-sm text-gray-500">Permette di allegare più file ai lavori</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getFieldVisibility("job_multiple_attachments", true)}
                                  onCheckedChange={(checked) => updateFieldVisibility("job_multiple_attachments", checked)}
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="permessi">
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-purple-700">
                          Stabilisci quali operazioni (creazione, modifica, eliminazione) possono essere
                          eseguite dagli utenti di questo piano.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entità</TableHead>
                              <TableHead className="text-center">Lettura</TableHead>
                              <TableHead className="text-center">Creazione</TableHead>
                              <TableHead className="text-center">Modifica</TableHead>
                              <TableHead className="text-center">Eliminazione</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Clienti */}
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Clienti</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("client.view", true)}
                                  onCheckedChange={(checked) => updatePermission("client.view", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("client.create", true)}
                                  onCheckedChange={(checked) => updatePermission("client.create", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("client.edit", true)}
                                  onCheckedChange={(checked) => updatePermission("client.edit", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("client.delete", true)}
                                  onCheckedChange={(checked) => updatePermission("client.delete", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Lavori */}
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Lavori</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("job.view", true)}
                                  onCheckedChange={(checked) => updatePermission("job.view", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("job.create", true)}
                                  onCheckedChange={(checked) => updatePermission("job.create", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("job.edit", true)}
                                  onCheckedChange={(checked) => updatePermission("job.edit", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("job.delete", true)}
                                  onCheckedChange={(checked) => updatePermission("job.delete", checked)}
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Collaboratori */}
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">Collaboratori</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("collaborator.view", true)}
                                  onCheckedChange={(checked) => updatePermission("collaborator.view", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("collaborator.create", true)}
                                  onCheckedChange={(checked) => updatePermission("collaborator.create", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("collaborator.edit", true)}
                                  onCheckedChange={(checked) => updatePermission("collaborator.edit", checked)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={getPermission("collaborator.delete", true)}
                                  onCheckedChange={(checked) => updatePermission("collaborator.delete", checked)}
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6">
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="configActive"
                        checked={isConfigActive}
                        onCheckedChange={setIsConfigActive}
                      />
                      <Label htmlFor="configActive">Configurazione Attiva</Label>
                    </div>
                    
                    <Button 
                      onClick={handleConfigSubmit}
                      disabled={!selectedPlanId || updatePlanConfig.isPending}
                    >
                      {updatePlanConfig.isPending ? (
                        <>Salvataggio configurazione...</>
                      ) : (
                        <>
                          <Sliders className="mr-2 h-4 w-4" />
                          Salva Configurazione
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Piano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
                    <p className="text-lg font-semibold">{client?.name || "N/D"}</p>
                  </div>
                  
                  {subscription ? (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Piano Attuale</h3>
                        <div className="flex items-center mt-1">
                          <Badge className="mr-2" variant={subscription.status === "active" ? "default" : subscription.status === "trial" ? "secondary" : "outline"}>
                            {subscription.status === "active" && <CheckCircle className="mr-1 h-3 w-3" />}
                            {subscription.status === "trial" && <Clock className="mr-1 h-3 w-3" />}
                            {subscription.status === "cancelled" && <Ban className="mr-1 h-3 w-3" />}
                            {subscription.status === "active" ? "Attivo" : 
                             subscription.status === "trial" ? "Prova" :
                             subscription.status === "cancelled" ? "Cancellato" : 
                             subscription.status === "expired" ? "Scaduto" : 
                             subscription.status}
                          </Badge>
                          {plans.find(p => p.id === subscription.planId)?.name || "Piano sconosciuto"}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Validità</h3>
                        <div className="mt-1">
                          <p>
                            Da: {subscription.startDate ? format(new Date(subscription.startDate), 'dd/MM/yyyy', {locale: it}) : "N/D"}
                          </p>
                          <p>
                            A: {subscription.endDate ? format(new Date(subscription.endDate), 'dd/MM/yyyy', {locale: it}) : "N/D"}
                          </p>
                          {subscription.endDate && getRemainingDays() !== null && (
                            <p className={`text-sm mt-1 ${getRemainingDays() && getRemainingDays() < 7 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                              {getRemainingDays() && getRemainingDays() > 0 ? (
                                `${getRemainingDays()} giorni rimanenti`
                              ) : (
                                "Abbonamento scaduto"
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Fatturazione</h3>
                        <p className="mt-1">
                          {subscription.billingFrequency === "monthly" ? "Mensile" : 
                           subscription.billingFrequency === "yearly" ? "Annuale" : 
                           "N/D"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-gray-500">
                      Nessun abbonamento attivo
                    </div>
                  )}
                  
                  <Separator />
                  
                  {selectedPlanId && (
                    <div className="space-y-3">
                      <h3 className="font-medium">{t('admin.settings.clientPlan.selectedPlan')}</h3>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">{t('admin.settings.clientPlan.name')}</h4>
                        <p>{plans.find(p => p.id === selectedPlanId)?.name || t('admin.settings.clientPlan.unknownPlan')}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">{t('admin.settings.clientPlan.price')}</h4>
                        <p className="font-semibold">
                          €{(price || 0).toFixed(2)} {billingFrequency === "monthly" ? t('admin.settings.clientPlan.perMonth') : t('admin.settings.clientPlan.perYear')}
                        </p>
                      </div>
                      {endDate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">{t('admin.settings.clientPlan.expiration')}</h4>
                          <p>{format(endDate, 'dd/MM/yyyy', {locale: it})}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}