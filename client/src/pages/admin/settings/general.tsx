import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Separator } from "../../../components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Schema per la validazione del form
const generalSettingsSchema = z.object({
  // App
  appName: z.string().min(1, "Il nome dell'applicazione è richiesto"),
  defaultLanguage: z.string().min(1, "La lingua predefinita è richiesta"),
  
  // Notifiche
  enableEmailNotifications: z.boolean().default(true),
  enableWhatsAppNotifications: z.boolean().default(false),
  defaultNotificationTime: z.coerce.number().min(0, "Il tempo di notifica non può essere negativo"),
  
  // Date e orari
  dateFormat: z.string().min(1, "Il formato data è richiesto"),
  timeFormat: z.string().min(1, "Il formato ora è richiesto"),
  timezone: z.string().min(1, "Il fuso orario è richiesto"),
  weekStartsOn: z.string().min(1, "Il giorno di inizio settimana è richiesto"),
  
  // Sicurezza
  sessionTimeout: z.coerce.number().min(5, "Il timeout deve essere almeno 5 minuti"),
  passwordMinLength: z.coerce.number().min(6, "La lunghezza minima deve essere almeno 6 caratteri"),
  passwordRequireNumbers: z.boolean().default(true),
  passwordRequireSpecialChars: z.boolean().default(true),
  
  // Altri
  defaultPageSize: z.coerce.number().min(5, "La dimensione pagina deve essere almeno 5"),
  maxUploadFileSize: z.coerce.number().min(1, "La dimensione massima deve essere almeno 1MB"),
  allowedFileTypes: z.string(),
});

type FormValues = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettingsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Valori predefiniti
  const defaultSettings: FormValues = {
    appName: "Project Management",
    defaultLanguage: "it",
    enableEmailNotifications: true,
    enableWhatsAppNotifications: false,
    defaultNotificationTime: 24,
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    timezone: "Europe/Rome",
    weekStartsOn: "monday",
    sessionTimeout: 60,
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    defaultPageSize: 10,
    maxUploadFileSize: 10,
    allowedFileTypes: "jpg,jpeg,png,pdf,doc,docx,xls,xlsx",
  };

  // Definiamo il form con React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaultSettings,
  });

  // Query per ottenere le impostazioni generali
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings/general"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/settings/general");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        return data || defaultSettings;
      } catch (error) {
        console.error("Errore nel caricamento delle impostazioni:", error);
        return defaultSettings;
      }
    },
  });

  // Aggiorniamo i valori del form quando arrivano i dati
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);
  
  // Mutation per aggiornare le impostazioni
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch("/api/admin/settings/general", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save settings");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/general"] });
      toast({
        title: t("admin.general.settingsSaved"),
        description: t("admin.general.settingsSavedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("admin.general.errorSavingSettings")}: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Gestione del submit del form
  const onSubmit = (data: FormValues) => {
    updateMutation.mutate(data);
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
            {t('admin.general.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.general.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="app" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="app">{t('admin.general.tabs.app')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('admin.general.tabs.notifications')}</TabsTrigger>
              <TabsTrigger value="datetime">{t('admin.general.tabs.datetime')}</TabsTrigger>
              <TabsTrigger value="security">{t('admin.general.tabs.security')}</TabsTrigger>
              <TabsTrigger value="other">{t('admin.general.tabs.other')}</TabsTrigger>
            </TabsList>
            
            {/* Scheda Applicazione */}
            <TabsContent value="app">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.general.tabs.app')}</CardTitle>
                  <CardDescription>
                    {t('admin.general.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.appName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('admin.general.form.appNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Il nome visualizzato nell'interfaccia e nei titoli delle pagine
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="defaultLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.defaultLanguage')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin.general.form.defaultLanguagePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="it">Italiano</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          La lingua predefinita per nuovi utenti
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Scheda Notifiche */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.general.tabs.notifications')}</CardTitle>
                  <CardDescription>
                    Configura come funzionano le notifiche nel sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('admin.general.form.enableEmailNotifications')}</FormLabel>
                          <FormDescription>
                            {t('admin.general.form.enableEmailNotificationsDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enableWhatsAppNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('admin.general.form.enableWhatsAppNotifications')}</FormLabel>
                          <FormDescription>
                            {t('admin.general.form.enableWhatsAppNotificationsDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="defaultNotificationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.defaultNotificationTime')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('admin.general.form.defaultNotificationTimePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Quanto tempo prima inviare le notifiche di appuntamenti
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Scheda Data e Ora */}
            <TabsContent value="datetime">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.general.tabs.datetime')}</CardTitle>
                  <CardDescription>
                    Configura come vengono visualizzate date e orari
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.dateFormat')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin.general.form.dateFormatPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Come visualizzare le date nell'applicazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timeFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.timeFormat')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin.general.form.timeFormatPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="24h">24 ore (14:30)</SelectItem>
                            <SelectItem value="12h">12 ore (2:30 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Come visualizzare gli orari nell'applicazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.timezone')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin.general.form.timezonePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Europe/Rome">Europe/Rome (UTC+1/+2)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (UTC+0/+1)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (UTC-5/-4)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Il fuso orario predefinito per l'applicazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="weekStartsOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.weekStartsOn')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona giorno" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monday">Lunedì</SelectItem>
                            <SelectItem value="sunday">Domenica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Il giorno con cui inizia la settimana nel calendario
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Scheda Sicurezza */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.general.tabs.security')}</CardTitle>
                  <CardDescription>
                    Configura le opzioni relative alla sicurezza
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sessionTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.sessionTimeout')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('admin.general.form.sessionTimeoutPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Dopo quanto tempo di inattività la sessione viene chiusa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passwordMinLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.passwordMinLength')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('admin.general.form.passwordMinLengthPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Il numero minimo di caratteri richiesti per le password
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passwordRequireNumbers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('admin.general.form.passwordRequireNumbers')}</FormLabel>
                          <FormDescription>
                            {t('admin.general.form.passwordRequireNumbersDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passwordRequireSpecialChars"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('admin.general.form.passwordRequireSpecialChars')}</FormLabel>
                          <FormDescription>
                            {t('admin.general.form.passwordRequireSpecialCharsDescription')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Scheda Altre Impostazioni */}
            <TabsContent value="other">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.general.tabs.other')}</CardTitle>
                  <CardDescription>
                    Impostazioni varie per l'applicazione
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="defaultPageSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.defaultPageSize')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('admin.general.form.defaultPageSizePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Numero di elementi visualizzati in ogni pagina delle tabelle
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxUploadFileSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.maxUploadFileSize')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('admin.general.form.maxUploadFileSizePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          La dimensione massima dei file che possono essere caricati
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="allowedFileTypes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.general.form.allowedFileTypes')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('admin.general.form.allowedFileTypesPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          Estensioni dei file permessi, separati da virgole (es. jpg,png,pdf)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              className="flex items-center gap-2"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t('admin.general.form.save') : t('admin.general.form.save')}
              {!updateMutation.isPending && <Save size={16} />}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}