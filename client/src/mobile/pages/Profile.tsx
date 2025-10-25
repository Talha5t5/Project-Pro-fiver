import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import MobileLayout from "../components/MobileLayout";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { mobileApiCall } from "../utils/mobileApi";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Separator } from "../../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { User, Mail, Phone, LogOut, Save, Lock, Building } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useToast } from "../../hooks/use-toast";
import { Switch } from "../../components/ui/switch";

// Schema per la validazione dei dati del profilo
const profileSchema = z.object({
  fullName: z.string().min(1, "Il nome è obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().optional(),
  language: z.string(),
  notifyByEmail: z.boolean().optional(),
  notifyByWhatsApp: z.boolean().optional(),
  notificationTime: z.coerce.number().optional(),
});

// Schema per la modifica della password
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "La password attuale è obbligatoria"),
  newPassword: z.string().min(6, "La nuova password deve essere di almeno 6 caratteri"),
  confirmPassword: z.string().min(1, "La conferma della password è obbligatoria"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function MobileProfile() {
  const [, setLocation] = useLocation();
  const { user, logout, updateUserSettings, changePassword } = useMobileAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form del profilo
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      language: user?.language || "it",
      notifyByEmail: true,
      notifyByWhatsApp: false,
      notificationTime: 24,
    },
  });

  // Form della password
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        language: user.language || "it",
        notifyByEmail: true,
        notifyByWhatsApp: false,
        notificationTime: 24,
      });
    }
  }, [user, profileForm]);

  // Gestione dell'aggiornamento del profilo
  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      await updateUserSettings(data);
      toast({
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state aggiornate con successo",
      });
    } catch (error) {
      console.error("Errore aggiornamento profilo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Gestione della modifica della password
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsLoading(true);
    try {
      // Usa changePassword invece di updateUserSettings per cambiare la password
      await changePassword(data.currentPassword, data.newPassword);
      toast({
        title: "Password aggiornata",
        description: "La tua password è stata modificata con successo",
      });
      passwordForm.reset();
    } catch (error) {
      console.error("Errore aggiornamento password:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestione del logout
  const handleLogout = async () => {
    try {
      const response = await mobileApiCall('POST', '/api/logout');
      
      if (response.ok) {
        await logout(); // Aggiorna il contesto locale
        toast({
          title: "Logout effettuato",
          description: "Hai effettuato il logout con successo",
        });
        setLocation("/mobile/welcome");
      } else {
        throw new Error("Errore durante il logout");
      }
    } catch (error) {
      console.error("Errore logout:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il logout",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <MobileLayout title="Profilo">
        <div className="flex flex-col items-center justify-center p-4">
          <p className="mb-4 text-center">Devi effettuare l'accesso per visualizzare il profilo</p>
          <Button onClick={() => setLocation("/mobile/login")}>
            Accedi
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Determina se l'utente è un cliente o un collaboratore
  const isClient = user.type === "client";
  const isCollaborator = user.type === "collaborator";

  return (
    <MobileLayout title="Il mio profilo">
      <div className="space-y-6">
        {/* Intestazione profilo */}
        <div className="flex flex-col items-center justify-center py-4">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={null} alt={user.fullName} />
            <AvatarFallback className="text-2xl bg-blue-600 text-white">
              {user.fullName?.charAt(0) || user.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{user.fullName}</h2>
          <p className="text-gray-500">
            {isClient ? "Cliente" : isCollaborator ? "Collaboratore" : "Utente"}
          </p>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informazioni</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          
          {/* Tab Informazioni */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni personali</CardTitle>
                <CardDescription>
                  Aggiorna le tue informazioni personali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <User className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                placeholder="Nome e cognome"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <Mail className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                type="email"
                                placeholder="Email"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <Phone className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                placeholder="Numero di telefono"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                                value={field.value || ""}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lingua</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona lingua" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="it">Italiano</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-4" />
                    <h3 className="text-sm font-medium mb-2">Notifiche</h3>

                    <FormField
                      control={profileForm.control}
                      name="notifyByEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Notifiche via Email</FormLabel>
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
                      control={profileForm.control}
                      name="notifyByWhatsApp"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Notifiche via WhatsApp</FormLabel>
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
                      control={profileForm.control}
                      name="notificationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo di notifica (ore)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="24"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Ore prima dell'evento per ricevere una notifica
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Salvataggio in corso..." : "Salva modifiche"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Password */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Modifica password</CardTitle>
                <CardDescription>
                  Aggiorna la tua password di accesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password attuale</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <Lock className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                type="password"
                                placeholder="Password attuale"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nuova password</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <Lock className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                type="password"
                                placeholder="Nuova password"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conferma password</FormLabel>
                          <FormControl>
                            <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                              <Lock className="ml-2 h-5 w-5 text-gray-500" />
                              <Input
                                type="password"
                                placeholder="Conferma password"
                                className="border-0 focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Salvataggio in corso..." : "Cambia password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pulsante di logout */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>


      </div>
    </MobileLayout>
  );
}