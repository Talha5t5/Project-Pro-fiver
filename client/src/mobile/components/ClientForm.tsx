import { useState, useEffect } from 'react';
import { useParams, useLocation } from "wouter";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../contexts/PermissionContext';
import { mobileApiCall } from '../utils/mobileApi';

import MobileLayout from './MobileLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft } from "lucide-react";

const clientSchema = z.object({
  name: z.string().min(1, 'Il nome è richiesto'),
  type: z.enum(['residential', 'commercial', 'industrial'], {
    required_error: 'Il tipo di cliente è richiesto'
  }),
  phone: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  address: z.string().optional(),
  geoLocation: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const clientId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!clientId && clientId > 0;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      type: 'residential',
      address: '',
      phone: '',
      email: '',
      geoLocation: '',
      notes: '',
    }
  });

  // Fetch client data if in edit mode
  const { data: clientData, isLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: async () => {
      if (!clientId) return undefined;
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Errore nel recuperare i dati del cliente");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  // Update form when client data is loaded
  useEffect(() => {
    if (clientData && isEditMode) {
      form.reset(clientData);
    }
  }, [clientData, isEditMode, form]);

  // Mutation for creating a new client
  const createClient = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      setIsSaving(true);
      const response = await mobileApiCall('POST', '/clients', values);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante la creazione del cliente");
      }
      
      return response.json();
    }
  });

  // Handle create success
  useEffect(() => {
    if (createClient.isSuccess) {
      setIsSaving(false);
      toast({
        title: "Cliente creato",
        description: "Il nuovo cliente è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-clients'] });
      setLocation("/mobile/settings/clients");
    }
  }, [createClient.isSuccess, toast, queryClient, setLocation]);

  // Handle create error
  useEffect(() => {
    if (createClient.isError) {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: createClient.error?.message || "Si è verificato un errore durante la creazione del cliente",
        variant: "destructive"
      });
    }
  }, [createClient.isError, createClient.error, toast]);

  // Mutation for updating an existing client
  const updateClient = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (!clientId) throw new Error("ID cliente mancante");
      setIsSaving(true);
      
      const response = await mobileApiCall('PUT', `/clients/${clientId}`, values);
      
      if (!response.ok) {
        // Try to parse JSON, but guard HTML/empty responses
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || "Errore durante l'aggiornamento del cliente");
        } catch {
          throw new Error("Errore durante l'aggiornamento del cliente");
        }
      }

      try {
        return await response.json();
      } catch {
        return true as any;
      }
    }
  });

  // Handle update success
  useEffect(() => {
    if (updateClient.isSuccess) {
      setIsSaving(false);
      toast({
        title: "Cliente aggiornato",
        description: "Il cliente è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-clients'] });
      setLocation("/mobile/settings/clients");
    }
  }, [updateClient.isSuccess, toast, queryClient, setLocation]);

  // Handle update error
  useEffect(() => {
    if (updateClient.isError) {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: updateClient.error?.message || "Si è verificato un errore durante l'aggiornamento del cliente",
        variant: "destructive"
      });
    }
  }, [updateClient.isError, updateClient.error, toast]);

  const onSubmit = (values: ClientFormValues) => {
    if (isEditMode) {
      updateClient.mutate(values);
    } else {
      createClient.mutate(values);
    }
  };

  const handleCancel = () => {
    setLocation("/mobile/settings/clients");
  };

  return (
    <MobileLayout
      title={isEditMode ? t("mobile.forms.client.editTitle") : t("mobile.forms.client.title")}
      rightAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Name - Always visible */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mobile.forms.client.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("mobile.forms.client.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Type - Check permission */}
            {hasPermission('canViewClientType') && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.client.type")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mobile.forms.client.typePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">{t("mobile.forms.client.typeOptions.residential")}</SelectItem>
                        <SelectItem value="commercial">{t("mobile.forms.client.typeOptions.commercial")}</SelectItem>
                        <SelectItem value="industrial">{t("mobile.forms.client.typeOptions.industrial")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Address - Check permission */}
            {hasPermission('canViewClientAddress') && (
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.client.address")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("mobile.forms.client.addressPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Phone - Check permission */}
              {hasPermission('canViewClientPhone') && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mobile.forms.client.phone")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("mobile.forms.client.phonePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Email - Check permission */}
              {hasPermission('canViewClientEmail') && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mobile.forms.client.email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("mobile.forms.client.emailPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Geographic Location - Check permission */}
            {hasPermission('canViewClientGeoLocation') && (
              <FormField
                control={form.control}
                name="geoLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.client.geoLocation")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder={t("mobile.forms.client.geoLocationPlaceholder")} {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const lat = position.coords.latitude;
                                const lng = position.coords.longitude;
                                field.onChange(`${lat},${lng}`);
                                toast({
                                  title: t("mobile.forms.client.locationSuccess"),
                                  description: `Coordinate: ${lat}, ${lng}`,
                                });
                              },
                              (error) => {
                                toast({
                                  title: "Errore",
                                  description: t("mobile.forms.client.locationError"),
                                  variant: "destructive"
                                });
                                console.error("Geolocation error:", error);
                              }
                            );
                          } else {
                            toast({
                              title: "Errore",
                              description: t("mobile.forms.client.geolocationNotSupported"),
                              variant: "destructive"
                            });
                          }
                        }}
                        className="shrink-0"
                      >
                        <span className="material-icons text-sm">📍</span>
                      </Button>
                    </div>
                    <FormDescription>
                      {t("mobile.forms.client.geoLocationDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Notes - Check permission */}
            {hasPermission('canViewClientNotes') && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mobile.forms.client.notes")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("mobile.forms.client.notesPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
              >
                {t("mobile.forms.client.cancelButton")}
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || isLoading}
              >
                {isSaving ? t("mobile.forms.client.savingButton") : isEditMode ? t("mobile.forms.client.updateButton") : t("mobile.forms.client.saveButton")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MobileLayout>
  );
}