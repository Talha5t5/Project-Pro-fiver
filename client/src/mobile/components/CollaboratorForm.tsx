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
import MobileLayout from "../components/MobileLayout";
import { mobileApiCall } from "../utils/mobileApi";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
// Removed unused Select import
import { Badge } from "../../components/ui/badge";
import { MultiSelect } from "../../components/ui/multi-select";
import { Switch } from "../../components/ui/switch";

// Schema per il form
const collaboratorSchema = z.object({
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  email: z.string().email({ message: "Inserisci un indirizzo email valido" }).optional().or(z.literal('')),
  phone: z.string().optional(),
  roleIds: z.string().optional(), // JSON string for compatibility with backend
  selectedRoles: z.array(z.string()).default([]), // Array of role IDs as strings
  skills: z.array(z.string()).default([]),
  // Notification settings
  notifyByEmail: z.boolean().default(false),
  notifyByWhatsApp: z.boolean().default(false),
  notificationTime: z.number().default(24), // Hours before job
  canEditRegistrations: z.boolean().default(false)
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

export default function CollaboratorForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const collaboratorId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!collaboratorId && collaboratorId > 0;
  const [isSaving, setIsSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      roleIds: "",
      selectedRoles: [],
      skills: [],
      notifyByEmail: false,
      notifyByWhatsApp: false,
      notificationTime: 24,
      canEditRegistrations: false
    }
  });

  // Funzione per aggiungere una skill
  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = form.getValues("skills") || [];
      if (!currentSkills.includes(newSkill.trim())) {
        form.setValue("skills", [...currentSkills, newSkill.trim()]);
      }
      setNewSkill("");
    }
  };

  // Funzione per rimuovere una skill
  const removeSkill = (skill: string) => {
    const currentSkills = form.getValues("skills") || [];
    form.setValue("skills", currentSkills.filter(s => s !== skill));
  };

  // Carica i ruoli
  const { data: roles = [] } = useQuery({
    queryKey: ['/api/mobile/roles'],
    queryFn: async () => {
      const response = await fetch('/api/mobile/roles');
      if (!response.ok) {
        throw new Error('Errore nel recuperare i ruoli');
      }
      return response.json();
    }
  });

  // Carica i dati del collaboratore se siamo in modalità modifica
  const { isLoading } = useQuery({
    queryKey: [`/api/mobile/collaborators/${collaboratorId}`],
    queryFn: async () => {
      if (!collaboratorId) return undefined;
      const response = await fetch(`/api/mobile/collaborators/${collaboratorId}`);
      if (!response.ok) {
        throw new Error("Errore nel recuperare i dati del collaboratore");
      }
      return response.json();
    },
    enabled: isEditMode
  });

  // Funzione per processare i ruoli dal formato stringa a array di stringhe
  const processRoleIds = (roleIdsString: string | undefined | null): string[] => {
    if (!roleIdsString) return [];
    
    try {
      // Gestisce sia formato CSV che JSON array
      if (roleIdsString.startsWith('[') && roleIdsString.endsWith(']')) {
        const parsed = JSON.parse(roleIdsString);
        return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
      } else {
        return roleIdsString.split(',')
          .map(id => id.trim())
          .filter(id => id !== '')
          .map(id => String(id));
      }
    } catch (error) {
      console.error("Errore nel processare i roleIds:", error);
      return [];
    }
  };

  // Carica i dati nel form quando il collaboratore viene recuperato
  useEffect(() => {
    const loadCollaboratorData = async () => {
      if (isEditMode && collaboratorId && !isDataLoaded) {
        try {
          const response = await fetch(`/api/mobile/collaborators/${collaboratorId}`);
          if (!response.ok) {
            throw new Error("Errore nel recuperare i dati del collaboratore");
          }
          const data = await response.json();
          
          if (data) {
            // Assicuriamoci che skills sia un array
            const skills = Array.isArray(data.skills) ? data.skills : [];
            
            // Processa i roleIds da stringa ad array
            const selectedRoles = processRoleIds(data.roleIds);
            
            // Reset del form con i dati
            form.reset({
              ...data,
              skills,
              selectedRoles,
              notifyByEmail: data.notifyByEmail || false,
              notifyByWhatsApp: data.notifyByWhatsApp || false,
              notificationTime: data.notificationTime || 24,
              canEditRegistrations: data.canEditRegistrations || false
            });
            
            setIsDataLoaded(true);
          }
        } catch (error) {
          console.error("Errore nel caricare il collaboratore:", error);
        }
      }
    };
    
    loadCollaboratorData();
  }, [collaboratorId, isEditMode, form, isDataLoaded]);

  // Mutation per creare un nuovo collaboratore
  const createMutation = useMutation({
    mutationFn: async (values: CollaboratorFormValues) => {
      setIsSaving(true);
      try {
        console.log("Dati collaboratore da inviare:", JSON.stringify(values, null, 2));
        
        // Conversione roleId da stringa a numero se necessario
        let dataToSend = { ...values };
        // Remove roleId references as we're using selectedRoles now
        
        // Aggiungiamo roleIds come JSON string per compatibilità
        if (dataToSend.selectedRoles && dataToSend.selectedRoles.length > 0) {
          dataToSend.roleIds = JSON.stringify(dataToSend.selectedRoles);
        }
        const response = await mobileApiCall("POST", "/collaborators", dataToSend);

        console.log("Risposta del server:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Errore nella risposta:", errorText);
          throw new Error(`Errore durante la creazione del collaboratore: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        console.error("Errore nella chiamata API:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Collaboratore creato",
        description: "Il collaboratore è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/collaborators'] });
      setLocation("/mobile/settings/collaborators");
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

  // Mutation per aggiornare un collaboratore esistente
  const updateMutation = useMutation({
    mutationFn: async (values: CollaboratorFormValues) => {
      setIsSaving(true);
      try {
        console.log("Dati collaboratore da aggiornare:", JSON.stringify(values, null, 2));
        
        // Conversione roleId da stringa a numero se necessario
        let dataToSend = { ...values };
        // Remove roleId references as we're using selectedRoles now
        
        // Aggiungiamo roleIds come JSON string per compatibilità
        if (dataToSend.selectedRoles && dataToSend.selectedRoles.length > 0) {
          dataToSend.roleIds = JSON.stringify(dataToSend.selectedRoles);
        }
        const response = await mobileApiCall("PATCH", `/collaborators/${collaboratorId}`, dataToSend);

        console.log("Risposta del server:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Errore nella risposta:", errorText);
          throw new Error(`Errore durante l'aggiornamento del collaboratore: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        console.error("Errore nella chiamata API:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Collaboratore aggiornato",
        description: "Il collaboratore è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/collaborators'] });
      setLocation("/mobile/settings/collaborators");
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
  const onSubmit = (values: CollaboratorFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <MobileLayout
      title={isEditMode ? t("mobile.forms.collaborator.editTitle") : t("mobile.forms.collaborator.title")}
      showBackButton={true}
      rightAction={
        <Button variant="ghost" size="icon" onClick={() => setLocation("/mobile/settings/collaborators")}>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.collaborator.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mobile.forms.collaborator.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.collaborator.email")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t("mobile.forms.collaborator.emailPlaceholder")} 
                        type="email" 
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.collaborator.phone")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t("mobile.forms.collaborator.phonePlaceholder")} 
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
                name="selectedRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.collaborator.roles")}</FormLabel>
                    <MultiSelect
                      selected={field.value}
                      options={roles?.map((role: any) => ({
                        label: role.name,
                        value: String(role.id)
                      })) || []}
                      onChange={(selected) => {
                        field.onChange(selected);
                        // Update roleIds as JSON string for backend compatibility
                        form.setValue('roleIds', JSON.stringify(selected));
                      }}
                      placeholder={t("mobile.forms.collaborator.rolesPlaceholder")}
                    />
                    <FormDescription>
                      {t("mobile.forms.collaborator.rolesDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>{t("mobile.forms.collaborator.skills")}</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("skills")?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="py-1 px-2">
                      {skill}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeSkill(skill)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("mobile.forms.collaborator.skillsPlaceholder")}
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormDescription>
                  {t("mobile.forms.collaborator.skillsDescription")}
                </FormDescription>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-900 border-b pb-1">
                  {t("mobile.forms.collaborator.notificationSettings")}
                </div>
                
                <FormField
                  control={form.control}
                  name="notifyByEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("mobile.forms.collaborator.notifyByEmail")}</FormLabel>
                        <FormDescription>
                          {t("mobile.forms.collaborator.notifyByEmailDescription")}
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

                <FormField
                  control={form.control}
                  name="notifyByWhatsApp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("mobile.forms.collaborator.notifyByWhatsApp")}</FormLabel>
                        <FormDescription>
                          {t("mobile.forms.collaborator.notifyByWhatsAppDescription")}
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

                <FormField
                  control={form.control}
                  name="notificationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mobile.forms.collaborator.notificationTime")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="24"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("mobile.forms.collaborator.notificationTimeDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="canEditRegistrations"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("mobile.forms.collaborator.canEditRegistrations")}</FormLabel>
                        <FormDescription>
                          {t("mobile.forms.collaborator.canEditRegistrationsDescription")}
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

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? t("mobile.forms.collaborator.updateButton") : t("mobile.forms.collaborator.createButton")}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </MobileLayout>
  );
}