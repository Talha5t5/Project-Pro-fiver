import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../../hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Lock, User } from "lucide-react";

// Schema di validazione
const loginSchema = z.object({
  username: z.string().min(1, "Username obbligatorio"),
  password: z.string().min(1, "Password obbligatoria"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Inizializzazione del form
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Errore durante il login");
      }
      
      // Check user role and redirect accordingly
      const userRole = result.user?.role;
      
      if (userRole === 'superadmin') {
        toast({
          title: "Login effettuato con successo",
          description: "Benvenuto nel pannello Super Amministratore",
        });
        // Redirect to Super Admin dashboard
        setLocation("/admin/dashboard");
      } else if (userRole === 'administrator') {
        toast({
          title: "Login effettuato con successo",
          description: "Benvenuto nel pannello Artigiano",
        });
        // Redirect to Artisan dashboard
        setLocation("/admin/artisan-dashboard");
      } else {
        toast({
          title: "Login effettuato con successo",
          description: "Benvenuto nel pannello di amministrazione",
        });
        // Default redirect
        setLocation("/admin/dashboard");
      }
    } catch (error) {
      console.error("Errore login:", error);
      toast({
        title: "Errore di accesso",
        description: error instanceof Error ? error.message : "Credenziali non valide. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Accesso Amministratore
          </CardTitle>
          <CardDescription className="text-center">
            Inserisci le tue credenziali per accedere al pannello di amministrazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                        <User className="ml-2 h-5 w-5 text-gray-500" />
                        <Input
                          placeholder="admin"
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
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-blue-500">
                        <Lock className="ml-2 h-5 w-5 text-gray-500" />
                        <Input
                          type="password"
                          placeholder="******"
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
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>
              
              <div className="mt-4 text-center">
                <Button 
                  variant="link" 
                  className="text-sm p-0 h-auto"
                  onClick={() => setLocation("/admin/forgot-password")}
                >
                  Hai dimenticato la password?
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-xs text-center text-gray-500 mt-4">
            Accesso riservato agli amministratori del sistema.
            <br />
            Per assistenza contatta il supporto tecnico.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}