import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useParams } from "wouter";
import { useToast } from "../../../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../../lib/queryClient";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Separator } from "../../../../components/ui/separator";
import { Skeleton } from "../../../../components/ui/skeleton";

// Schema di validazione
const passwordSchema = z.object({
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  confirmPassword: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordPageProps {
  id?: string;
}

export default function AdministratorPasswordPage(props: PasswordPageProps) {
  const params = useParams();
  const userId = props.id || params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  // Carica dati dell'utente
  const { data: user, isLoading } = useQuery({
    queryKey: [`/api/administrators/${userId}`],
    queryFn: () => apiRequest("GET", `/api/administrators/${userId}`).then(res => res.json()),
    enabled: !!userId,
  });
  
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  // Mutation per cambiare la password
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await apiRequest("PATCH", `/api/administrators/${userId}/password`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'aggiornamento della password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password aggiornata",
        description: "La password è stata modificata con successo",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/administrators/${userId}`] });
      
      // Redirect alla dashboard
      setLocation("/admin/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento della password",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (data: PasswordFormValues) => {
    setIsSubmitting(true);
    
    try {
      await updatePasswordMutation.mutateAsync({ password: data.password });
    } catch (error) {
      console.error("Errore:", error);
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
        <h1 className="text-3xl font-bold">Modifica Password</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              `Modifica Password: ${user?.fullName || 'Utente'}`
            )}
          </CardTitle>
          <CardDescription>
            Inserisci una nuova password per l'account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuova Password</FormLabel>
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} placeholder="••••••" />
                    </FormControl>
                    <FormDescription>
                      Ripeti la nuova password
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator className="my-6" />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>Aggiornamento in corso...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Aggiorna Password
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