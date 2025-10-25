import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { mobileGet, mobilePatch } from "../utils/mobileApi";
import { Button } from "../../components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../../components/ui/form";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Bell, Mail, MessageCircle, Settings, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

// Schema for notification settings
const notificationSettingsSchema = z.object({
  // Global notification settings
  globalEmailNotifications: z.boolean().default(true),
  globalWhatsAppNotifications: z.boolean().default(false),
  globalPushNotifications: z.boolean().default(true),
  
  // Activity-specific settings
  activityNotifications: z.array(z.object({
    activityId: z.number(),
    activityName: z.string(),
    notifyOnCreate: z.boolean().default(true),
    notifyOnUpdate: z.boolean().default(true),
    notifyOnComplete: z.boolean().default(true),
    notifyOnAssign: z.boolean().default(true),
    emailEnabled: z.boolean().default(true),
    whatsappEnabled: z.boolean().default(false),
    pushEnabled: z.boolean().default(true),
  })).default([]),
  
  // Collaborator creation notifications
  collaboratorCreationNotifications: z.object({
    notifyOnCreate: z.boolean().default(true),
    notifyOnUpdate: z.boolean().default(true),
    notifyOnDelete: z.boolean().default(false),
    emailEnabled: z.boolean().default(true),
    whatsappEnabled: z.boolean().default(false),
    pushEnabled: z.boolean().default(true),
  }).default({
    notifyOnCreate: true,
    notifyOnUpdate: true,
    notifyOnDelete: false,
    emailEnabled: true,
    whatsappEnabled: false,
    pushEnabled: true,
  }),
  
  // Notification timing
  notificationTiming: z.object({
    immediate: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
    weeklyDigest: z.boolean().default(false),
    digestTime: z.string().default("09:00"),
  }).default({
    immediate: true,
    dailyDigest: false,
    weeklyDigest: false,
    digestTime: "09:00",
  }),
});

type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;

interface NotificationSettingsProps {
  onSave?: () => void;
}

export default function NotificationSettings({ onSave }: NotificationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      globalEmailNotifications: true,
      globalWhatsAppNotifications: false,
      globalPushNotifications: true,
      activityNotifications: [],
      collaboratorCreationNotifications: {
        notifyOnCreate: true,
        notifyOnUpdate: true,
        notifyOnDelete: false,
        emailEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
      },
      notificationTiming: {
        immediate: true,
        dailyDigest: false,
        weeklyDigest: false,
        digestTime: "09:00",
      },
    }
  });

  // Load activities for activity-specific settings
  const { data: activities = [] } = useQuery({
    queryKey: ['/api/mobile/activities'],
    queryFn: async () => {
      const response = await mobileGet('/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    }
  });

  // Load saved notification settings
  const { data: savedSettings } = useQuery({
    queryKey: ['/api/mobile/notification-preferences'],
    queryFn: async () => {
      const response = await mobileGet('/notification-preferences');
      if (!response.ok) {
        // Return default settings if not found
        return null;
      }
      return response.json();
    }
  });

  // Initialize form with saved settings
  useEffect(() => {
    if (savedSettings) {
      form.reset(savedSettings);
    } else if (activities.length > 0) {
      // Initialize with default activity settings
      const defaultActivityNotifications = activities.map((activity: any) => ({
        activityId: activity.id,
        activityName: activity.name,
        notifyOnCreate: true,
        notifyOnUpdate: true,
        notifyOnComplete: true,
        notifyOnAssign: true,
        emailEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
      }));
      form.setValue('activityNotifications', defaultActivityNotifications);
    }
  }, [savedSettings, activities, form]);

  // Save notification settings
  const saveMutation = useMutation({
    mutationFn: async (values: NotificationSettingsValues) => {
      const response = await mobilePatch('/notification-preferences', values);
      
      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni di notifica sono state salvate con successo.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/notification-preferences'] });
      onSave?.();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nel salvare le impostazioni di notifica.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: NotificationSettingsValues) => {
    saveMutation.mutate(values);
  };

  const updateActivityNotification = (activityId: number, field: string, value: boolean) => {
    const currentNotifications = form.getValues('activityNotifications');
    const updatedNotifications = currentNotifications.map(notification => 
      notification.activityId === activityId 
        ? { ...notification, [field]: value }
        : notification
    );
    form.setValue('activityNotifications', updatedNotifications);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Global Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Impostazioni Globali
              </CardTitle>
              <CardDescription>
                Configura le notifiche generali per tutte le attività
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="globalEmailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Notifiche Email
                      </FormLabel>
                      <FormDescription>
                        Ricevi notifiche via email
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
                name="globalWhatsAppNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Notifiche WhatsApp
                      </FormLabel>
                      <FormDescription>
                        Ricevi notifiche via WhatsApp
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
                name="globalPushNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifiche Push
                      </FormLabel>
                      <FormDescription>
                        Ricevi notifiche push sull'app
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
            </CardContent>
          </Card>

          {/* Activity-Specific Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Notifiche per Attività
              </CardTitle>
              <CardDescription>
                Configura le notifiche per ogni tipo di attività
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((activity: any) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{activity.name}</h4>
                    <Badge variant="outline">{activity.jobType?.name || 'Generale'}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Eventi</label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Creazione</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.notifyOnCreate`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'notifyOnCreate', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Aggiornamento</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.notifyOnUpdate`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'notifyOnUpdate', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Completamento</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.notifyOnComplete`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'notifyOnComplete', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Assegnazione</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.notifyOnAssign`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'notifyOnAssign', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Metodi</label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Email</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.emailEnabled`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'emailEnabled', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">WhatsApp</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.whatsappEnabled`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'whatsappEnabled', checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Push</span>
                          <Switch
                            checked={form.watch(`activityNotifications.${activities.indexOf(activity)}.pushEnabled`) || false}
                            onCheckedChange={(checked) => 
                              updateActivityNotification(activity.id, 'pushEnabled', checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Collaborator Creation Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notifiche Collaboratori
              </CardTitle>
              <CardDescription>
                Configura le notifiche per la gestione dei collaboratori
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Eventi</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Creazione</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.notifyOnCreate')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.notifyOnCreate', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Aggiornamento</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.notifyOnUpdate')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.notifyOnUpdate', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Eliminazione</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.notifyOnDelete')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.notifyOnDelete', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Metodi</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.emailEnabled')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.emailEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">WhatsApp</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.whatsappEnabled')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.whatsappEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Push</span>
                      <Switch
                        checked={form.watch('collaboratorCreationNotifications.pushEnabled')}
                        onCheckedChange={(checked) => 
                          form.setValue('collaboratorCreationNotifications.pushEnabled', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Orari di Notifica</CardTitle>
              <CardDescription>
                Configura quando ricevere le notifiche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notificationTiming.immediate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Notifiche Immediate</FormLabel>
                      <FormDescription>
                        Ricevi notifiche non appena si verificano gli eventi
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
                name="notificationTiming.dailyDigest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Digest Giornaliero</FormLabel>
                      <FormDescription>
                        Ricevi un riassunto giornaliero delle attività
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
              
              {form.watch('notificationTiming.dailyDigest') && (
                <FormField
                  control={form.control}
                  name="notificationTiming.digestTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orario Digest</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona orario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {hour}:00
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvataggio..." : "Salva Impostazioni"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
