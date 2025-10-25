import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

import { Button } from "../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

// Schema di validazione
const forgotPasswordSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Simula invio email di recupero
      // In un'implementazione reale, questo sarebbe un endpoint API
      // const res = await apiRequest("POST", "/api/forgot-password", data);
      
      // Simula successo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmailSent(true);
      
      toast({
        title: "Email inviata",
        description: "Se l'email esiste, riceverai istruzioni per reimpostare la password",
      });
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/admin/login")}
              size="sm"
              className="mr-2 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Recupero Password
          </CardTitle>
          <CardDescription className="text-center">
            Inserisci la tua email per reimpostare la password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">Email inviata!</AlertTitle>
              <AlertDescription className="text-green-700">
                Abbiamo inviato le istruzioni per reimpostare la password all'indirizzo email fornito.
                Controlla la tua casella di posta (e anche la cartella spam).
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                          <Mail className="ml-2 h-5 w-5 text-gray-500" />
                          <Input
                            type="email"
                            placeholder="esempio@dominio.it"
                            className="border-0 focus-visible:ring-0"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Inserisci l'email associata al tuo account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Invio in corso..." : "Invia istruzioni di recupero"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-xs text-center text-gray-500 mt-4">
            Riceverai un'email con le istruzioni per reimpostare la tua password.
            <br />
            Se non ricevi l'email, controlla la cartella spam.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}