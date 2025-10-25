import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslation } from "react-i18next";

import { ArrowLeft, Plus, Pencil, Trash2, Users, Settings, Zap } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Schema for client plan override
const clientPlanOverrideSchema = z.object({
  userId: z.number(),
  planId: z.number(),
  features: z.object({
    // Functionality features
    client_management: z.boolean().optional(),
    job_management: z.boolean().optional(),
    invoice_generation: z.boolean().optional(),
    collaborator_management: z.boolean().optional(),
    activity_tracking: z.boolean().optional(),
    materials_inventory: z.boolean().optional(),
    reports: z.boolean().optional(),
    calendar: z.boolean().optional(),
    notifications: z.boolean().optional(),
    
    // Page access control
    page_access: z.record(z.enum(['view', 'edit', 'none'])).optional(),
    
    // Visible fields configuration
    visible_fields: z.record(z.array(z.string())).optional(),
    
    // Operational permissions
    permissions: z.record(z.boolean()).optional(),
    
    // Feature limits
    limits: z.object({
      max_clients: z.number().optional(),
      max_jobs: z.number().optional(),
      max_collaborators: z.number().optional(),
      max_invoices: z.number().optional(),
      max_materials: z.number().optional(),
    }).optional(),
    
    // Client-specific overrides
    client_override: z.boolean().default(true),
    override_reason: z.string().optional(),
  }),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type ClientPlanOverrideFormValues = z.infer<typeof clientPlanOverrideSchema>;

// Available features for override
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

// Available pages for access control
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

// Available fields for visibility control
const availableFields = {
  clients: [
    { id: 'name', name: 'Nome Cliente', description: 'Nome completo del cliente' },
    { id: 'address', name: 'Indirizzo', description: 'Indirizzo completo' },
    { id: 'phone', name: 'Telefono', description: 'Numero di telefono' },
    { id: 'email', name: 'Email', description: 'Indirizzo email' },
    { id: 'type', name: 'Tipo di Cliente', description: 'Residenziale, commerciale, industriale' },
    { id: 'notes', name: 'Note', description: 'Note aggiuntive' },
    { id: 'geoLocation', name: 'Posizione Geografica', description: 'Coordinate GPS' },
    { id: 'createdAt', name: 'Data Creazione', description: 'Data di registrazione' }
  ],
  jobs: [
    { id: 'title', name: 'Titolo Lavoro', description: 'Titolo del lavoro' },
    { id: 'description', name: 'Descrizione', description: 'Descrizione dettagliata' },
    { id: 'startDate', name: 'Data Inizio', description: 'Data di inizio lavoro' },
    { id: 'endDate', name: 'Data Fine', description: 'Data di fine lavoro' },
    { id: 'status', name: 'Stato', description: 'Stato del lavoro' },
    { id: 'cost', name: 'Costo', description: 'Costo totale del lavoro' },
    { id: 'hourlyRate', name: 'Tariffa', description: 'Tariffa oraria' },
    { id: 'materialsCost', name: 'Costo Materiali', description: 'Costo dei materiali' },
    { id: 'location', name: 'Posizione', description: 'Indirizzo del cantiere' },
    { id: 'duration', name: 'Durata', description: 'Durata stimata' },
    { id: 'completedDate', name: 'Data Completamento', description: 'Data di completamento' },
    { id: 'priority', name: 'Priorità', description: 'Livello di priorità' },
    { id: 'photos', name: 'Foto', description: 'Foto del lavoro' },
    { id: 'assignedUserId', name: 'Assegnato a', description: 'Utente assegnato' }
  ]
};

export default function ClientPlanOverridesPage() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<any>(null);
  const [selectedPlanFeatures, setSelectedPlanFeatures] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch data
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await apiRequest("/api/clients");
      return await response.json();
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/subscription-plans");
      return await response.json();
    },
  });

  const { data: planConfigurations, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/plan-configurations"],
    queryFn: async () => {
      const response = await apiRequest("/api/plan-configurations");
      return await response.json();
    },
  });

  // Form setup
  const form = useForm<ClientPlanOverrideFormValues>({
    resolver: zodResolver(clientPlanOverrideSchema),
    defaultValues: {
      userId: 0,
      planId: 0,
      features: {
        client_management: false,
        job_management: false,
        invoice_generation: false,
        collaborator_management: false,
        activity_tracking: false,
        materials_inventory: false,
        reports: false,
        calendar: false,
        notifications: false,
        page_access: {},
        visible_fields: {},
        permissions: {},
        limits: {},
        client_override: true,
        override_reason: ''
      },
      isActive: true,
      notes: ''
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ClientPlanOverrideFormValues) => apiRequest({
      method: "POST",
      url: "/api/plan-configurations",
      data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-configurations"] });
      toast({
        title: t("admin.clientPlanOverrides.overrideCreatedTitle"),
        description: t("admin.clientPlanOverrides.overrideCreatedDescription"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("error_title"),
        description: error.response?.data?.error || t("error_override_creation"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClientPlanOverrideFormValues> }) =>
      apiRequest({
        method: "PUT",
        url: `/api/plan-configurations/${id}`,
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-configurations"] });
      toast({
        title: t("override_updated_title"),
        description: t("override_updated_description"),
      });
      setIsDialogOpen(false);
      setEditingOverride(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("error_title"),
        description: error.response?.data?.error || t("error_override_update"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      method: "DELETE",
      url: `/api/plan-configurations/${id}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-configurations"] });
      toast({
        title: t("override_deleted_title"),
        description: t("override_deleted_description"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error_title"),
        description: error.response?.data?.error || t("error_override_deletion"),
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (data: ClientPlanOverrideFormValues) => {
    if (editingOverride) {
      updateMutation.mutate({ id: editingOverride.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit
  const handleEdit = (override: any) => {
    setEditingOverride(override);
    form.reset({
      userId: override.userId,
      planId: override.planId,
      features: override.features ? JSON.parse(override.features) : {},
      isActive: override.isActive,
      notes: override.notes || ''
    });
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm(t("confirm_override_deletion"))) {
      deleteMutation.mutate(id);
    }
  };

  // Get client name by ID
  const getClientName = (userId: number) => {
    const client = clients?.find((c: any) => c.id === userId);
    return client ? client.name : `${t("client")} ${userId}`;
  };

  // Get plan name by ID
  const getPlanName = (planId: number) => {
    const plan = plans?.find((p: any) => p.id === planId);
    return plan ? plan.name : `${t("plan")} ${planId}`;
  };

  // Get override status
  const getOverrideStatus = (override: any) => {
    if (!override.features) return t("no_modifications");
    
    try {
      const features = JSON.parse(override.features);
      const modifiedFeatures = Object.keys(features).filter(key => 
        key !== 'client_override' && key !== 'override_reason' && features[key] !== undefined
      );
      
      if (modifiedFeatures.length === 0) return t("no_modifications");
      return `${modifiedFeatures.length} ${t("modifications")}`;
    } catch {
      return t("error_parsing");
    }
  };

  // Load base plan features when a plan is selected
  const loadBasePlanFeatures = (planId: number) => {
    const selectedPlan = plans?.find((p: any) => p.id === planId);
    if (selectedPlan && selectedPlan.features) {
      try {
        const planFeatures = JSON.parse(selectedPlan.features);
        setSelectedPlanFeatures(planFeatures);
        
        // Update form with base plan features as defaults
        const currentFeatures = form.getValues('features');
        const updatedFeatures = { ...currentFeatures };
        
        // Set base plan features as defaults
        availableFeatures.forEach(feature => {
          if (planFeatures[feature.id] !== undefined) {
            (updatedFeatures as any)[feature.id] = planFeatures[feature.id];
          }
        });
        
        form.setValue('features', updatedFeatures);
      } catch (error) {
        console.error('Error parsing plan features:', error);
        setSelectedPlanFeatures(null);
      }
    } else {
      setSelectedPlanFeatures(null);
    }
  };

  if (clientsLoading || plansLoading || configsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">{t("loading_configurations")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/settings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('admin.clientPlanOverrides.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.clientPlanOverrides.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('admin.clientPlanOverrides.newOverride')}
          </Button>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("total_clients")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("clients_in_system")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("available_plans")}</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("subscription_plans")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("active_overrides")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {planConfigurations?.filter((c: any) => c.isActive)?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("custom_configurations")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overrides Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("custom_configurations_title")}</CardTitle>
          <CardDescription>
            {t("manage_custom_plan_configurations")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("client")}</TableHead>
                <TableHead>{t("base_plan")}</TableHead>
                <TableHead>{t("modifications")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planConfigurations?.map((override: any) => (
                <TableRow key={override.id}>
                  <TableCell className="font-medium">
                    {getClientName(override.userId)}
                  </TableCell>
                  <TableCell>{getPlanName(override.planId)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getOverrideStatus(override)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={override.isActive ? "default" : "secondary"}>
                      {override.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {override.notes || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(override)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(override.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOverride ? t("edit_override") : t("new_client_override")}
            </DialogTitle>
            <DialogDescription>
              {t("customize_plan_configurations_description")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client")}</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_client")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name} ({client.email})
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
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("base_plan")}</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(Number(value));
                        // Load base plan features when plan is selected
                        loadBasePlanFeatures(Number(value));
                      }} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_base_plan")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans?.map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - €{plan.monthlyPrice}/mese
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Base Plan Features Display */}
              {selectedPlanFeatures && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    {t("base_plan_features")} - {getPlanName(form.getValues('planId'))}
                  </h3>
                  
                  {/* Functionality Features */}
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-blue-800 mb-2">{t("functionality")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableFeatures.map((feature) => {
                        const isEnabled = selectedPlanFeatures[feature.id] === true;
                        return (
                          <div key={feature.id} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div>
                                <div className="font-medium text-sm">{feature.name}</div>
                                <div className="text-xs text-gray-600">{feature.description}</div>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-gray-500">
                              {isEnabled ? t("included") : t("not_included")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pages Access */}
                  {selectedPlanFeatures.page_access && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-blue-800 mb-2">{t("pages")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availablePages.map((page) => {
                          const accessLevel = selectedPlanFeatures.page_access[page.id];
                          const getAccessColor = (level: string) => {
                            switch (level) {
                              case 'edit': return 'bg-green-500';
                              case 'view': return 'bg-yellow-500';
                              case 'none': return 'bg-red-500';
                              default: return 'bg-gray-300';
                            }
                          };
                          const getAccessText = (level: string) => {
                            switch (level) {
                              case 'edit': return t("edit");
                              case 'view': return t("readOnly");
                              case 'none': return t("notAccessible");
                              default: return t("not_included");
                            }
                          };
                          return (
                            <div key={page.id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getAccessColor(accessLevel)}`}></div>
                                <div>
                                  <div className="font-medium text-sm">{page.name}</div>
                                  <div className="text-xs text-gray-600">{page.description}</div>
                                </div>
                              </div>
                              <div className="text-xs font-medium text-gray-500">
                                {getAccessText(accessLevel)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Visible Fields */}
                  {selectedPlanFeatures.visible_fields && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-blue-800 mb-2">{t("fields")}</h4>
                      <div className="space-y-3">
                        {Object.entries(selectedPlanFeatures.visible_fields).map(([section, fields]: [string, any]) => (
                          <div key={section} className="bg-white rounded border p-3">
                            <div className="font-medium text-sm mb-2 capitalize">{section}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Array.isArray(fields) && fields.map((fieldId: string) => {
                                const field = availableFields[section as keyof typeof availableFields]?.find(f => f.id === fieldId);
                                return field ? (
                                  <div key={fieldId} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>{field.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  {selectedPlanFeatures.permissions && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-blue-800 mb-2">{t("permissions")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedPlanFeatures.permissions).map(([permission, enabled]: [string, any]) => (
                          <div key={permission} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div>
                                <div className="font-medium text-sm capitalize">{permission.replace(/_/g, ' ')}</div>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-gray-500">
                              {enabled ? t("included") : t("not_included")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Limits */}
                  {selectedPlanFeatures.limits && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-blue-800 mb-2">Limits</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedPlanFeatures.limits).map(([limit, value]: [string, any]) => (
                          <div key={limit} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <div>
                                <div className="font-medium text-sm capitalize">{limit.replace(/_/g, ' ')}</div>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-gray-500">
                              {value || 'Unlimited'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-sm text-blue-700">
                    {t("base_plan_features_description")}
                  </div>
                </div>
              )}

              {/* Features Configuration */}
              <Tabs defaultValue="functionality" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="functionality">{t("functionality")}</TabsTrigger>
                  <TabsTrigger value="pages">{t("pages")}</TabsTrigger>
                  <TabsTrigger value="fields">{t("fields")}</TabsTrigger>
                  <TabsTrigger value="permissions">{t("permissions")}</TabsTrigger>
                </TabsList>

                {/* Functionality Tab */}
                <TabsContent value="functionality" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableFeatures.map((feature) => (
                      <FormField
                        key={feature.id}
                        control={form.control}
                        name={`features.${feature.id}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{feature.name}</FormLabel>
                              <FormDescription>{feature.description}</FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* Pages Tab */}
                <TabsContent value="pages" className="space-y-4">
                  <div className="space-y-4">
                    {availablePages.map((page) => (
                      <FormField
                        key={page.id}
                        control={form.control}
                        name={`features.page_access.${page.id}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{page.name}</FormLabel>
                              <FormDescription>{page.description}</FormDescription>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <FormControl>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">{t("not_accessible")}</SelectItem>
                                <SelectItem value="view">{t("read_only")}</SelectItem>
                                <SelectItem value="edit">{t("edit")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-6">
                  {Object.entries(availableFields).map(([entity, fields]) => (
                    <div key={entity} className="space-y-4">
                      <h3 className="text-lg font-semibold capitalize">{entity}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((field) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={`features.visible_fields.${entity}`}
                            render={({ field: formField }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">{field.name}</FormLabel>
                                  <FormDescription>{field.description}</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={formField.value?.includes(field.id) || false}
                                    onCheckedChange={(checked) => {
                                      const currentFields = formField.value || [];
                                      if (checked) {
                                        formField.onChange([...currentFields, field.id]);
                                      } else {
                                        formField.onChange(currentFields.filter((f: string) => f !== field.id));
                                      }
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions" className="space-y-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="features.override_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("override_reason")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("explain_override_reason")}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("document_override_reason")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Additional Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("additional_notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("additional_notes_description")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("active_override")}</FormLabel>
                        <FormDescription>
                          {t("activate_deactivate_override")}
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
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingOverride(null);
                    form.reset();
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingOverride ? t("update") : t("create")} {t("override")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 