import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "../../../hooks/use-toast";
import { apiRequest } from "../../../lib/queryClient";

import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Separator } from "../../../components/ui/separator";

// Schema di validazione
const formSchema = z.object({
  username: z.string().min(3, "Username deve contenere almeno 3 caratteri"),
  fullName: z.string().min(2, "Nome completo richiesto"),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  email: z.string().email("Inserisci un'email valida").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      email: "",
      phone: "",
    },
  });
  
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const res = await apiRequest("POST", "/api/administrators", data);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante la creazione dell'amministratore");
      }
      
      toast({
        title: "Amministratore creato con successo",
        description: "Il nuovo amministratore è stato aggiunto al sistema",
      });
      
      // Redirect alla dashboard
      setLocation("/admin/dashboard");
      
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante la creazione dell'amministratore",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/dashboard")}
          className="mr-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>
        <h1 className="text-3xl font-bold">Nuovo Amministratore</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Amministratore</CardTitle>
          <CardDescription>
            Compila il form per creare un nuovo account amministratore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="username" />
                      </FormControl>
                      <FormDescription>
                        Nome utente per l'accesso al sistema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="••••••" />
                      </FormControl>
                      <FormDescription>
                        Minimo 6 caratteri
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mario Rossi" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="esempio@dominio.it" />
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
                      <FormLabel>Numero di telefono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39 123 456 7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-6" />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>Creazione in corso...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Crea Amministratore
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}