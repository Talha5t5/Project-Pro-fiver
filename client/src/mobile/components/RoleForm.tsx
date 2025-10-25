import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "../../hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import MobileLayout from "../components/MobileLayout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Switch } from "../../components/ui/switch";

// Schema per il form
const roleSchema = z.object({
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  description: z.string().optional(),
  isAdmin: z.boolean().default(false),
  permissions: z.record(z.string()).default({})
});

type RoleFormValues = z.infer<typeof roleSchema>;

// Lista di permessi disponibili con le relative etichette e opzioni granular
const getAvailablePermissions = (t: any) => [
  {
    id: "jobs",
    label: t("mobile.forms.role.permissionsList.jobs"),
    options: [
      { id: "jobs.create", label: t("mobile.forms.role.permissionsList.create") },
      { id: "jobs.edit", label: t("mobile.forms.role.permissionsList.edit") },
      { id: "jobs.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "clients",
    label: t("mobile.forms.role.permissionsList.clients"),
    options: [
      { id: "clients.create", label: t("mobile.forms.role.permissionsList.create") },
      { id: "clients.edit", label: t("mobile.forms.role.permissionsList.edit") },
      { id: "clients.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "activities",
    label: t("mobile.forms.role.permissionsList.activities"),
    options: [
      { id: "activities.create", label: t("mobile.forms.role.permissionsList.create") },
      { id: "activities.edit", label: t("mobile.forms.role.permissionsList.edit") },
      { id: "activities.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "reports",
    label: t("mobile.forms.role.permissionsList.reports"),
    options: [
      { id: "reports.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "collaborators",
    label: t("mobile.forms.role.permissionsList.collaborators"),
    options: [
      { id: "collaborators.create", label: t("mobile.forms.role.permissionsList.create") },
      { id: "collaborators.edit", label: t("mobile.forms.role.permissionsList.edit") },
      { id: "collaborators.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "settings",
    label: t("mobile.forms.role.permissionsList.settings"),
    options: [
      { id: "settings.edit", label: t("mobile.forms.role.permissionsList.edit") },
      { id: "settings.view", label: t("mobile.forms.role.permissionsList.view") }
    ]
  },
  {
    id: "assignments",
    label: t("mobile.forms.role.permissionsList.assignments"),
    options: [
      { id: "assignments.assign", label: t("mobile.forms.role.permissionsList.assign") },
      { id: "assignments.approve", label: t("mobile.forms.role.permissionsList.approve") }
    ]
  }
];

export default function RoleForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const roleId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!roleId && roleId > 0;
  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const availablePermissions = getAvailablePermissions(t);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      isAdmin: false,
      permissions: availablePermissions.reduce((acc, category) => {
        category.options.forEach(option => {
          acc[option.id] = "false";
        });
        return acc;
      }, {} as Record<string, string>)
    }
  });

  // Carica i dati del ruolo se siamo in modalità modifica
  const { isLoading } = useQuery({
    queryKey: [`/api/mobile/roles/${roleId}`],
    queryFn: async () => {
      if (!roleId) return undefined;
      const response = await fetch(`/api/mobile/roles/${roleId}`);
      if (!response.ok) {
        throw new Error("Errore nel recuperare i dati del ruolo");
      }
      return response.json();
    },
    enabled: isEditMode
  });

  // Carica i dati nel form quando il ruolo viene recuperato
  useEffect(() => {
    const loadRoleData = async () => {
      if (isEditMode && roleId && !isDataLoaded) {
        try {
          const response = await fetch(`/api/mobile/roles/${roleId}`);
          if (!response.ok) {
            throw new Error("Errore nel recuperare i dati del ruolo");
          }
          const data = await response.json();
          
          if (data) {
            // Assicuriamoci di parsare i permessi dal DB (string JSON -> object)
            const permissionsObj = typeof data.permissions === "string"
              ? ((): Record<string, boolean> => { try { return JSON.parse(data.permissions || "{}"); } catch { return {}; } })()
              : (data.permissions || {});

            // Prepariamo i permessi come oggetto string-based per il form
            const permissions = availablePermissions.reduce((acc, category) => {
              category.options.forEach(option => {
                const value = permissionsObj[option.id] === true ? "true" : "false";
                acc[option.id] = value;
              });
              return acc;
            }, {} as Record<string, string>);

            // Aggiorniamo i valori del form
            form.reset({
              ...data,
              permissions
            });
            
            setIsDataLoaded(true);
          }
        } catch (error) {
          console.error("Errore nel caricare il ruolo:", error);
        }
      }
    };
    
    loadRoleData();
  }, [roleId, isEditMode, form, isDataLoaded]);

  // Mutation per creare un nuovo ruolo
  const createMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      setIsSaving(true);
      // Converti le stringhe "true"/"false" in boolean per il backend
      const normalizedPermissions = Object.fromEntries(
        Object.entries(values.permissions || {}).map(([k, v]) => [k, v === "true"])
      );
      const response = await fetch("/api/mobile/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          permissions: normalizedPermissions
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore durante la creazione del ruolo: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Ruolo creato",
        description: "Il ruolo è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/roles'] });
      setLocation("/mobile/settings/roles");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation per aggiornare un ruolo esistente
  const updateMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      setIsSaving(true);
      const normalizedPermissions = Object.fromEntries(
        Object.entries(values.permissions || {}).map(([k, v]) => [k, v === "true"])
      );
      const response = await fetch(`/api/mobile/roles/${roleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          permissions: normalizedPermissions
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore durante l'aggiornamento del ruolo: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Ruolo aggiornato",
        description: "Il ruolo è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/roles'] });
      setLocation("/mobile/settings/roles");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Gestione del submit del form
  const onSubmit = (values: RoleFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <MobileLayout
      title={isEditMode ? t("mobile.forms.role.editTitle") : t("mobile.forms.role.title")}
      showBackButton={true}
      rightAction={
        <Button variant="ghost" size="icon" onClick={() => setLocation("/mobile/settings/roles")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* {isEditMode && (
                <div className="rounded-md border p-4 bg-muted/30">
                  <div className="text-sm font-medium mb-2">{t("mobile.forms.role.permissionsSummaryTitle", "Current permissions")}</div>
                  <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                    {availablePermissions.map(p => {
                      const val = form.getValues(`permissions.${p.id}` as const);
                      return (
                        <div key={p.id} className="flex items-center justify-between">
                          <span>{p.label}</span>
                          <span className={val === "true" ? "text-green-600" : "text-red-600"}>
                            {val === "true" ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )} */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.role.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mobile.forms.role.namePlaceholder")} {...field} />
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
                    <FormLabel>{t("mobile.forms.role.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("mobile.forms.role.descriptionPlaceholder")}
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
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("mobile.forms.role.administrator")}</FormLabel>
                      <FormDescription>
                        {t("mobile.forms.role.administratorDescription")}
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

              <div className="space-y-4">
                <FormLabel>{t("mobile.forms.role.permissions")}</FormLabel>
                <FormDescription>
                  {t("mobile.forms.role.permissionsDescription")}
                </FormDescription>
                
                <div className="space-y-4">
                  {availablePermissions.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="text-sm font-medium text-gray-900 border-b pb-1">
                        {category.label}
                      </div>
                      <div className="space-y-2 pl-4">
                        {category.options.map((option) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name={`permissions.${option.id}`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === "true"}
                                    onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm">
                                    {option.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? t("mobile.forms.role.updateButton") : t("mobile.forms.role.createButton")}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </MobileLayout>
  );
}