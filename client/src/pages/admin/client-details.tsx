import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Edit, FileText, RotateCcw, Briefcase, Calendar, Users, Box, Cog } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { useTranslation } from "react-i18next";

// Schema per il form di modifica del piano personalizzato
const planCustomizationSchema = z.object({
  planId: z.number(),
  customFeatures: z.string().nullable().optional(),
  customPricing: z.boolean().default(false),
  customMonthlyPrice: z.number().nullable().optional(),
  customYearlyPrice: z.number().nullable().optional(),
  customDuration: z.number().nullable().optional(),
  overrideDefaultSettings: z.boolean().default(false),
});

type PlanCustomizationFormValues = z.infer<typeof planCustomizationSchema>;

export default function ClientDetailsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const clientId = params.id ? parseInt(params.id) : 0;
  
  const { toast } = useToast();
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const { t } = useTranslation();
  
  // Query per ottenere i dettagli del cliente
  const { data: client, isLoading: isClientLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/clients/${clientId}`);
      return await response.json();
    },
    enabled: !!clientId,
  });

  // Query per ottenere il piano attuale del cliente
  const { data: clientSubscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}/subscription`],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/clients/${clientId}/subscription`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching client subscription:", error);
        return null;
      }
    },
    enabled: !!clientId,
  });

  // Query per ottenere tutti i piani disponibili
  const { data: plans = [], isLoading: arePlansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/subscription-plans");
      return await response.json();
    },
  });

  // Form per la personalizzazione del piano
  const form = useForm<PlanCustomizationFormValues>({
    resolver: zodResolver(planCustomizationSchema),
    defaultValues: {
      planId: clientSubscription?.planId || 0,
      customFeatures: clientSubscription?.customFeatures || null,
      customPricing: !!clientSubscription?.customMonthlyPrice || !!clientSubscription?.customYearlyPrice,
      customMonthlyPrice: clientSubscription?.customMonthlyPrice || null,
      customYearlyPrice: clientSubscription?.customYearlyPrice || null,
      customDuration: clientSubscription?.customDuration || null,
      overrideDefaultSettings: !!clientSubscription?.overrideDefaultSettings,
    },
  });

  // Aggiorna il form quando arrivano i dati dell'abbonamento
  useEffect(() => {
    if (clientSubscription) {
      form.reset({
        planId: clientSubscription.planId || 0,
        customFeatures: clientSubscription.customFeatures || null,
        customPricing: !!clientSubscription.customMonthlyPrice || !!clientSubscription.customYearlyPrice,
        customMonthlyPrice: clientSubscription.customMonthlyPrice || null,
        customYearlyPrice: clientSubscription.customYearlyPrice || null,
        customDuration: clientSubscription.customDuration || null,
        overrideDefaultSettings: !!clientSubscription.overrideDefaultSettings,
      });
    }
  }, [clientSubscription, form]);

  // Mutation per aggiornare il piano personalizzato
  const updatePlanMutation = useMutation({
    mutationFn: (data: PlanCustomizationFormValues) => 
      apiRequest("PUT", `/api/clients/${clientId}/subscription`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/subscription`] });
      toast({
        title: t('admin.settings.clientDetails.planUpdated'),
        description: t('admin.settings.clientDetails.planCustomizationsSaved'),
      });
      setIsPlanDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.clientDetails.error'),
        description: `${t('admin.settings.clientDetails.errorUpdatingPlan')}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Ottiene il piano corrente
  const getCurrentPlan = () => {
    if (!Array.isArray(plans) || !clientSubscription?.planId) return null;
    return plans.find((p: any) => p.id === clientSubscription.planId);
  };

  const currentPlan = getCurrentPlan();

  // Gestione del submit del form
  const onSubmitPlanCustomization = (data: PlanCustomizationFormValues) => {
    // Se customPricing è false, reimposta i prezzi personalizzati a null
    if (!data.customPricing) {
      data.customMonthlyPrice = null;
      data.customYearlyPrice = null;
    }
    
    updatePlanMutation.mutate(data);
  };

  // Funzione per ottenere la data di scadenza formattata
  const getExpiryDate = () => {
    if (!clientSubscription?.endDate) return t('admin.settings.clientDetails.noExpiration');
    
    const expiryDate = new Date(clientSubscription.endDate);
    return expiryDate.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Se è in caricamento, mostra un indicatore
  if (isClientLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Se il cliente non esiste
  if (!client) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">{t('common.notFound')}</h2>
          <p className="text-gray-500 mb-6">{t('common.notFoundDescription')}</p>
          <Button onClick={() => setLocation("/admin/dashboard")}>
            {t('admin.settings.clientDetails.backToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setLocation("/admin/dashboard")} className="flex items-center gap-2">
            <ArrowLeft size={16} />
            {t('admin.settings.clientDetails.backToDashboard')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.settings.clientDetails.title')}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Colonna info cliente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{client.name}</span>
              <Badge variant={client.type === "residential" ? "default" : client.type === "commercial" ? "secondary" : "outline"}>
                {client.type === "residential" ? t('admin.settings.clientEdit.residential') : client.type === "commercial" ? t('admin.settings.clientEdit.commercial') : t('admin.settings.clientEdit.industrial')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {client.address || t('admin.settings.clientDetails.noAddressSpecified')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('admin.settings.clientDetails.contactInformation')}</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">{t('admin.settings.clientEdit.email')}:</span>
                    <span>{client.email || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">{t('admin.settings.clientEdit.phone')}:</span>
                    <span>{client.phone || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">Referente:</span>
                    <span>{client.contactName || "-"}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('admin.settings.clientDetails.taxInformation')}</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">Cod. Fiscale:</span>
                    <span>{client.fiscalCode || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">P. IVA:</span>
                    <span>{client.vatNumber || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-500 w-24">PEC:</span>
                    <span>{client.pecEmail || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('admin.settings.clientDetails.notes')}</h3>
              <p className="text-gray-700">{client.notes || t('admin.settings.clientDetails.noNotesAvailable')}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-end pt-0">
            <Button variant="outline" onClick={() => setLocation(`/admin/clients/${clientId}/edit`)} className="flex items-center gap-2">
              <Edit size={16} />
              {t('admin.settings.clientDetails.editClient')}
            </Button>
          </CardFooter>
        </Card>

        {/* Colonna stato servizio */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.settings.clientDetails.serviceStatus')}</CardTitle>
            <CardDescription>
              {t('admin.settings.clientDetails.serviceStatusDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">{t('admin.settings.clientDetails.currentPlan')}</h3>
                {isSubscriptionLoading ? (
                  <p>{t('common.loading')}</p>
                ) : clientSubscription ? (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{currentPlan?.name || t('admin.settings.clientDetails.customPlan')}</span>
                      <Badge variant={clientSubscription.status === "active" ? "success" : "secondary"}>
                        {clientSubscription.status === "active" ? t('admin.settings.clientPlan.active') : t('admin.settings.clientDetails.inactive')}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.settings.clientDetails.billing')}:</span>
                        <span>{clientSubscription.billingFrequency === "monthly" ? t('admin.settings.clientPlan.perMonth') : t('admin.settings.clientDetails.annual')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.settings.clientDetails.price')}:</span>
                        <span>
                          €{clientSubscription.customMonthlyPrice || currentPlan?.monthlyPrice || 0} / {t('admin.settings.clientDetails.perMonth')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.settings.clientDetails.expiration')}:</span>
                        <span>{getExpiryDate()}</span>
                      </div>
                      {clientSubscription.customFeatures && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs font-medium">Personalizzazioni attive</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-gray-500">{t('admin.settings.clientDetails.noExpiration')}</p>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setIsPlanDialogOpen(true)} 
                className="w-full"
              >
                {clientSubscription ? t('admin.settings.clientDetails.customizePlan') : t('admin.settings.clientDetails.customizePlan')}
              </Button>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">{t('admin.settings.clientDetails.usageStatistics')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('admin.settings.clientDetails.totalJobs')}:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('admin.settings.clientDetails.spaceUsed')}:</span>
                    <span className="font-medium">0 MB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('admin.settings.clientDetails.accesses')}:</span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sezione tabbed per visualizzare le altre informazioni */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.settings.clientDetails.clientManagement')}</CardTitle>
          <CardDescription>
            {t('admin.settings.clientDetails.clientManagementDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jobs">
            <TabsList>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase size={16} />
                {t('admin.settings.clientDetails.jobs')}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText size={16} />
                {t('admin.settings.clientDetails.invoices')}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar size={16} />
                {t('admin.settings.clientDetails.calendar')}
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="flex items-center gap-2">
                <Users size={16} />
                {t('admin.settings.clientDetails.collaborators')}
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Box size={16} />
                {t('admin.settings.clientDetails.inventory')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="jobs" className="pt-4">
              <div className="p-20 flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-2">{t('admin.settings.clientDetails.noJobsFound')}</p>
                <Button variant="outline">Crea Nuovo Lavoro</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="invoices" className="pt-4">
              <div className="p-20 flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-2">{t('admin.settings.clientDetails.noInvoicesFound')}</p>
                <Button variant="outline">Crea Nuova Fattura</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="pt-4">
              <div className="p-20 flex flex-col items-center justify-center">
                <p className="text-gray-500">{t('admin.settings.clientDetails.noCalendarEvents')}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="collaborators" className="pt-4">
              <div className="p-20 flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-2">{t('admin.settings.clientDetails.noCollaboratorsAssigned')}</p>
                <Button variant="outline">Assegna Collaboratori</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="inventory" className="pt-4">
              <div className="p-20 flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-2">{t('admin.settings.clientDetails.noInventoryItems')}</p>
                <Button variant="outline">Aggiungi Elementi Inventario</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog per personalizzazione del piano */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {clientSubscription ? t('admin.settings.clientDetails.customizePlan') : t('admin.settings.clientDetails.assignPlan')}
            </DialogTitle>
            <DialogDescription>
              {clientSubscription 
                ? "Personalizza il piano di abbonamento per questo cliente" 
                : "Assegna un piano di abbonamento a questo cliente"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPlanCustomization)} className="space-y-4">
              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.settings.clientDetails.basePlan')}</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un piano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(plans) && plans.map((plan: any) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overrideDefaultSettings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Sostituisci impostazioni del piano</FormLabel>
                      <FormDescription>
                        Abilita questa opzione per personalizzare funzionalità e prezzi
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("overrideDefaultSettings") && (
                <>
                  <FormField
                    control={form.control}
                    name="customFeatures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funzionalità personalizzate (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"max_clients": 20, "collaborator_module": true}'
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Definisci quali funzionalità sono disponibili per questo cliente in formato JSON
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customPricing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Prezzo personalizzato</FormLabel>
                          <FormDescription>
                            Abilita per impostare un prezzo diverso da quello del piano base
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("customPricing") && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customMonthlyPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prezzo mensile (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                value={field.value === null ? "" : field.value}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customYearlyPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prezzo annuale (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                value={field.value === null ? "" : field.value}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="customDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durata personalizzata (giorni)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            value={field.value === null ? "" : field.value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : parseInt(e.target.value);
                              field.onChange(val);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Lascia vuoto per utilizzare la durata di default o per un piano illimitato
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPlanDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending
                    ? t('common.saving')
                    : clientSubscription
                    ? t('admin.settings.clientDetails.updatePlan')
                    : t('admin.settings.clientDetails.assignPlan')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}