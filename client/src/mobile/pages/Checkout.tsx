import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Separator } from "../../components/ui/separator";
import { Check, CreditCard, ArrowLeft, ArrowRight, Loader2, Landmark } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { mobileApiCall } from "../utils/mobileApi";
import StripePaymentForm from "../../components/StripePaymentForm";

// Use the centralized mobile API utility
const apiCall = mobileApiCall;

// Schema di validazione per i dati di pagamento
const paymentSchema = z.object({
  fullName: z.string().min(3, { message: "Nome completo richiesto" }),
  email: z.string().email({ message: "Email non valida" }),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  paymentMethod: z.enum(["credit_card", "paypal", "bank_transfer"], {
    required_error: "Seleziona un metodo di pagamento",
  }).optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function MobileCheckout() {
  const [location, setLocation] = useLocation();
  const { user } = useMobileAuth();
  const { toast } = useToast();
  const [planId, setPlanId] = useState<number | null>(null);
  const [billingType, setBillingType] = useState<string>("monthly");
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Estrai i parametri dall'URL
  useEffect(() => {
    console.log('Current location:', location);
    
    // Il percorso dovrebbe essere /mobile/checkout/:planId/:billingType
    const pathParts = location.split('/');
    console.log('Path parts:', pathParts);
    
    // Ottieni gli ID e il tipo di fatturazione dal percorso
    // L'URL dovrebbe essere tipo /mobile/checkout/2/monthly
    if (pathParts.length >= 5) {
      // L'URL è /mobile/checkout/:planId/:billingType
      const planIdParam = pathParts[3];
      const billingTypeParam = pathParts[4];
      
      console.log('planId from path:', planIdParam);
      console.log('billingType from path:', billingTypeParam);
      
      if (planIdParam && !isNaN(Number(planIdParam))) {
        setPlanId(Number(planIdParam));
      } else {
        // Reindirizza alla pagina dei piani se manca il parametro
        toast({
          title: "Errore",
          description: "Piano non specificato",
          variant: "destructive",
        });
        setLocation("/mobile/subscription-plans");
        return;
      }
      
      if (billingTypeParam && (billingTypeParam === "monthly" || billingTypeParam === "yearly")) {
        setBillingType(billingTypeParam);
      } else {
        // Default a mensile se non specificato
        setBillingType("monthly");
      }
    } else {
      // Vecchio metodo con query parameters per retrocompatibilità
      if (location.includes('?')) {
        const params = new URLSearchParams(location.split("?")[1]);
        const planIdParam = params.get("planId");
        const billingTypeParam = params.get("billingType");
        
        if (planIdParam) {
          setPlanId(Number(planIdParam));
        } else {
          toast({
            title: "Errore",
            description: "Piano non specificato",
            variant: "destructive",
          });
          setLocation("/mobile/subscription-plans");
          return;
        }
        
        if (billingTypeParam) {
          setBillingType(billingTypeParam);
        }
      } else {
        toast({
          title: "Errore",
          description: "Informazioni mancanti nell'URL",
          variant: "destructive",
        });
        setLocation("/mobile/subscription-plans");
      }
    }
  }, [location, setLocation, toast]);

  // Carica i dettagli del piano
  useEffect(() => {
    async function loadPlanDetails() {
      if (!planId) return;

      try {
        setLoading(true);
        const response = await apiCall("GET", `/api/mobile/subscription-plans/${planId}`);
        if (response.ok) {
          const data = await response.json();
          setPlanDetails(data);
        } else {
          console.error("Errore nel caricamento del piano:", await response.text());
          toast({
            title: "Errore",
            description: "Impossibile caricare i dettagli del piano",
            variant: "destructive",
          });
          setLocation("/mobile/subscription-plans");
        }
      } catch (error) {
        console.error("Errore:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un problema durante il caricamento del piano",
          variant: "destructive",
        });
        setLocation("/mobile/subscription-plans");
      } finally {
        setLoading(false);
      }
    }

    loadPlanDetails();
  }, [planId, setLocation, toast]);

  // Configura il form con i dati dell'utente
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      companyName: "",
      vatNumber: "",
      paymentMethod: "credit_card",
      bankName: "",
      iban: "",
      swift: "",
    },
  });

  // Aggiorna il form quando i dati dell'utente diventano disponibili
  useEffect(() => {
    console.log("Checkout: User data available:", user);
    if (user) {
      console.log("Checkout: Setting form values:", {
        fullName: user.fullName,
        email: user.email
      });
      form.setValue("fullName", user.fullName || "");
      form.setValue("email", user.email || "");
    }
  }, [user, form]);

  // Cambia i campi visualizzati in base al metodo di pagamento
  const watchPaymentMethod = form.watch("paymentMethod");


  // Handle Stripe payment success
  const handleStripePaymentSuccess = async (paymentIntent: any) => {
    console.log('handleStripePaymentSuccess called with:', paymentIntent);
    try {
      setProcessingPayment(true);

      // Create subscription with successful payment
      console.log('Creating subscription with payment intent:', paymentIntent.id);
      const response = await apiCall("POST", "/api/mobile/subscriptions", {
        planId,
        billingFrequency: billingType,
        paymentMethod: "credit_card",
        paymentIntentId: paymentIntent.id
      });

      console.log('Subscription response:', response.status, response.ok);

      if (response.ok) {
        console.log('Subscription created successfully, redirecting to dashboard');
        toast({
          title: "🎉 Pagamento Completato!",
          description: "Abbonamento attivato con successo!",
          variant: "default",
        });
        
        // Add a small delay to show the success message
        setTimeout(() => {
          setLocation("/mobile/dashboard");
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error('Subscription creation failed:', errorData);
        throw new Error(errorData.error || "Errore durante l'elaborazione del pagamento");
      }
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "❌ Errore di Pagamento",
        description: error instanceof Error ? error.message : "Si è verificato un problema durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle Stripe payment error
  const handleStripePaymentError = (error: string) => {
    toast({
      title: "Errore di pagamento",
      description: error,
      variant: "destructive",
    });
    setProcessingPayment(false);
  };

  // Gestisce l'invio del form
  const onSubmit = async (data: PaymentFormValues) => {
    if (!planId) {
      toast({
        title: "Errore",
        description: "Piano non specificato",
        variant: "destructive",
      });
      return;
    }

    // Validazione pagamento solo per piani a pagamento
    if (!isFreePlan) {
      if (!data.paymentMethod) {
        toast({
          title: "Errore",
          description: "Seleziona un metodo di pagamento",
          variant: "destructive",
        });
        return;
      }

      // For credit card payments, we use Stripe Elements - don't submit the form
      if (data.paymentMethod === "credit_card") {
        toast({
          title: "Usa il form di pagamento",
          description: "Completa il pagamento usando il form sicuro di Stripe qui sotto",
          variant: "default",
        });
        return;
      }
    }

    try {
      setProcessingPayment(true);
      
      // Logica diversa in base al metodo di pagamento
      if (data.paymentMethod === "paypal") {
        // Per PayPal, iniziamo il processo di redirect
        toast({
          title: "Reindirizzamento a PayPal",
          description: "Sarai reindirizzato a PayPal per completare il pagamento...",
        });
        
        // Simuliamo un ritardo per il reindirizzamento
        setTimeout(() => {
          // In un'implementazione reale, qui faremmo una chiamata API per
          // ottenere un URL di PayPal e reindirizzare l'utente
          window.location.href = "https://www.paypal.com";
        }, 1500);
        
        return;
      }
      
      // Invia la richiesta di abbonamento all'API (solo per bank_transfer e free plans)
      const response = await apiCall("POST", "/api/mobile/subscriptions", {
        planId,
        billingFrequency: billingType,
        paymentMethod: isFreePlan ? null : data.paymentMethod,
        paymentInfo: isFreePlan ? null : data
      });
      
      if (response.ok) {
        // Gestione diversa in base al tipo di piano
        if (isFreePlan) {
          toast({
            title: "Successo",
            description: "Piano gratuito attivato con successo!",
            variant: "default",
          });
        } else if (data.paymentMethod === "bank_transfer") {
          toast({
            title: "Abbonamento in attesa",
            description: "I dettagli del bonifico sono stati inviati via email. Il tuo abbonamento sarà attivato dopo la verifica del pagamento.",
            duration: 5000,
          });
        } else {
          toast({
            title: "Successo",
            description: "Abbonamento attivato con successo!",
            variant: "default",
          });
        }
        
        setLocation("/mobile/dashboard");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'elaborazione del pagamento");
      }
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un problema durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Calcola il prezzo del piano in base al tipo di fatturazione
  const getPlanPrice = () => {
    if (!planDetails) return "0.00";
    return billingType === "monthly" 
      ? parseFloat(planDetails.monthlyPrice).toFixed(2)
      : parseFloat(planDetails.yearlyPrice).toFixed(2);
  };

  // Verifica se il piano è gratuito
  const isFreePlan = planDetails?.isFree || parseFloat(planDetails?.monthlyPrice || "0") === 0;


  return (
    <MobileLayout hideBottomNav title="Checkout">
      <div className="container px-4 py-6 mb-16">
        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Button
                variant="ghost"
                className="flex items-center mb-4"
                onClick={() => setLocation("/mobile/subscription-plans")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna ai piani
              </Button>
              
              <h1 className="text-2xl font-bold mb-2">Completa l'acquisto</h1>
              
              {planDetails && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Riepilogo dell'ordine</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{planDetails.name}</p>
                        <p className="text-sm text-gray-500">
                          {billingType === "monthly" ? "Abbonamento mensile" : "Abbonamento annuale"}
                        </p>
                      </div>
                      <p className="text-xl font-bold">€{getPlanPrice()}</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <p className="font-medium">IVA (22%)</p>
                      <p className="font-medium">€{(parseFloat(getPlanPrice()) * 0.22).toFixed(2)}</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <p className="font-bold">Totale</p>
                      <p className="text-xl font-bold">€{(parseFloat(getPlanPrice()) * 1.22).toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Dati personali</h2>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Azienda (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome azienda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partita IVA (opzionale)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {!isFreePlan && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">Metodo di pagamento</h2>
                  
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seleziona un metodo di pagamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona metodo di pagamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="credit_card">Carta di credito</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="bank_transfer">Bonifico bancario</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchPaymentMethod === "credit_card" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium">Pagamento sicuro con Stripe</h3>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                          💡 <strong>Usa il form di pagamento</strong><br/>
                          Completa il pagamento usando il form sicuro di Stripe qui sotto
                        </p>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            console.log('🧪 Testing subscription API directly...');
                            handleStripePaymentSuccess({ id: 'pi_3SLoTD0tBEbSl2OO1uTrh1Zw', status: 'succeeded' });
                          }}
                        >
                          🧪 Test Subscription API
                        </Button>
                      </div>
                      
                      <StripePaymentForm
                        amount={parseFloat(getPlanPrice())}
                        currency="eur"
                        onSuccess={handleStripePaymentSuccess}
                        onError={handleStripePaymentError}
                        disabled={processingPayment}
                      />
                    </div>
                  )}
                  
                  {watchPaymentMethod === "bank_transfer" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Landmark className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium">Dati bonifico bancario</h3>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome banca</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome della tua banca" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="iban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input placeholder="IT60X0542811101000000123456" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="swift"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SWIFT/BIC</FormLabel>
                            <FormControl>
                              <Input placeholder="UNCRITMMXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {watchPaymentMethod === "paypal" && (
                    <div className="p-4 border rounded-lg bg-slate-50">
                      <p className="text-center mb-4">
                        Verrai reindirizzato al sito di PayPal per completare il pagamento.
                      </p>
                      <div className="flex justify-center">
                        <img 
                          src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" 
                          alt="PayPal" 
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}
                    </div>
                  </>
                )}
                
                {isFreePlan && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">Piano Gratuito</p>
                            <p className="text-sm text-green-700 mt-1">
                              Questo piano è completamente gratuito. Non sono richiesti dati di pagamento.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Only show main form button for non-credit card payments */}
                {watchPaymentMethod !== "credit_card" && (
                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Elaborazione in corso...
                        </>
                      ) : (
                        <>
                          {isFreePlan ? "Attiva Piano Gratuito" : "Completa pagamento"} <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </>
        )}
      </div>
    </MobileLayout>
  );
}