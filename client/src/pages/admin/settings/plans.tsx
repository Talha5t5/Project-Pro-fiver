import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslation } from "react-i18next";

import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Definizione delle funzionalità disponibili nel sistema
const availableFeatures = [
  { id: 'client_management', name: 'Gestione Clienti', description: 'Aggiunta e gestione dei clienti' },
  { id: 'job_management', name: 'Gestione Lavori', description: 'Creazione e gestione di lavori' },
  { id: 'invoice_generation', name: 'Generazione Fatture', description: 'Creazione e invio di fatture' },
  { id: 'collaborator_management', name: 'Gestione Collaboratori', description: 'Aggiunta e gestione di collaboratori' },
  { id: 'activity_tracking', name: 'Monitoraggio Attività', description: 'Tracciamento delle attività svolte' },
  { id: 'materials_inventory', name: 'Inventario Materiali', description: 'Gestione dell\'inventario materiali' },
  { id: 'reports', name: 'Report e Statistiche', description: 'Visualizzazione di report e statistiche' },
  { id: 'calendar', name: 'Calendario', description: 'Pianificazione e visualizzazione calendario' },
  { id: 'notifications', name: 'Notifiche', description: 'Sistema di notifiche via email e WhatsApp' }
];

// Pagine disponibili nel sistema
const availablePages = [
  { id: 'dashboard', name: 'Dashboard', description: 'Pannello di controllo principale' },
  { id: 'clients', name: 'Clienti', description: 'Gestione dei clienti' },
  { id: 'jobs', name: 'Lavori', description: 'Gestione dei lavori' },
  { id: 'activities', name: 'Attività', description: 'Monitoraggio delle attività' },
  { id: 'calendar', name: 'Calendario', description: 'Visualizzazione del calendario' },
  { id: 'reports', name: 'Report', description: 'Visualizzazione dei report' },
  { id: 'settings', name: 'Impostazioni', description: 'Configurazione del sistema' },
  { id: 'profile', name: 'Profilo', description: 'Gestione del profilo utente' },
  { id: 'collaborators', name: 'Collaboratori', description: 'Gestione dei collaboratori' },
  { id: 'invoices', name: 'Fatture', description: 'Gestione delle fatture' },
  { id: 'materials', name: 'Materiali', description: 'Gestione dei materiali' }
];

// Schema per la validazione del form
const formSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0, "Il prezzo non può essere negativo"),
  yearlyPrice: z.coerce.number().min(0, "Il prezzo non può essere negativo"),
  monthlyDuration: z.coerce.number().nullable(),
  yearlyDuration: z.coerce.number().nullable(),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(false),
  vatRate: z.coerce.number().min(0, "L'IVA non può essere negativa").default(22).optional(),
  features: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminSettingsPlansPage() {
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Richiesta per ottenere i piani
  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/subscription-plans");
      return await response.json();
    },
  });

  // Form con react-hook-form e zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyDuration: null,
      yearlyDuration: null,
      isActive: true,
      isFree: false,
      vatRate: 22,
      features: ""
    },
  });

  // Mutation per creare un nuovo piano
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest({
      method: "POST",
      url: "/api/subscription-plans",
      data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: t("admin.settings.plans.form.save"),
        description: t("admin.settings.plans.form.save"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `${t("error_creating_plan")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un piano esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormValues }) => 
      apiRequest({
        method: "PUT",
        url: `/api/subscription-plans/${id}`,
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: t("plan_updated"),
        description: t("plan_updated_description"),
      });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `${t("error_updating_plan")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un piano
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      method: "DELETE",
      url: `/api/subscription-plans/${id}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: t("plan_deleted"),
        description: t("plan_deleted_description"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `${t("error_deleting_plan")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      name: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyDuration: null,
      yearlyDuration: null,
      isActive: true,
      isFree: false,
      vatRate: 22,
      description: "",
      features: "",
    });
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (plan: any) => {
    form.reset({
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      monthlyDuration: plan.monthlyDuration,
      yearlyDuration: plan.yearlyDuration,
      isActive: plan.isActive === null ? false : plan.isActive,
      isFree: plan.isFree === null ? false : plan.isFree,
      vatRate: plan.vatRate === null ? 22 : plan.vatRate,
      description: plan.description,
      features: plan.features,
    });
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: FormValues) => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un piano
  const handleDelete = (id: number) => {
    if (confirm(t("confirm_delete_plan"))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/settings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('admin.settings.plans.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.settings.plans.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('admin.settings.plans.newPlan')}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("plan_configuration_info_title")}</CardTitle>
          <CardDescription>
            {t("plan_configuration_info_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium">{t("available_features")}</h3>
              <p className="text-sm text-gray-600">
                {t("check_feature_activation")}
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-medium">{t("available_pages")}</h3>
              <p className="text-sm text-gray-600">
                {t("define_page_access")}
              </p>
            </div>
            
            <div className="border-l-4 border-amber-500 pl-4 py-2">
              <h3 className="font-medium">{t("visible_fields")}</h3>
              <p className="text-sm text-gray-600">
                {t("configure_field_visibility")}
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-medium">{t("operational_permissions")}</h3>
              <p className="text-sm text-gray-600">
                {t("define_user_permissions")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("subscription_plans")}</CardTitle>
          <CardDescription>
            {t("configure_subscription_plans")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <p>{t("loading_plans")}</p>
            </div>
          ) : Array.isArray(plans) && plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">{t("no_plans_available")}</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                {t("create_first_plan")}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">{t("active_plans")}</TabsTrigger>
                <TabsTrigger value="inactive">{t("inactive_plans")}</TabsTrigger>
                <TabsTrigger value="all">{t("all_plans")}</TabsTrigger>
              </TabsList>

              {["active", "inactive", "all"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead>{t("monthly_price")}</TableHead>
                        <TableHead>{t("yearly_price")}</TableHead>
                        <TableHead>{t("features")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(plans) && plans
                        .filter((plan: any) => {
                          if (tab === "active") return plan.isActive;
                          if (tab === "inactive") return !plan.isActive;
                          return true; // "all" tab
                        })
                        .map((plan: any) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>{plan.description || "-"}</TableCell>
                            <TableCell>€{Number(plan.monthlyPrice).toFixed(2).replace(".", ",")}</TableCell>
                            <TableCell>€{Number(plan.yearlyPrice).toFixed(2).replace(".", ",")}</TableCell>
                            
                            <TableCell>
                              {(() => {
                                // Mostra un riepilogo delle funzionalità attivate
                                try {
                                  const featuresObj = plan.features ? JSON.parse(plan.features) : {};
                                  const enabledFeatures = Object.keys(featuresObj);
                                  const totalFeatures = availableFeatures.length;
                                  
                                  if (enabledFeatures.length === 0) {
                                    return (
                                      <span className="text-red-500 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="10"></circle>
                                          <line x1="15" y1="9" x2="9" y2="15"></line>
                                          <line x1="9" y1="9" x2="15" y2="15"></line>
                                        </svg>
                                        {t("no_features_active")}
                                      </span>
                                    );
                                  }
                                  
                                  return (
                                    <div>
                                      <div className="flex items-center gap-1 text-green-600 font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        {enabledFeatures.length}/{totalFeatures} {t("features_active")}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {enabledFeatures.slice(0, 2).map(featureId => {
                                          const feature = availableFeatures.find(f => f.id === featureId);
                                          return feature ? feature.name : featureId;
                                        }).join(", ")}
                                        {enabledFeatures.length > 2 && ` +${enabledFeatures.length - 2} ${t("other_features")}`}
                                      </div>
                                    </div>
                                  );
                                } catch (e) {
                                  return <span className="text-orange-500">{t("invalid_format")}</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {plan.isActive ? t("active") : t("inactive")}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(plan)}
                                  className="flex items-center gap-1"
                                >
                                  <Pencil size={14} />
                                  {t("edit")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    form.reset({
                                      name: plan.name,
                                      monthlyPrice: plan.monthlyPrice,
                                      yearlyPrice: plan.yearlyPrice,
                                      monthlyDuration: plan.monthlyDuration,
                                      yearlyDuration: plan.yearlyDuration,
                                      isActive: plan.isActive === null ? false : plan.isActive,
                                      isFree: plan.isFree === null ? false : plan.isFree,
                                      vatRate: plan.vatRate === null ? 22 : plan.vatRate,
                                      description: plan.description,
                                      features: plan.features,
                                    });
                                    setEditingPlan(plan);
                                    setIsDialogOpen(true);
                                    // Forza la visualizzazione della scheda delle funzionalità
                                    setTimeout(() => {
                                      const featureTab = document.querySelector('[data-state="inactive"][value="features"]');
                                      if (featureTab) {
                                        (featureTab as HTMLElement).click();
                                      }
                                    }, 100);
                                  }}
                                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                  {t("features")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(plan.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Dialog per creare/modificare un piano */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[80vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t("edit_plan_title") : t("new_plan_title")}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? t("edit_plan_description")
                : t("create_plan_description")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("plan_name_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("monthly_price")} (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("yearly_price")} (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("monthly_duration")} (giorni)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t("monthly_duration_placeholder")}
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("monthly_duration_description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearlyDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("yearly_duration")} (giorni)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t("yearly_duration_placeholder")}
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("yearly_duration_description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t("active")}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border border-gray-300 data-[state=checked]:border-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFree"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t("free_plan")}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border border-gray-300 data-[state=checked]:border-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("vat_rate")} (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={t("vat_rate_placeholder")}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t("vat_rate_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("plan_description_placeholder")}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">{t("advanced_settings")}</h3>
                <Tabs defaultValue="features">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="features">{t("features")}</TabsTrigger>
                    <TabsTrigger value="pages">{t("pages")}</TabsTrigger>
                    <TabsTrigger value="fields">{t("visible_fields")}</TabsTrigger>
                    <TabsTrigger value="permissions">{t("permissions")}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="features">
                    <FormField
                      control={form.control}
                      name="features"
                      render={({ field }) => {
                        const featuresObject = field.value ? JSON.parse(field.value) : {};
                        const updateFeature = (id: string, enabled: boolean, limit?: number) => {
                          const newFeatures = { ...featuresObject };
                          if (enabled) {
                            newFeatures[id] = limit !== undefined ? limit : true;
                          } else {
                            delete newFeatures[id];
                          }
                          field.onChange(JSON.stringify(newFeatures));
                        };
                        
                        const featureCategories = [
                          {
                            title: t("admin.settings.planFeatures.entity_management"),
                            features: availableFeatures.filter(f => 
                              ['client_management', 'job_management', 'collaborator_management'].includes(f.id)
                            )
                          },
                          {
                            title: t("admin.settings.planFeatures.operational_tools"),
                            features: availableFeatures.filter(f => 
                              ['activity_tracking', 'materials_inventory', 'calendar'].includes(f.id)
                            )
                          },
                          {
                            title: t("admin.settings.planFeatures.documentation_analysis"),
                            features: availableFeatures.filter(f => 
                              ['invoice_generation', 'reports', 'notifications'].includes(f.id)
                            )
                          }
                        ];
                        
                        return (
                          <FormItem>
                            <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h3 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                {t("admin.settings.planFeatures.feature_configuration")}
                              </h3>
                              <p className="text-sm text-blue-600">
                                {t("admin.settings.planFeatures.select_features_to_include_in_plan")}
                                {t("admin.settings.planFeatures.for_some_features_you_can_set_limits")}
                              </p>
                            </div>
                            
                            <div className="space-y-6">
                              {featureCategories.map((category, idx) => (
                                <div key={idx} className="border rounded-lg overflow-hidden">
                                  <div className="bg-gray-50 p-3 font-medium border-b">
                                    {category.title}
                                  </div>
                                  <div className="divide-y">
                                    {category.features.map((feature) => {
                                      const enabled = featuresObject[feature.id] !== undefined;
                                      const hasLimit = typeof featuresObject[feature.id] === 'number';
                                      const limitValue = hasLimit ? featuresObject[feature.id] : 0;
                                      
                                      return (
                                        <div key={feature.id} className={`p-4 ${enabled ? "bg-white" : "bg-gray-50"}`}>
                                          <div className="flex justify-between items-start">
                                            <div className={`${enabled ? "" : "opacity-70"}`}>
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-medium">{t(`admin.settings.planFeatures.features.${feature.id}.name`)}</h4>
                                                {enabled && (
                                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                    {t("active")}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm text-gray-500 mt-1">{t(`admin.settings.planFeatures.features.${feature.id}.description`)}</p>
                                            </div>
                                            <Switch 
                                              checked={enabled}
                                              onCheckedChange={(checked) => updateFeature(feature.id, checked, hasLimit ? limitValue : undefined)}
                                              className="border border-gray-300 data-[state=checked]:border-primary"
                                            />
                                          </div>
                                          
                                          {enabled && ['client_management', 'job_management', 'collaborator_management'].includes(feature.id) && (
                                            <div className="mt-4 flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                              <div className="flex-1">
                                                <p className="text-sm font-medium">{t("admin.settings.planFeatures.max_limit")}</p>
                                                <p className="text-xs text-gray-500">{t("admin.settings.planFeatures.set_max_limit_for")}</p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Input 
                                                  type="number" 
                                                  value={limitValue || ''}
                                                  onChange={(e) => updateFeature(feature.id, true, parseInt(e.target.value) || 0)}
                                                  className="w-24"
                                                  placeholder={t("admin.settings.planFeatures.unlimited_placeholder")}
                                                />
                                                <div className="text-xs text-gray-500 whitespace-nowrap">({t("admin.settings.planFeatures.zero_unlimited")})</div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="pages">
                    <FormField
                      control={form.control}
                      name="features"
                      render={({ field }) => {
                        const featuresObject = field.value ? JSON.parse(field.value) : {};
                        const pageAccess = featuresObject.page_access || {};
                        
                        const updatePageAccess = (pageId: string, accessType: 'view' | 'edit' | 'none') => {
                          const newFeatures = { ...featuresObject };
                          if (!newFeatures.page_access) {
                            newFeatures.page_access = {};
                          }
                          
                          if (accessType === 'none') {
                            delete newFeatures.page_access[pageId];
                          } else {
                            newFeatures.page_access[pageId] = accessType;
                          }
                          
                          field.onChange(JSON.stringify(newFeatures));
                        };
                        
                        return (
                          <FormItem>
                            <div className="space-y-4">
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>{t("page")}</TableHead>
                                      <TableHead>{t("description")}</TableHead>
                                      <TableHead>{t("access")}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {availablePages.map((page) => (
                                      <TableRow key={page.id}>
                                        <TableCell className="font-medium">{page.name}</TableCell>
                                        <TableCell>{page.description}</TableCell>
                                        <TableCell>
                                          <select 
                                            className="border rounded p-1"
                                            value={pageAccess[page.id] || 'none'}
                                            onChange={(e) => updatePageAccess(page.id, e.target.value as 'view' | 'edit' | 'none')}
                                          >
                                            <option value="none">{t("not_accessible")}</option>
                                            <option value="view">{t("read_only")}</option>
                                            <option value="edit">{t("read_and_edit")}</option>
                                          </select>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="fields">
                    <FormField
                      control={form.control}
                      name="features"
                      render={({ field }) => {
                        const featuresObject = field.value ? JSON.parse(field.value) : {};
                        const visibleFields = featuresObject.visible_fields || {};
                        
                        // Campi per diverse entità e pagine dell'applicazione
                        const entityFields = {
                          clients: [
                            { id: 'name', label: t("client_name") },
                            { id: 'address', label: t("address") },
                            { id: 'phone', label: t("phone") },
                            { id: 'email', label: t("email") },
                            { id: 'type', label: t("client_type") },
                            { id: 'notes', label: t("notes") },
                            { id: 'geoLocation', label: t("geo_location") },
                            { id: 'sectorIds', label: t("sectors") },
                            { id: 'createdAt', label: t("creation_date") }
                          ],
                          jobs: [
                            { id: 'title', label: t("job_title") },
                            { id: 'description', label: t("description") },
                            { id: 'startDate', label: t("start_date") },
                            { id: 'endDate', label: t("end_date") },
                            { id: 'status', label: t("status") },
                            { id: 'cost', label: t("cost") },
                            { id: 'rate', label: t("rate") },
                            { id: 'location', label: t("location") },
                            { id: 'clientId', label: t("client") },
                            { id: 'duration', label: t("duration") },
                            { id: 'actualDuration', label: t("actual_duration") },
                            { id: 'completedDate', label: t("completion_date") },
                            { id: 'assignedTo', label: t("assigned_to") },
                            { id: 'priority', label: t("priority") },
                            { id: 'photos', label: t("photos") },
                            { id: 'materials', label: t("materials") },
                            { id: 'materialsCost', label: t("materials_cost") }
                          ],
                          activities: [
                            { id: 'name', label: t("activity_name") },
                            { id: 'description', label: t("description") },
                            { id: 'jobTypeId', label: t("job_type") },
                            { id: 'sectorIds', label: t("sectors") },
                            { id: 'isDefault', label: t("is_default") },
                            { id: 'defaultDuration', label: t("default_duration") },
                            { id: 'defaultRate', label: t("default_rate") },
                            { id: 'defaultCost', label: t("default_cost") },
                            { id: 'implementationNotes', label: t("implementation_notes") }
                          ],
                          job_activities: [
                            { id: 'startDate', label: t("start_date") },
                            { id: 'duration', label: t("duration") },
                            { id: 'status', label: t("status") },
                            { id: 'notes', label: t("notes") },
                            { id: 'completedDate', label: t("completion_date") },
                            { id: 'actualDuration', label: t("actual_duration") },
                            { id: 'photos', label: t("photos") },
                            { id: 'assignedTo', label: t("assigned_to") },
                            { id: 'activityId', label: t("activity") }
                          ],
                          collaborators: [
                            { id: 'name', label: t("collaborator_name") },
                            { id: 'roleId', label: t("role") },
                            { id: 'roleIds', label: t("roles") },
                            { id: 'phone', label: t("phone") },
                            { id: 'email', label: t("email") },
                            { id: 'username', label: t("username") },
                            { id: 'isActive', label: t("active") },
                            { id: 'language', label: t("language") },
                            { id: 'activationCode', label: t("activation_code") }
                          ],
                          profile: [
                            { id: 'name', label: t("name") },
                            { id: 'email', label: t("email") },
                            { id: 'phone', label: t("phone") },
                            { id: 'username', label: t("username") },
                            { id: 'language', label: t("language") },
                            { id: 'sectorId', label: t("sector") },
                            { id: 'roleId', label: t("role") },
                            { id: 'subscriptionInfo', label: t("subscription_info") },
                            { id: 'profilePicture', label: t("profile_picture") }
                          ],
                          dashboard: [
                            { id: 'activeJobs', label: t("active_jobs") },
                            { id: 'completedJobs', label: t("completed_jobs") },
                            { id: 'scheduledJobs', label: t("scheduled_jobs") },
                            { id: 'totalClients', label: t("total_clients") },
                            { id: 'inProgressActivities', label: t("in_progress_activities") },
                            { id: 'completedActivities', label: t("completed_activities") },
                            { id: 'monthlyEarnings', label: t("monthly_earnings") },
                            { id: 'yearlyEarnings', label: t("yearly_earnings") },
                            { id: 'upcomingJobs', label: t("upcoming_jobs") },
                            { id: 'recentActivities', label: t("recent_activities") }
                          ],
                          registration: [
                            { id: 'date', label: t("date") },
                            { id: 'time', label: t("time") },
                            { id: 'activityId', label: t("activity") },
                            { id: 'jobId', label: t("job") },
                            { id: 'duration', label: t("duration") },
                            { id: 'notes', label: t("notes") },
                            { id: 'photos', label: t("photos") },
                            { id: 'materials', label: t("materials_used") },
                            { id: 'location', label: t("location") },
                            { id: 'signature', label: t("client_signature") }
                          ]
                        };
                        
                        const updateFieldVisibility = (entity: string, fieldId: string, isVisible: boolean) => {
                          const newFeatures = { ...featuresObject };
                          if (!newFeatures.visible_fields) {
                            newFeatures.visible_fields = {};
                          }
                          if (!newFeatures.visible_fields[entity]) {
                            newFeatures.visible_fields[entity] = [];
                          }
                          
                          if (isVisible) {
                            if (!newFeatures.visible_fields[entity].includes(fieldId)) {
                              newFeatures.visible_fields[entity].push(fieldId);
                            }
                          } else {
                            newFeatures.visible_fields[entity] = newFeatures.visible_fields[entity].filter((id: string) => id !== fieldId);
                          }
                          
                          field.onChange(JSON.stringify(newFeatures));
                        };
                        
                        return (
                          <FormItem>
                            <div className="space-y-6">
                              {Object.entries(entityFields).map(([entity, fields]) => (
                                <div key={entity} className="border rounded-lg p-4">
                                  <h3 className="font-medium text-lg mb-2 capitalize">{entity}</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    {fields.map(field => {
                                      const isVisible = visibleFields[entity]?.includes(field.id) ?? true;
                                      return (
                                        <div key={field.id} className="flex items-center justify-between border rounded p-2">
                                          <span>{field.label}</span>
                                          <Switch 
                                            checked={isVisible}
                                            onCheckedChange={(checked) => updateFieldVisibility(entity, field.id, checked)}
                                            className="border border-gray-300 data-[state=checked]:border-primary"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="permissions">
                    <FormField
                      control={form.control}
                      name="features"
                      render={({ field }) => {
                        const featuresObject = field.value ? JSON.parse(field.value) : {};
                        const permissions = featuresObject.permissions || {};
                        
                        const permissionGroups = [
                          {
                            name: t("clients"),
                            icon: (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 21a8 8 0 0 0-16 0"></path>
                                <circle cx="10" cy="8" r="5"></circle>
                                <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
                              </svg>
                            ),
                            permissions: [
                              { id: 'client.create', label: t("create_new_clients") },
                              { id: 'client.edit', label: t("edit_existing_clients") },
                              { id: 'client.delete', label: t("delete_clients") },
                              { id: 'client.view_all', label: t("view_all_clients") }
                            ]
                          },
                          {
                            name: t("jobs"),
                            icon: (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                            ),
                            permissions: [
                              { id: 'job.create', label: t("create_new_jobs") },
                              { id: 'job.edit', label: t("edit_existing_jobs") },
                              { id: 'job.delete', label: t("delete_jobs") },
                              { id: 'job.complete', label: t("complete_jobs") },
                              { id: 'job.view_all', label: t("view_all_jobs") }
                            ]
                          },
                          {
                            name: t("invoicing"),
                            icon: (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="16" height="20" x="4" y="2" rx="2"></rect>
                                <path d="M8 10h8"></path>
                                <path d="M8 14h4"></path>
                                <path d="M16 19v3"></path>
                                <path d="M19 16h3"></path>
                                <path d="M19 22h3"></path>
                              </svg>
                            ),
                            permissions: [
                              { id: 'invoice.create', label: t("create_invoices") },
                              { id: 'invoice.edit', label: t("edit_invoices") },
                              { id: 'invoice.delete', label: t("delete_invoices") },
                              { id: 'invoice.send', label: t("send_invoices") }
                            ]
                          },
                          {
                            name: t("team"),
                            icon: (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                                <path d="M9 18h6"></path>
                                <path d="M10 22h4"></path>
                              </svg>
                            ),
                            permissions: [
                              { id: 'collaborator.create', label: t("add_collaborators") },
                              { id: 'collaborator.edit', label: t("edit_collaborators") },
                              { id: 'collaborator.delete', label: t("remove_collaborators") },
                              { id: 'collaborator.assign', label: t("assign_activities_to_collaborators") }
                            ]
                          },
                          {
                            name: t("settings"),
                            icon: (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            ),
                            permissions: [
                              { id: 'settings.view', label: t("view_settings") },
                              { id: 'settings.edit', label: t("edit_settings") }
                            ]
                          }
                        ];
                        
                        const updatePermission = (permId: string, allowed: boolean) => {
                          const newFeatures = { ...featuresObject };
                          if (!newFeatures.permissions) {
                            newFeatures.permissions = {};
                          }
                          
                          if (allowed) {
                            newFeatures.permissions[permId] = true;
                          } else {
                            delete newFeatures.permissions[permId];
                          }
                          
                          field.onChange(JSON.stringify(newFeatures));
                        };
                        
                        const toggleAllInGroup = (groupName: string, enable: boolean) => {
                          const group = permissionGroups.find(g => g.name === groupName);
                          if (!group) return;
                          
                          const newFeatures = { ...featuresObject };
                          if (!newFeatures.permissions) {
                            newFeatures.permissions = {};
                          }
                          
                          group.permissions.forEach(perm => {
                            if (enable) {
                              newFeatures.permissions[perm.id] = true;
                            } else {
                              delete newFeatures.permissions[perm.id];
                            }
                          });
                          
                          field.onChange(JSON.stringify(newFeatures));
                        };
                        
                        return (
                          <FormItem>
                            <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h3 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                {t("permission_configuration")}
                              </h3>
                              <p className="text-sm text-blue-600">
                                {t("configure_permissions_available_in_plan")}
                                {t("permissions_grouped_by_module")}
                              </p>
                            </div>
                            
                            <div className="space-y-6">
                              {permissionGroups.map((group) => {
                                const allPermissionsInGroup = group.permissions.map(p => p.id);
                                const enabledPermissionsInGroup = allPermissionsInGroup.filter(id => permissions[id] === true);
                                const allEnabled = allPermissionsInGroup.length === enabledPermissionsInGroup.length && allPermissionsInGroup.length > 0;
                                const someEnabled = enabledPermissionsInGroup.length > 0 && !allEnabled;
                                
                                return (
                                  <div key={group.name} className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                                      <div className="font-medium flex items-center gap-2 text-gray-700">
                                        {group.icon}
                                        {group.name}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-xs text-gray-500">
                                          {enabledPermissionsInGroup.length}/{allPermissionsInGroup.length} {t("permissions_active")}
                                        </div>
                                        <Switch
                                          checked={allEnabled}
                                          className={someEnabled ? "data-[state=checked]:bg-amber-500 data-[state=checked]:text-amber-50 border border-gray-300" : "border border-gray-300 data-[state=checked]:border-primary"}
                                          onCheckedChange={(checked) => toggleAllInGroup(group.name, checked)}
                                        />
                                      </div>
                                    </div>
                                    <div className="divide-y">
                                      {group.permissions.map(perm => {
                                        const isAllowed = permissions[perm.id] === true;
                                        
                                        return (
                                          <div key={perm.id} className={`p-3 flex items-center justify-between ${isAllowed ? "bg-white" : "bg-gray-50"}`}>
                                            <div className={`${isAllowed ? "" : "opacity-75"}`}>
                                              <div className="flex items-center gap-2">
                                                <span>{perm.label}</span>
                                                {isAllowed && (
                                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                    {t("enabled")}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <Switch 
                                              checked={isAllowed}
                                              onCheckedChange={(checked) => updatePermission(perm.id, checked)}
                                              className="border border-gray-300 data-[state=checked]:border-primary"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              
              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>{t("advanced_json")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`{"client_management": true, "max_clients": 10, "job_management": true}`}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("advanced_json_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? t("saving")
                    : editingPlan
                    ? t("update_plan")
                    : t("create_plan")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}