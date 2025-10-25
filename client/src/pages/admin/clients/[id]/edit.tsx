import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

// Schema di validazione per il modulo client
const clientSchema = z.object({
  name: z.string().min(1, "Nome cliente richiesto"),
  type: z.string().refine(val => ["residential", "commercial", "industrial"].includes(val), {
    message: "Tipo cliente non valido",
  }),
  email: z.string().email("Email non valida").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  geoLocation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientEditPageProps {
  id?: string;
}

export default function ClientEditPage(props: ClientEditPageProps) {
  const params = useParams();
  const clientId = props.id || params.id;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Carica i dati del cliente
  const { data: client, isLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: () => apiRequest("GET", `/api/clients/${clientId}`).then(res => res.json()),
    enabled: !!clientId,
  });

  // Configurazione del form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      type: "residential",
      email: "",
      phone: "",
      address: "",
      geoLocation: "",
      notes: "",
    },
  });

  // Popola il form quando i dati vengono caricati
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        type: client.type || "residential",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        geoLocation: client.geoLocation || "",
        notes: client.notes || "",
      });
    }
  }, [client, form]);

  // Mutation per aggiornare il cliente
  const updateMutation = useMutation({
    mutationFn: (data: ClientFormValues) => {
      return apiRequest("PUT", `/api/clients/${clientId}`, data)
        .then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: t('admin.settings.clientEdit.operationCompleted'),
        description: t('admin.settings.clientEdit.clientUpdated'),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.clientEdit.error'),
        description: t('admin.settings.clientEdit.unableToUpdate'),
        variant: "destructive",
      });
    }
  });

  // Submit del form
  const onSubmit = (data: ClientFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/admin/clients/${clientId}`)}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <h1 className="text-3xl font-bold">{t('admin.settings.clientEdit.title')}</h1>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.settings.clientEdit.title')}</CardTitle>
            <CardDescription>
              {t('admin.settings.clientEdit.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.settings.clientEdit.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('admin.settings.clientEdit.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.settings.clientEdit.type')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.settings.clientEdit.typePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="residential">{t('admin.settings.clientEdit.residential')}</SelectItem>
                          <SelectItem value="commercial">{t('admin.settings.clientEdit.commercial')}</SelectItem>
                          <SelectItem value="industrial">{t('admin.settings.clientEdit.industrial')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.settings.clientEdit.email')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@esempio.it" 
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
                        <FormLabel>{t('admin.settings.clientEdit.phone')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+39 123 456 7890" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.settings.clientEdit.address')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Via Roma 123, Milano" 
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
                  name="geoLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.settings.clientEdit.geoLocation')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="45.4642, 9.1900" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('admin.settings.clientEdit.geoLocationPlaceholder')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.settings.clientEdit.notes')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('admin.settings.clientEdit.notesPlaceholder')} 
                          className="min-h-[100px]" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending || !form.formState.isDirty}
                  >
                    {updateMutation.isPending ? (
                      t('admin.settings.clientEdit.saving')
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t('admin.settings.clientEdit.saveChanges')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}