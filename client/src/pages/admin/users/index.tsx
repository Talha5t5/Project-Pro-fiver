import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { queryClient, apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus, User, UserCog, Shield, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

// Schema per la validazione del form degli admin
const adminSchema = z.object({
  username: z.string().min(1, "Username è richiesto"),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
  fullName: z.string().min(1, "Nome completo è richiesto"),
  email: z.string().email("Email non valida").optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string().min(1, "Il ruolo è richiesto"),
  isActive: z.boolean().default(true),
});

type AdminFormValues = z.infer<typeof adminSchema>;

export default function UsersPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Function to refresh all data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/user-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
    queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
    toast({
      title: "Data Refreshed",
      description: "All user data has been refreshed",
      variant: "default",
    });
  };

  // Query per ottenere gli amministratori e gli utenti
  const { data: administrators = [], isLoading: isLoadingAdmins } = useQuery({
    queryKey: ["/api/administrators"],
    queryFn: async () => {
      const response = await apiRequest("/api/administrators");
      return await response.json();
    },
  });

  // Query per ottenere i clienti
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await apiRequest("/api/clients");
      return await response.json();
    },
  });
  
  // Query per ottenere le sottoscrizioni utente
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ["/api/user-subscriptions"],
    queryFn: async () => {
      const response = await apiRequest("/api/user-subscriptions");
      return await response.json();
    },
    staleTime: 0, // Always fetch fresh data
  });
  
  // Query per ottenere i piani di abbonamento
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/subscription-plans");
      return await response.json();
    },
  });

  // Query per ottenere i ruoli
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/roles");
        return await response.json();
      } catch (error) {
        console.error("Error fetching roles:", error);
        return [];
      }
    },
  });

  // Definiamo il form con React Hook Form
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
    },
  });

  // Form per l'assegnazione del piano
  const planForm = useForm({
    defaultValues: {
      planId: "",
      billingFrequency: "monthly",
    },
  });

  // Mutation per creare un nuovo amministratore
  const createMutation = useMutation({
    mutationFn: (data: AdminFormValues) => apiRequest("/api/administrators", { method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      toast({
        title: "Amministratore creato",
        description: "L'amministratore è stato creato con successo",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione dell'amministratore: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un amministratore esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminFormValues }) => 
      apiRequest(`/api/administrators/${id}`, { method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      toast({
        title: "Amministratore aggiornato",
        description: "L'amministratore è stato aggiornato con successo",
      });
      setIsDialogOpen(false);
      setEditingAdmin(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento dell'amministratore: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un amministratore
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/administrators/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      toast({
        title: "Amministratore eliminato",
        description: "L'amministratore è stato eliminato con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione dell'amministratore: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare il piano di un utente
  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      // Trova la sottoscrizione attiva dell'utente
      const userSubscriptions = subscriptions.filter((s: any) => s.userId === userId && s.status === 'active');
      
      if (userSubscriptions.length > 0) {
        // Se ha già una sottoscrizione, aggiorna quella esistente (la più recente)
        const latestSubscription = userSubscriptions.reduce((latest: any, current: any) => 
          new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
        );
        
        return apiRequest("PUT", `/api/user-subscriptions/${latestSubscription.id}`, {
          planId: parseInt(data.planId),
          billingFrequency: data.billingFrequency,
          status: 'active',
        });
      } else {
        // Se non ha sottoscrizioni, crea una nuova
        return apiRequest("POST", "/api/user-subscriptions", {
          userId,
          planId: parseInt(data.planId),
          billingFrequency: data.billingFrequency,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      toast({
        title: "Piano aggiornato",
        description: "Il piano è stato aggiornato con successo",
      });
      setIsPlanDialogOpen(false);
      setSelectedUser(null);
      planForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento del piano: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
    });
    setEditingAdmin(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (admin: any) => {
    form.reset({
      username: admin.username,
      password: "", // Non mostriamo la password esistente
      fullName: admin.fullName,
      email: admin.email || "",
      phone: admin.phone || "",
      role: admin.roleId?.toString() || "",
      isActive: admin.isActive === null ? true : admin.isActive,
    });
    setEditingAdmin(admin);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: AdminFormValues) => {
    if (editingAdmin) {
      // Se stiamo modificando e la password è vuota, la rimuoviamo dai dati
      if (!data.password) {
        const { password, ...restData } = data;
        updateMutation.mutate({ id: editingAdmin.id, data: restData as AdminFormValues });
      } else {
        updateMutation.mutate({ id: editingAdmin.id, data });
      }
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un amministratore
  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo amministratore? Questa azione non può essere annullata.")) {
      deleteMutation.mutate(id);
    }
  };

  // Funzione per visualizzare i dettagli del cliente
  const viewClientDetails = (id: number) => {
    setLocation(`/admin/clients/${id}`);
  };

  // Funzione per aprire il dialog di assegnazione piano
  const openPlanDialog = (user: any) => {
    setSelectedUser(user);
    
    // Trova il piano attuale dell'utente
    const userSubscriptions = subscriptions.filter((s: any) => s.userId === user.id && s.status === 'active');
    const currentSubscription = userSubscriptions.length > 0 
      ? userSubscriptions.reduce((latest: any, current: any) => new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest)
      : null;
    
    planForm.reset({
      planId: currentSubscription ? currentSubscription.planId.toString() : "",
      billingFrequency: currentSubscription ? currentSubscription.billingFrequency : "monthly",
    });
    setIsPlanDialogOpen(true);
  };

  // Gestione del submit del form di assegnazione piano
  const onPlanSubmit = (data: any) => {
    if (selectedUser) {
      updatePlanMutation.mutate({ userId: selectedUser.id, data });
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
          <Button variant="outline" onClick={refreshData} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh Data
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.users.title')}</h1>
        </div>
        {activeTab === "administrators" && (
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <UserPlus size={16} />
            {t('admin.users.newUser')}
          </Button>
        )}
        {activeTab === "clients" && (
          <Button onClick={() => setLocation("/admin/clients/new")} className="flex items-center gap-2">
            <Plus size={16} />
            {t('admin.users.newClient')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <User size={16} />
            {t('admin.users.allUsers')}
          </TabsTrigger>
          <TabsTrigger value="administrators" className="flex items-center gap-1">
            <Shield size={16} />
            {t('admin.users.administrators')}
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-1">
            <User size={16} />
            {t('admin.users.clients')}
          </TabsTrigger>
        </TabsList>

        {/* Scheda Amministratori */}
        {/* Scheda Tutti gli Utenti */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.users.allUsers')}</CardTitle>
              <CardDescription>
                {t('admin.users.allUsersDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAdmins || isLoadingSubscriptions || isLoadingPlans ? (
                <div className="flex justify-center p-6">
                  <p>{t('common.loading')}</p>
                </div>
              ) : Array.isArray(administrators) && administrators.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-gray-500 mb-4">{t('admin.users.noUsersAvailable')}</p>
                  <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                    <UserPlus size={16} />
                    {t('admin.users.createFirstUser')}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users.username')}</TableHead>
                      <TableHead>{t('admin.users.fullName')}</TableHead>
                      <TableHead>{t('admin.users.email')}</TableHead>
                      <TableHead>{t('admin.users.type')}</TableHead>
                      <TableHead>{t('admin.users.subscription')}</TableHead>
                      <TableHead>{t('admin.users.status')}</TableHead>
                      <TableHead>{t('admin.users.expiration')}</TableHead>
                      <TableHead className="text-right">{t('admin.users.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(administrators) && administrators.map((user: any) => {
                      // Trova la sottoscrizione dell'utente (prendi la più recente)
                      const userSubscriptions = Array.isArray(subscriptions) 
                        ? subscriptions.filter((s: any) => s.userId === user.id && s.status === 'active')
                        : [];
                      
                      const userSubscription = userSubscriptions.length > 0 
                        ? userSubscriptions.reduce((latest, current) => 
                            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                          )
                        : null;
                      
                      // Trova il piano associato alla sottoscrizione
                      const userPlan = userSubscription && Array.isArray(plans) 
                        ? plans.find((p: any) => p.id === userSubscription.planId) 
                        : null;
                      
                      // Determina lo stato dell'abbonamento
                      let subscriptionStatus = t('admin.users.noSubscription');
                      let statusColor = "bg-gray-100 text-gray-800";
                      
                      if (userSubscription) {
                        if (userSubscription.status === "active") {
                          subscriptionStatus = t('admin.users.active');
                          statusColor = "bg-green-100 text-green-800";
                        } else if (userSubscription.status === "pending") {
                          subscriptionStatus = t('admin.users.pending');
                          statusColor = "bg-yellow-100 text-yellow-800";
                        } else if (userSubscription.status === "expired") {
                          subscriptionStatus = t('admin.users.expired');
                          statusColor = "bg-red-100 text-red-800";
                        }
                      }
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.fullName}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${user.type === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                              {user.type === "admin" ? t('admin.users.administrator') : t('admin.users.client')}
                            </span>
                          </TableCell>
                          <TableCell>{userPlan ? userPlan.name : t('admin.users.noPlan')}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                              {subscriptionStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            {userSubscription && userSubscription.endDate 
                              ? new Date(userSubscription.endDate).toLocaleDateString() 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.type === "admin" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(user)}
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => viewClientDetails(user.id)}
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPlanDialog(user)}
                                  >
                                    {t('admin.users.modifyPlan')}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Scheda Amministratori */}
        <TabsContent value="administrators">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.users.administrators')}</CardTitle>
              <CardDescription>
                {t('admin.users.administratorsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAdmins ? (
                <div className="flex justify-center p-6">
                  <p>{t('admin.users.loadingAdministrators')}</p>
                </div>
              ) : Array.isArray(administrators) && administrators.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-gray-500 mb-4">{t('admin.users.noAdministratorsAvailable')}</p>
                  <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                    <UserPlus size={16} />
                    {t('admin.users.createFirstAdministrator')}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users.username')}</TableHead>
                      <TableHead>{t('admin.users.fullName')}</TableHead>
                      <TableHead>{t('admin.users.email')}</TableHead>
                      <TableHead>{t('admin.users.phone')}</TableHead>
                      <TableHead>{t('admin.users.role')}</TableHead>
                      <TableHead>{t('admin.users.status')}</TableHead>
                      <TableHead className="text-right">{t('admin.users.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(administrators) && administrators
                      .filter((admin: any) => admin.type === "admin")
                      .map((admin: any) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.username}</TableCell>
                        <TableCell>{admin.fullName}</TableCell>
                        <TableCell>{admin.email || "-"}</TableCell>
                        <TableCell>{admin.phone || "-"}</TableCell>
                        <TableCell>
                          {roles && Array.isArray(roles) ? roles.find((r: any) => r.id === admin.roleId)?.name || t('admin.users.noRole') : t('admin.users.noRole')}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${admin.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {admin.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(admin)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(admin.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheda Clienti */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.users.clients')}</CardTitle>
              <CardDescription>
                {t('admin.users.clientsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingClients ? (
                <div className="flex justify-center p-6">
                  <p>{t('admin.users.loadingClients')}</p>
                </div>
              ) : Array.isArray(clients) && clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-gray-500 mb-4">{t('admin.users.noClientsAvailable')}</p>
                  <Button onClick={() => setLocation("/admin/clients/new")} variant="outline" className="flex items-center gap-2">
                    <Plus size={16} />
                    {t('admin.users.createFirstClient')}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users.name')}</TableHead>
                      <TableHead>{t('admin.users.type')}</TableHead>
                      <TableHead>{t('admin.users.email')}</TableHead>
                      <TableHead>{t('admin.users.phone')}</TableHead>
                      <TableHead>{t('admin.users.address')}</TableHead>
                      <TableHead>{t('admin.users.jobs')}</TableHead>
                      <TableHead className="text-right">{t('admin.users.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(clients) && clients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          {client.type === "residential" && t('admin.settings.clientEdit.residential')}
                          {client.type === "commercial" && t('admin.settings.clientEdit.commercial')}
                          {client.type === "industrial" && t('admin.settings.clientEdit.industrial')}
                        </TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
                        <TableCell>{client.phone || "-"}</TableCell>
                        <TableCell>{client.address || "-"}</TableCell>
                        <TableCell>{client.jobCount || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewClientDetails(client.id)}
                            >
                              <Pencil size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog per creare/modificare un amministratore */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? "Modifica Amministratore" : "Nuovo Amministratore"}
            </DialogTitle>
            <DialogDescription>
              {editingAdmin
                ? "Modifica i dettagli dell'amministratore selezionato"
                : "Crea un nuovo account amministrativo"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
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
                    <FormLabel>{editingAdmin ? "Nuova Password (lasciare vuoto per mantenere l'attuale)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome e Cognome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefono" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruolo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona ruolo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
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
                    : editingAdmin
                    ? "Aggiorna Amministratore"
                    : "Crea Amministratore"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per l'assegnazione del piano */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiorna Piano</DialogTitle>
            <DialogDescription>
              Modifica il piano di abbonamento per {selectedUser?.fullName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piano di Abbonamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un piano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan: any) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.name} - {plan.monthlyPrice}€/mese
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={planForm.control}
                name="billingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequenza di Fatturazione</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona frequenza" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="yearly">Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPlanDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending ? "Aggiornamento..." : "Aggiorna Piano"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}