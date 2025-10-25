import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type ActivationStatus = 'pending' | 'success' | 'error';

// Schema di validazione
const activationSchema = z.object({
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .max(100, 'La password è troppo lunga'),
  confirmPassword: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Le password non corrispondono',
  path: ['confirmPassword'],
});

type ActivationFormValues = z.infer<typeof activationSchema>;

export default function ActivatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [activationStatus, setActivationStatus] = useState<ActivationStatus>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Ottieni il token dall'URL
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setActivationStatus('error');
      setErrorMessage('Token di attivazione mancante. Verifica di aver usato il link corretto.');
    }
  }, []);

  const form = useForm<ActivationFormValues>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ActivationFormValues) => {
    if (!token) {
      setErrorMessage('Token di attivazione mancante.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/collaborators/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setActivationStatus('success');
        toast({
          title: 'Account attivato',
          description: 'Il tuo account è stato attivato con successo.',
        });
      } else {
        setActivationStatus('error');
        setErrorMessage(data.message || 'Si è verificato un errore durante l\'attivazione dell\'account.');
        toast({
          title: 'Errore',
          description: data.message || 'Si è verificato un errore durante l\'attivazione dell\'account.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setActivationStatus('error');
      setErrorMessage('Si è verificato un errore di connessione. Riprova più tardi.');
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore di connessione. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Attivazione Account</CardTitle>
            <CardDescription className="text-center">
              Attiva il tuo account creando una password
            </CardDescription>
          </CardHeader>

          <CardContent>
            {activationStatus === 'pending' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nuova Password</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Inserisci la tua password" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Minimo 8 caratteri
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
                          <Input 
                            placeholder="Conferma la tua password" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Attivazione in corso...
                      </>
                    ) : (
                      'Attiva Account'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {activationStatus === 'success' && (
              <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                <AlertTitle>Account attivato con successo!</AlertTitle>
                <AlertDescription>
                  <p className="mb-4">Ora puoi accedere all'applicazione con le tue credenziali.</p>
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Vai alla pagina di login
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {activationStatus === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>Attivazione fallita</AlertTitle>
                <AlertDescription>
                  <p className="mb-4">{errorMessage || 'Si è verificato un errore durante l\'attivazione dell\'account.'}</p>
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="w-full"
                  >
                    Torna alla pagina principale
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <p className="text-sm text-center text-gray-500">
              Per assistenza contatta l'amministratore del sistema
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}