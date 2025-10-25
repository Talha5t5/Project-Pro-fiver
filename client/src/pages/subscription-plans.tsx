import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { queryClient, apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Pencil, Plus, Trash2 } from "lucide-react";

// Definiamo lo schema di validazione del form
const formSchema = z.object({
  name: z.string().min(1, { message: "Il nome è richiesto" }),
  monthlyPrice: z.coerce.number().min(0, { message: "Il prezzo mensile non può essere negativo" }),
  yearlyPrice: z.coerce.number().min(0, { message: "Il prezzo annuale non può essere negativo" }),
  monthlyDuration: z.coerce.number().min(1, { message: "La durata mensile deve essere di almeno 1 giorno" }).optional().nullable(),
  yearlyDuration: z.coerce.number().min(1, { message: "La durata annuale deve essere di almeno 1 giorno" }).optional().nullable(),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(false),
  description: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
});

// Definiamo il tipo piano di abbonamento
type SubscriptionPlan = {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyDuration: number | null;
  yearlyDuration: number | null;
  isActive: boolean | null;
  isFree: boolean | null;
  features: string | null;
  createdAt: string;
};

type FormValues = z.infer<typeof formSchema>;

export default function SubscriptionPlansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Query per ottenere i piani di abbonamento
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("/api/subscription-plans"),
  });

  // Definiamo il form con React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyDuration: 30,
      yearlyDuration: 365,
      isActive: true,
      isFree: false,
      description: "",
      features: "",
    },
  });

  // Mutation per creare un nuovo piano
  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("/api/subscription-plans", { method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
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
    mutationFn: ({ id, data }: { id: number; data: FormValues }) => 
      apiRequest(`/api/subscription-plans/${id}`, { method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Piano aggiornato",
        description: "Il piano di abbonamento è stato aggiornato con successo",
      });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento del piano: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un piano
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subscription-plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
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
      monthlyDuration: 30,
      yearlyDuration: 365,
      isActive: true,
      isFree: false,
      description: "",
      features: "",
    });
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (plan: SubscriptionPlan) => {
    form.reset({
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      monthlyDuration: plan.monthlyDuration || 30,
      yearlyDuration: plan.yearlyDuration || 365,
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
        <h1 className="text-3xl font-bold">Gestione Piani di Abbonamento</h1>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus size={16} />
          Nuovo Piano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Piani di abbonamento</CardTitle>
          <CardDescription>
            Gestisci i piani di abbonamento disponibili per gli utenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <p>Caricamento piani di abbonamento...</p>
            </div>
          ) : Array.isArray(plans) && plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">Nessun piano di abbonamento disponibile</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                Crea il primo piano
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">Piani Attivi</TabsTrigger>
                <TabsTrigger value="inactive">Piani Inattivi</TabsTrigger>
                <TabsTrigger value="all">Tutti</TabsTrigger>
              </TabsList>

              {["active", "inactive", "all"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Prezzo Mensile</TableHead>
                        <TableHead>Prezzo Annuale</TableHead>
                        <TableHead>Durata Mensile</TableHead>
                        <TableHead>Durata Annuale</TableHead>
                        <TableHead>Gratuito</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
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
                            <TableCell>€{plan.monthlyPrice.toFixed(2).replace(".", ",")}</TableCell>
                            <TableCell>€{plan.yearlyPrice.toFixed(2).replace(".", ",")}</TableCell>
                            <TableCell>{plan.monthlyDuration ? `${plan.monthlyDuration} giorni` : "Illimitato"}</TableCell>
                            <TableCell>{plan.yearlyDuration ? `${plan.yearlyDuration} giorni` : "Illimitato"}</TableCell>
                            <TableCell>{plan.isFree ? "Sì" : "No"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {plan.isActive ? "Attivo" : "Inattivo"}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Modifica Piano di Abbonamento" : "Nuovo Piano di Abbonamento"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Modifica i dettagli del piano di abbonamento selezionato"
                : "Crea un nuovo piano di abbonamento per gli utenti"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Essential, Pro, Enterprise..." {...field} />
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
                      <FormLabel>Prezzo Mensile (€)</FormLabel>
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
                      <FormLabel>Prezzo Annuale (€)</FormLabel>
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
                      <FormDescription>Lasciare vuoto per illimitato</FormDescription>
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
                      <FormDescription>Lasciare vuoto per illimitato</FormDescription>
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
                        <FormLabel>Attivo</FormLabel>
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
                        <FormLabel>Piano Gratuito</FormLabel>
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
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrizione del piano di abbonamento..."
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
                    <FormLabel>Funzionalità (formato JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"collaborator_module": true, "max_collaborators": 5, "job_types": true}'
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
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
                  Annulla
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvataggio..."
                    : editingPlan
                    ? "Aggiorna Piano"
                    : "Crea Piano"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}