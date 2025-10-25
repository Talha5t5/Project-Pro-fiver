import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, Home } from "lucide-react";
import { SubscriptionPlan } from "@shared/schema";
import { useTranslation } from "react-i18next";

// Schema per la validazione del form
const formSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  description: z.string().nullable().optional(),
  monthlyPrice: z.coerce.number().min(0, "Il prezzo deve essere maggiore o uguale a 0"),
  yearlyPrice: z.coerce.number().min(0, "Il prezzo deve essere maggiore o uguale a 0"),
  monthlyDuration: z.coerce.number().nullable().optional(),
  yearlyDuration: z.coerce.number().nullable().optional(),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(false),
  features: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminSubscriptionPlansPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Query per ottenere i piani di abbonamento
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/subscription-plans").then(res => res.json()),
    retry: 3, // retry a few times in case of network issues
    retryDelay: 1000, // 1 second between retries
  });

  // Definiamo il form con React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyDuration: null,
      yearlyDuration: null,
      isActive: true,
      isFree: false,
      description: "",
      features: "",
    },
  });

  // Mutation per creare un nuovo piano
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/subscription-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Piano creato",
        description: "Il piano di abbonamento è stato creato con successo",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione del piano: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un piano esistente
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      console.log(`Invio richiesta PUT a /api/subscription-plans/${id} con dati:`, data);
      const response = await apiRequest("PUT", `/api/subscription-plans/${id}`, data);
      console.log("Risposta ricevuta:", response);
      return response;
    },
    onSuccess: () => {
      console.log("Successo nella mutation di aggiornamento!");
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Piano aggiornato",
        description: "Il piano di abbonamento è stato aggiornato con successo",
      });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error) => {
      console.error("Errore durante la mutation di aggiornamento:", error);
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento del piano: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un piano
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subscription-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      // Ricarica i dati dei piani
      queryClient.refetchQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Piano eliminato",
        description: "Il piano di abbonamento è stato eliminato con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione del piano: ${error}`,
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
    if (confirm("Sei sicuro di voler eliminare questo piano di abbonamento?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setLocation("/admin/dashboard")} className="flex items-center gap-2">
            <ArrowLeft size={16} />
                          {t('common.back')} {t('admin.dashboard.dashboard')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.plans.title')}</h1>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus size={16} />
          {t('admin.plans.newPlan')}
        </Button>
      </div>

      <Card>
        <CardHeader>
                      <CardTitle>{t('admin.plans.title')}</CardTitle>
            <CardDescription>
              {t('admin.plans.description')}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <p>{t('common.loading')}</p>
            </div>
          ) : Array.isArray(plans) && plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">{t('admin.plans.noPlansAvailable')}</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                {t('admin.plans.createPlan')}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">{t('admin.plans.activePlans')}</TabsTrigger>
                <TabsTrigger value="inactive">{t('admin.plans.inactivePlans')}</TabsTrigger>
                <TabsTrigger value="all">{t('admin.plans.allPlans')}</TabsTrigger>
              </TabsList>

              {["active", "inactive", "all"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.plans.planName')}</TableHead>
                        <TableHead>{t('admin.plans.planDescription')}</TableHead>
                        <TableHead>{t('admin.plans.monthlyPrice')}</TableHead>
                        <TableHead>{t('admin.plans.yearlyPrice')}</TableHead>
                        <TableHead>Durata Mensile</TableHead>
                        <TableHead>Durata Annuale</TableHead>
                        <TableHead>{t('admin.plans.isFree')}</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">{t('admin.plans.actions')}</TableHead>
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
                            <TableCell>{plan.monthlyDuration ? `${plan.monthlyDuration} giorni` : "Illimitato"}</TableCell>
                            <TableCell>{plan.yearlyDuration ? `${plan.yearlyDuration} giorni` : "Illimitato"}</TableCell>
                            <TableCell>{plan.isFree ? "Sì" : "No"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {plan.isActive ? t('admin.plans.isActive') : "Inattivo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(plan)}
                                >
                                  <Pencil size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(plan.id)}
                                >
                                  <Trash2 size={16} />
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t('admin.plans.editPlan') : t('admin.plans.newPlan')}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? t('admin.plans.editPlan')
                : t('admin.plans.description')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.plans.planName')}</FormLabel>
                    <FormControl>
                                              <Input placeholder={t('admin.plans.planName')} {...field} />
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
                      <FormLabel>{t('admin.plans.monthlyPrice')} (€)</FormLabel>
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
                      <FormLabel>{t('admin.plans.yearlyPrice')} (€)</FormLabel>
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
                      <FormLabel>Durata Mensile (giorni)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="30..."
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Lasciare vuoto per durata illimitata
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
                      <FormLabel>Durata Annuale (giorni)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="365..."
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Lasciare vuoto per durata illimitata
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
                        <FormLabel>{t('admin.plans.isActive')}</FormLabel>
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

                <FormField
                  control={form.control}
                  name="isFree"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('admin.plans.isFree')}</FormLabel>
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.plans.planDescription')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('admin.plans.planDescription')}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.plans.features')} (formato JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"collaborator_module": true, "max_collaborators": 5, "job_types": true}'
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('admin.plans.features')} - {t('admin.plans.description')}
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
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? t('common.loading')
                    : editingPlan
                    ? t('admin.plans.updatePlan')
                    : t('admin.plans.createPlan')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}