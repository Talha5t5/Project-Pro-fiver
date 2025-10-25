import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Loader2 } from "lucide-react";
import { useMobileAuth } from "../contexts/MobileAuthContext";

// Schema di validazione
const activateSchema = z.object({
  fullName: z.string().min(3, { message: "Il nome completo deve avere almeno 3 caratteri" }),
  password: z.string().min(8, { message: "La password deve avere almeno 8 caratteri" }),
  confirmPassword: z.string().min(8)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

// Tipo dai valori del form
type ActivateFormValues = z.infer<typeof activateSchema>;

export default function MobileActivate() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { activate, isLoading } = useMobileAuth();
  const [error, setError] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string>(params.code || "");
  const [isNewActivation, setIsNewActivation] = useState<boolean>(params.code === 'new');

  // React hook form
  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Submit del form
  const onSubmit = async (data: ActivateFormValues) => {
    if (isNewActivation && !activationCode) {
      setError("Inserisci un codice di attivazione valido");
      return;
    }

    try {
      setError(null);
      await activate(activationCode, data.password, data.fullName);
      // Reindirizza alla dashboard dopo l'attivazione
      setLocation("/mobile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'attivazione dell'account");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Attiva il tuo account</CardTitle>
          <CardDescription>
            {isNewActivation 
              ? "Inserisci il codice di attivazione e crea le tue credenziali" 
              : "Crea le tue credenziali per accedere al sistema"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isNewActivation && (
                <FormItem>
                  <FormLabel>Codice di attivazione</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Il tuo codice di attivazione" 
                      value={activationCode} 
                      onChange={(e) => setActivationCode(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              )}
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome e Cognome</FormLabel>
                    <FormControl>
                      <Input placeholder="Il tuo nome completo" {...field} />
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
                      <Input type="password" placeholder="La tua password" {...field} />
                    </FormControl>
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
                      <Input type="password" placeholder="Conferma la tua password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <div className="p-3 rounded-md bg-red-600/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Attivazione in corso...
                  </>
                ) : (
                  "Attiva account"
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500 text-center">
              Hai già un account? 
              <Button 
                variant="link" 
                className="p-0 h-auto ml-1"
                onClick={() => setLocation("/mobile/login")}
              >
                Accedi
              </Button>
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center flex-col space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation("/mobile/welcome")}
          >
            Torna alla pagina iniziale
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}