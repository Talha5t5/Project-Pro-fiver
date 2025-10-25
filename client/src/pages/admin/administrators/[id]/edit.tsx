import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../../lib/queryClient";
import { useToast } from "../../../../hooks/use-toast";
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
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { ArrowLeft, Save, Key } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { useTranslation } from "react-i18next";

// Schema di validazione per il modulo amministratore
const adminSchema = z.object({
  username: z.string().min(1, "Username richiesto"),
  fullName: z.string().min(1, "Nome completo richiesto"),
  email: z.string().email("Email non valida").nullable().optional(),
  phone: z.string().nullable().optional(),
  roleId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

type AdminFormValues = z.infer<typeof adminSchema>;

interface AdminEditPageProps {
  id?: string;
}

export default function AdminEditPage(props: AdminEditPageProps) {
  const params = useParams();
  const adminId = props.id || params.id;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Carica i dati dell'amministratore
  const { data: admin, isLoading: adminLoading } = useQuery({
    queryKey: [`/api/administrators/${adminId}`],
    queryFn: () => apiRequest("GET", `/api/administrators/${adminId}`).then(res => res.json()),
    enabled: !!adminId,
  });

  // Carica i ruoli disponibili
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: () => apiRequest("GET", "/api/roles").then(res => res.json()),
  });

  // Configurazione del form
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      roleId: null,
      isActive: true,
    },
  });

  // Popola il form quando i dati vengono caricati
  useEffect(() => {
    if (admin) {
      form.reset({
        username: admin.username || "",
        fullName: admin.fullName || "",
        email: admin.email || "",
        phone: admin.phone || "",
        roleId: admin.roleId,
        isActive: admin.isActive !== false,
      });
    }
  }, [admin, form]);

  // Mutation per aggiornare l'amministratore
  const updateMutation = useMutation({
    mutationFn: (data: AdminFormValues) => {
      return apiRequest("PUT", `/api/administrators/${adminId}`, data)
        .then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: t('admin.settings.adminEdit.operationCompleted'),
        description: t('admin.settings.adminEdit.adminUpdated'),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/administrators/${adminId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.adminEdit.error'),
        description: t('admin.settings.adminEdit.unableToUpdate'),
        variant: "destructive",
      });
    }
  });

  // Submit del form
  const onSubmit = (data: AdminFormValues) => {
    updateMutation.mutate(data);
  };

  const isLoading = adminLoading || rolesLoading;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/users")}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <h1 className="text-3xl font-bold">{t('admin.settings.adminEdit.title')}</h1>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.settings.adminEdit.title')}</CardTitle>
                <CardDescription>
                  {t('admin.settings.adminEdit.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.settings.adminEdit.username')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('admin.settings.adminEdit.usernamePlaceholder')} {...field} />
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
                          <FormLabel>{t('admin.settings.adminEdit.fullName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('admin.settings.adminEdit.fullNamePlaceholder')} {...field} />
                          </FormControl>
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
                            <FormLabel>{t('admin.settings.adminEdit.email')}</FormLabel>
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
                            <FormLabel>{t('admin.settings.adminEdit.phone')}</FormLabel>
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
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.settings.adminEdit.role')}</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('admin.settings.adminEdit.selectRole')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles.map((role) => (
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('admin.settings.adminEdit.userStatus')}</FormLabel>
                            <FormDescription>
                              {t('admin.settings.adminEdit.userStatusDescription')}
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
                    
                    <div className="flex justify-end gap-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setLocation(`/admin/administrators/${adminId}/password`)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {t('admin.settings.adminEdit.changePassword')}
                      </Button>
                      
                      <Button 
                        type="submit" 
                        disabled={updateMutation.isPending || !form.formState.isDirty}
                      >
                        {updateMutation.isPending ? (
                          t('admin.settings.adminEdit.saving')
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            {t('admin.settings.adminEdit.saveChanges')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {admin && (
                    <>
                      <div>
                        <h3 className="text-sm text-gray-500 font-medium">Username</h3>
                        <p className="font-medium">{admin.username}</p>
                      </div>
                      <div>
                        <h3 className="text-sm text-gray-500 font-medium">Stato</h3>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {admin.isActive !== false ? 'Attivo' : 'Disattivato'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm text-gray-500 font-medium">Ruolo</h3>
                        <p>
                          {roles.find(r => r.id === admin.roleId)?.name || 'Nessun ruolo assegnato'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}