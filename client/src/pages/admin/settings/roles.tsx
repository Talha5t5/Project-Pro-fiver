import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { MultiSelect, OptionType } from "../../../components/ui/multi-select";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Permission categories - will be populated with translations
const getPermissionCategories = (t: any) => [
  {
    name: t('admin.roles.permissions.general'),
    items: [
      { id: "view_all", label: t('admin.roles.permissions.viewAllActivities') },
      { id: "view_assigned_only", label: t('admin.roles.permissions.viewAssignedOnly') },
      { id: "view_dashboard", label: t('admin.roles.permissions.viewDashboard') },
      { id: "view_settings", label: t('admin.roles.permissions.viewSettings') },
      { id: "view_registration", label: t('admin.roles.permissions.viewRegistration') },
    ]
  },
  {
    name: t('admin.roles.permissions.clients'),
    items: [
      { id: "client.view", label: t('admin.roles.permissions.viewClients') },
      { id: "client.create", label: t('admin.roles.permissions.createClients') },
      { id: "client.edit", label: t('admin.roles.permissions.editClients') },
      { id: "client.delete", label: t('admin.roles.permissions.deleteClients') },
      { id: "client.view_all", label: t('admin.roles.permissions.viewAllClients') },
    ]
  },
  {
    name: t('admin.roles.permissions.jobs'),
    items: [
      { id: "job.view", label: t('admin.roles.permissions.viewJobs') },
      { id: "job.create", label: t('admin.roles.permissions.createJobs') },
      { id: "job.edit", label: t('admin.roles.permissions.editJobs') },
      { id: "job.delete", label: t('admin.roles.permissions.deleteJobs') },
      { id: "job.complete", label: t('admin.roles.permissions.completeJobs') },
      { id: "job.view_all", label: t('admin.roles.permissions.viewAllJobs') },
      { id: "job.register", label: t('admin.roles.permissions.registerJobs') },
    ]
  },
  {
    name: t('admin.roles.permissions.activities'),
    items: [
      { id: "activity.view", label: t('admin.roles.permissions.viewActivities') },
      { id: "activity.create", label: t('admin.roles.permissions.createActivities') },
      { id: "activity.edit", label: t('admin.roles.permissions.editActivities') },
      { id: "activity.delete", label: t('admin.roles.permissions.deleteActivities') },
      { id: "activity.complete", label: t('admin.roles.permissions.completeActivities') },
      { id: "activity.assign", label: t('admin.roles.permissions.assignActivities') },
    ]
  },
  {
    name: t('admin.roles.permissions.collaborators'),
    items: [
      { id: "collaborator.view", label: t('admin.roles.permissions.viewCollaborators') },
      { id: "collaborator.create", label: t('admin.roles.permissions.createCollaborators') },
      { id: "collaborator.edit", label: t('admin.roles.permissions.editCollaborators') },
      { id: "collaborator.delete", label: t('admin.roles.permissions.deleteCollaborators') },
      { id: "collaborator.assign", label: t('admin.roles.permissions.assignToCollaborators') },
    ]
  },
  {
    name: t('admin.roles.permissions.invoicing'),
    items: [
      { id: "invoice.view", label: t('admin.roles.permissions.viewInvoices') },
      { id: "invoice.create", label: t('admin.roles.permissions.createInvoices') },
      { id: "invoice.edit", label: t('admin.roles.permissions.editInvoices') },
      { id: "invoice.delete", label: t('admin.roles.permissions.deleteInvoices') },
      { id: "invoice.send", label: t('admin.roles.permissions.sendInvoices') },
    ]
  },
  {
    name: t('admin.roles.permissions.reports'),
    items: [
      { id: "report.view", label: t('admin.roles.permissions.viewReports') },
      { id: "report.export", label: t('admin.roles.permissions.exportReports') },
      { id: "report.custom", label: t('admin.roles.permissions.createReports') },
    ]
  },
  {
    name: t('admin.roles.permissions.settings'),
    items: [
      { id: "company.view", label: t('admin.roles.permissions.viewSettings') },
      { id: "company.edit", label: t('admin.roles.permissions.editSettings') },
    ]
  },
];

// Flat list of all permissions for backward compatibility - will be populated with translations
const getAvailablePermissions = (t: any) => getPermissionCategories(t).flatMap(category => category.items);

// Schema for form validation
const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  sectorId: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function AdminRolesPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [sectorOptions, setSectorOptions] = useState<OptionType[]>([]);

  // Query per ottenere i ruoli
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: () => apiRequest("GET", "/api/roles").then(res => res.json()).catch(() => []),
  });

  // Query per ottenere i settori
  const { data: sectors = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ["/api/sectors"],
    queryFn: () => apiRequest("GET", "/api/sectors").then(res => res.json()).catch(() => []),
  });

  // Prepara le opzioni per il select dei settori
  useEffect(() => {
    if (Array.isArray(sectors) && sectors.length > 0) {
      const options = sectors.map((sector: any) => ({
        label: sector.name,
        value: sector.id.toString(),
      }));
      
      // Controlliamo che le opzioni siano effettivamente cambiate prima di impostarle
      const areOptionsChanged = 
        sectorOptions.length !== options.length || 
        options.some((opt, idx) => 
          !sectorOptions[idx] || 
          sectorOptions[idx].value !== opt.value || 
          sectorOptions[idx].label !== opt.label
        );
      
      if (areOptionsChanged) {
        setSectorOptions(options);
      }
    }
  }, [sectors, sectorOptions]);

  // Definiamo il form con React Hook Form
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      sectorId: null,
      isDefault: false,
      permissions: [],
    },
  });

  // Mutation per creare un nuovo ruolo
  const createMutation = useMutation({
    mutationFn: (data: RoleFormValues) => {
      // Converti l'ID del settore da stringa a numero o null
      const formattedData = {
        ...data,
        sectorId: data.sectorId && data.sectorId !== 'none' ? parseInt(data.sectorId) : null,
      };
      return apiRequest("POST", "/api/roles", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: t("admin.roles.roleCreated"),
        description: t("admin.roles.roleCreatedDescription"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("admin.roles.errorCreatingRole")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un ruolo esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleFormValues }) => 
      apiRequest("PUT", `/api/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: t("admin.roles.roleUpdated"),
        description: t("admin.roles.roleUpdatedDescription"),
      });
      setIsDialogOpen(false);
      setEditingRole(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("admin.roles.errorUpdatingRole")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un ruolo
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: t("admin.roles.roleDeleted"),
        description: t("admin.roles.roleDeletedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("admin.roles.errorDeletingRole")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      name: "",
      description: "",
      sectorId: null,
      isDefault: false,
      permissions: [],
    });
    setEditingRole(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (role: any) => {
    let permissions: string[] = [];
    try {
      if (role.permissions) {
        permissions = Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions);
      }
    } catch (e) {
      console.error("Errore nel parsing dei permessi:", e);
    }

    form.reset({
      name: role.name,
      description: role.description || "",
      sectorId: role.sectorId ? role.sectorId.toString() : null,
      isDefault: role.isDefault === null ? false : role.isDefault,
      permissions: permissions,
    });
    setEditingRole(role);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: RoleFormValues) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un ruolo
  const handleDelete = (id: number) => {
    if (confirm(t("admin.roles.confirmDeleteRole"))) {
      deleteMutation.mutate(id);
    }
  };

  // Funzione per ottenere il nome di un settore da un ID
  const getSectorName = (id: number | null) => {
    if (!id || !Array.isArray(sectors)) return "-";
    const sector = sectors.find((s: any) => s.id === id);
    return sector ? sector.name : `${t("admin.roles.table.sector")} #${id}`;
  };

  // Funzione per visualizzare i badge dei permessi
  const getPermissionBadges = (permissions: string[] | string) => {
    if (!permissions) return null;
    
    let permissionArray: string[] = [];
    try {
      if (typeof permissions === 'string') {
        permissionArray = JSON.parse(permissions);
      } else {
        permissionArray = permissions;
      }
      
      if (!Array.isArray(permissionArray) || permissionArray.length === 0) return null;
      
      const availablePermissions = getAvailablePermissions(t);
      return (
        <div className="flex flex-wrap gap-1">
          {permissionArray.slice(0, 3).map((id: string) => {
            const permission = availablePermissions.find(p => p.id === id);
            return permission ? (
              <Badge key={id} variant="outline" className="text-xs">
                {permission.label}
              </Badge>
            ) : null;
          })}
          {permissionArray.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{permissionArray.length - 3} {t("admin.roles.table.permissionsCount")}
            </Badge>
          )}
        </div>
      );
    } catch (e) {
      console.error("Errore nella visualizzazione dei permessi:", e);
      return null;
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
            {t('admin.roles.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.roles.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('admin.roles.newRole')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.roles.title')}</CardTitle>
          <CardDescription>
            {t('admin.roles.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRoles ? (
            <div className="flex justify-center p-6">
              <p>{t('admin.roles.loadingRoles')}</p>
            </div>
          ) : Array.isArray(roles) && roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">{t('admin.roles.noRolesAvailable')}</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                {t('admin.roles.createFirstRole')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.roles.table.name')}</TableHead>
                  <TableHead>{t('admin.roles.table.description')}</TableHead>
                  <TableHead>{t('admin.roles.table.sector')}</TableHead>
                  <TableHead>{t('admin.roles.table.permissions')}</TableHead>
                  <TableHead>{t('admin.roles.table.isDefault')}</TableHead>
                  <TableHead className="text-right">{t('admin.roles.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(roles) && roles.map((role: any) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || t('admin.roles.table.noDescription')}</TableCell>
                    <TableCell>{getSectorName(role.sectorId)}</TableCell>
                    <TableCell>
                      {getPermissionBadges(role.permissions) || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${role.isDefault ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                        {role.isDefault ? t('admin.roles.table.yes') : t('admin.roles.table.no')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role.id)}
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

      {/* Dialog per creare/modificare un ruolo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? t('admin.roles.editRole') : t('admin.roles.newRole')}
            </DialogTitle>
            <DialogDescription>
              {editingRole 
                ? t('admin.roles.editRoleDescription')
                : t('admin.roles.newRoleDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.roles.form.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.roles.form.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.roles.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('admin.roles.form.descriptionPlaceholder')}
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
                name="sectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.roles.form.sector')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ''} 
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.roles.form.sectorPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('admin.roles.form.noSector')}</SelectItem>
                        {sectorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="permissions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">{t('admin.roles.form.permissions')}</FormLabel>
                      <div className="text-sm text-gray-500">
                        {t('admin.roles.form.permissionsDescription')}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {getPermissionCategories(t).map((category) => (
                        <div key={category.name} className="border rounded-lg p-4">
                          <h3 className="font-medium text-lg mb-4">{category.name}</h3>
                          
                          {/* Special display for General category with radio options */}
                          {category.name === t('admin.roles.permissions.general') && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-2">
                                <FormField
                                  control={form.control}
                                  name="permissions"
                                  render={({ field }) => {
                                    // Controlla se è selezionata una delle opzioni di visibilità
                                    const viewAllSelected = field.value?.includes("view_all");
                                    const viewAssignedSelected = field.value?.includes("view_assigned_only");
                                    
                                    // Se nessuno è selezionato, di default seleziona "view_assigned_only"
                                    const handleViewOptionChange = (optionId: string) => {
                                      const currentValues = [...(field.value || [])];
                                      // Rimuovi entrambe le opzioni se presenti
                                      const filteredValues = currentValues.filter(
                                        id => id !== "view_all" && id !== "view_assigned_only"
                                      );
                                      // Aggiungi la nuova opzione selezionata
                                      field.onChange([...filteredValues, optionId]);
                                    };
                                    
                                    return (
                                      <div className="border rounded-lg p-3 space-y-3">
                                        <h4 className="font-medium">{t('admin.roles.form.activityVisibility')}</h4>
                                        <div className="flex flex-col space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <input 
                                              type="radio" 
                                              id="view_all" 
                                              name="view_option"
                                              checked={viewAllSelected}
                                              onChange={() => handleViewOptionChange("view_all")}
                                              className="h-4 w-4"
                                            />
                                            <label htmlFor="view_all" className="text-sm font-medium">
                                              {t('admin.roles.form.seeAllActivities')}
                                            </label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <input 
                                              type="radio" 
                                              id="view_assigned_only" 
                                              name="view_option"
                                              checked={viewAssignedSelected || (!viewAllSelected && !viewAssignedSelected)}
                                              onChange={() => handleViewOptionChange("view_assigned_only")}
                                              className="h-4 w-4"
                                            />
                                            <label htmlFor="view_assigned_only" className="text-sm font-medium">
                                              {t('admin.roles.form.seeOnlyAssignedActivities')}
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                              
                              {/* Altri permessi generali che non sono radio button */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {category.items.filter(p => p.id !== "view_all" && p.id !== "view_assigned_only").map((permission) => (
                                  <FormField
                                    key={permission.id}
                                    control={form.control}
                                    name="permissions"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={permission.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(permission.id)}
                                              onCheckedChange={(checked) => {
                                                const currentValues = field.value || [];
                                                let updatedValues: string[];
                                                
                                                if (checked) {
                                                  updatedValues = [...currentValues, permission.id];
                                                } else {
                                                  updatedValues = currentValues.filter(
                                                    (value) => value !== permission.id
                                                  );
                                                }
                                                
                                                field.onChange(updatedValues);
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="font-normal text-sm">
                                            {permission.label}
                                          </FormLabel>
                                        </FormItem>
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Visualizzazione speciale per la categoria "Clienti" con interfaccia risorse strutturata */}
                          {category.name === "Clienti" && (
                            <div className="space-y-4">
                              <div className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-medium">Gestione Clienti</h4>
                                  <p className="text-xs text-gray-500">Seleziona i permessi per questa categoria</p>
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="border p-2 text-left font-medium text-sm">Risorsa</th>
                                        <th className="border p-2 text-center font-medium text-sm">Visualizza</th>
                                        <th className="border p-2 text-center font-medium text-sm">Crea</th>
                                        <th className="border p-2 text-center font-medium text-sm">Modifica</th>
                                        <th className="border p-2 text-center font-medium text-sm">Elimina</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="border p-2 text-sm">Clienti</td>
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes("client.view")}
                                                    onCheckedChange={(checked) => {
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, "client.view"];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== "client.view");
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes("client.create")}
                                                    onCheckedChange={(checked) => {
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, "client.create"];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== "client.create");
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes("client.edit")}
                                                    onCheckedChange={(checked) => {
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, "client.edit"];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== "client.edit");
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes("client.delete")}
                                                    onCheckedChange={(checked) => {
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, "client.delete"];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== "client.delete");
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="border p-2 text-sm">Tutti i Clienti</td>
                                        <td className="border p-2 text-center" colSpan={4}>
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0 flex justify-center">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes("client.view_all")}
                                                    onCheckedChange={(checked) => {
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, "client.view_all"];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== "client.view_all");
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormLabel className="ml-2 my-0 text-xs">Visualizza tutti i clienti (non solo assegnati)</FormLabel>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Visualizzazione tabellare per le categorie con azioni standard */}
                          {(category.name === "Lavori" || 
                            category.name === "Attività" || 
                            category.name === "Collaboratori" || 
                            category.name === "Fatturazione" || 
                            category.name === "Azienda") && (
                            <div className="space-y-4">
                              <div className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-medium">Gestione {category.name}</h4>
                                  <p className="text-xs text-gray-500">Seleziona i permessi per questa categoria</p>
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="border p-2 text-left font-medium text-sm">Risorsa</th>
                                        <th className="border p-2 text-center font-medium text-sm">Visualizza</th>
                                        <th className="border p-2 text-center font-medium text-sm">Crea</th>
                                        <th className="border p-2 text-center font-medium text-sm">Modifica</th>
                                        <th className="border p-2 text-center font-medium text-sm">Elimina</th>
                                        {category.name === "Lavori" && (
                                          <th className="border p-2 text-center font-medium text-sm">Completa</th>
                                        )}
                                        {category.name === "Attività" && (
                                          <th className="border p-2 text-center font-medium text-sm">Completa</th>
                                        )}
                                        {category.name === "Collaboratori" && (
                                          <th className="border p-2 text-center font-medium text-sm">Assegna</th>
                                        )}
                                        {category.name === "Attività" && (
                                          <th className="border p-2 text-center font-medium text-sm">Assegna</th>
                                        )}
                                        {category.name === "Fatturazione" && (
                                          <th className="border p-2 text-center font-medium text-sm">Invia</th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="border p-2 text-sm">{category.name}</td>
                                        {/* Visualizza */}
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes(`${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.view`)}
                                                    onCheckedChange={(checked) => {
                                                      const permissionId = `${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.view`;
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, permissionId];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== permissionId);
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        {/* Crea */}
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes(`${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.create`)}
                                                    onCheckedChange={(checked) => {
                                                      const permissionId = `${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.create`;
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, permissionId];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== permissionId);
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        {/* Modifica */}
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes(`${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.edit`)}
                                                    onCheckedChange={(checked) => {
                                                      const permissionId = `${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.edit`;
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, permissionId];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== permissionId);
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        {/* Elimina */}
                                        <td className="border p-2 text-center">
                                          <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                              <FormItem className="m-0">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes(`${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.delete`)}
                                                    onCheckedChange={(checked) => {
                                                      const permissionId = `${category.name.toLowerCase().replace("à", "a").replace("è", "e")}.delete`;
                                                      const currentValues = field.value || [];
                                                      let updatedValues: string[];
                                                      
                                                      if (checked) {
                                                        updatedValues = [...currentValues, permissionId];
                                                      } else {
                                                        updatedValues = currentValues.filter(value => value !== permissionId);
                                                      }
                                                      
                                                      field.onChange(updatedValues);
                                                    }}
                                                  />
                                                </FormControl>
                                              </FormItem>
                                            )}
                                          />
                                        </td>
                                        {/* Completa (solo per Lavori e Attività) */}
                                        {category.name === "Lavori" && (
                                          <td className="border p-2 text-center">
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("job.complete")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "job.complete"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "job.complete");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        )}
                                        {category.name === "Attività" && (
                                          <td className="border p-2 text-center">
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("activity.complete")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "activity.complete"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "activity.complete");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        )}
                                        {/* Assegna (solo per Collaboratori e Attività) */}
                                        {category.name === "Collaboratori" && (
                                          <td className="border p-2 text-center">
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("collaborator.assign")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "collaborator.assign"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "collaborator.assign");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        )}
                                        {category.name === "Attività" && (
                                          <td className="border p-2 text-center">
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("activity.assign")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "activity.assign"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "activity.assign");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        )}
                                        {/* Invia (solo per Fatturazione) */}
                                        {category.name === "Fatturazione" && (
                                          <td className="border p-2 text-center">
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("invoice.send")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "invoice.send"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "invoice.send");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        )}
                                      </tr>
                                      {/* Riga speciale per "Visualizza Tutti" (per Lavori e categorie che supportano view_all) */}
                                      {(category.name === "Lavori") && (
                                        <tr>
                                          <td className="border p-2 text-sm">Tutti i {category.name}</td>
                                          <td className="border p-2 text-center" colSpan={category.name === "Lavori" ? 5 : 4}>
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0 flex justify-center">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("job.view_all")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "job.view_all"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "job.view_all");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="ml-2 my-0 text-xs">Visualizza tutti i lavori (non solo assegnati)</FormLabel>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        </tr>
                                      )}
                                      {/* Riga speciale per "Registra Lavori" (solo per Lavori) */}
                                      {(category.name === "Lavori") && (
                                        <tr>
                                          <td className="border p-2 text-sm">Registrazione Lavori</td>
                                          <td className="border p-2 text-center" colSpan={5}>
                                            <FormField
                                              control={form.control}
                                              name="permissions"
                                              render={({ field }) => (
                                                <FormItem className="m-0 flex justify-center">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes("job.register")}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        let updatedValues: string[];
                                                        
                                                        if (checked) {
                                                          updatedValues = [...currentValues, "job.register"];
                                                        } else {
                                                          updatedValues = currentValues.filter(value => value !== "job.register");
                                                        }
                                                        
                                                        field.onChange(updatedValues);
                                                      }}
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="ml-2 my-0 text-xs">Può registrare orari e materiali dei lavori</FormLabel>
                                                </FormItem>
                                              )}
                                            />
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Visualizzazione semplice per Report e le altre categorie */}
                          {(category.name === "Report" || category.name !== "Generale" && 
                            category.name !== "Clienti" && 
                            category.name !== "Lavori" && 
                            category.name !== "Attività" && 
                            category.name !== "Collaboratori" && 
                            category.name !== "Fatturazione" && 
                            category.name !== "Azienda") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {category.items.map((permission) => (
                                <FormField
                                  key={permission.id}
                                  control={form.control}
                                  name="permissions"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={permission.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(permission.id)}
                                            onCheckedChange={(checked) => {
                                              const currentValues = field.value || [];
                                              let updatedValues: string[];
                                              
                                              if (checked) {
                                                updatedValues = [...currentValues, permission.id];
                                              } else {
                                                updatedValues = currentValues.filter(
                                                  (value) => value !== permission.id
                                                );
                                              }
                                              
                                              field.onChange(updatedValues);
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal text-sm">
                                          {permission.label}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Di Default</FormLabel>
                      <div className="text-sm text-gray-500">
                        Se attivato, questo ruolo verrà proposto di default per il settore selezionato
                      </div>
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
                    : editingRole
                    ? "Aggiorna Ruolo"
                    : "Crea Ruolo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}