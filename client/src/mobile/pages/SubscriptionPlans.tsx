import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ArrowRight, Check } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { mobileApiCall } from "../utils/mobileApi";

// Use the centralized mobile API utility
const apiCall = mobileApiCall;

// Interfaccia per i piani di abbonamento
interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string | null;
  isActive: boolean | null;
  isFree: boolean | null;
}

export default function MobileSubscriptionPlans() {
  const { user } = useMobileAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Carica i piani di abbonamento
  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const response = await apiCall("GET", "/api/mobile/subscription-plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data.filter((plan: SubscriptionPlan) => plan.isActive === true));
        } else {
          console.error("Errore nel caricamento dei piani:", await response.text());
          toast({
            title: "Errore",
            description: "Impossibile caricare i piani di abbonamento",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Errore:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un problema durante il caricamento dei piani",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [toast]);

  const getFeatures = (plan: SubscriptionPlan): string[] => {
    if (!plan.features) return [];
    try {
      const parsed = JSON.parse(plan.features);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      try {
        return plan.features.split(",").map((feature) => feature.trim());
      } catch (err) {
        console.error("Errore nella conversione delle funzionalità:", err);
        return [];
      }
    }
  };

  const handlePlanSelect = (planId: number) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({
        title: "Seleziona un piano",
        description: "Per favore seleziona un piano prima di procedere",
        variant: "default",
      });
      return;
    }

    try {
      setSubscriptionLoading(true);
      
      // Log per debug
      console.log(`Reindirizzamento al checkout: /checkout/${selectedPlan}/${billingType}`);
      
      // Prima verifichiamo se il piano esiste
      const selectedPlanData = plans.find(plan => plan.id === selectedPlan);
      if (!selectedPlanData) {
        throw new Error("Piano selezionato non trovato");
      }
      
      // Determina il prezzo del piano in base al tipo di fatturazione
      const price = billingType === "monthly" 
        ? parseFloat(selectedPlanData.monthlyPrice) 
        : parseFloat(selectedPlanData.yearlyPrice);
      
      // Se è il piano gratuito (€0), procediamo direttamente con la creazione dell'abbonamento senza pagamento
      if (selectedPlanData.isFree || price === 0) {
        console.log("Piano gratuito selezionato, attivazione diretta senza pagamento");
        const response = await apiCall("POST", "/api/mobile/subscriptions", {
          planId: selectedPlan,
          billingFrequency: billingType
        });
        
        if (response.ok) {
          toast({
            title: "Abbonamento attivato",
            description: "Hai attivato con successo il piano gratuito",
          });
          setLocation("/mobile/dashboard");
          return;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Errore durante l'attivazione del piano");
        }
      }
      
      console.log("Piano a pagamento selezionato, reindirizzamento al checkout");
      
      // Reindirizza alla pagina di checkout con i dati del piano selezionato
      const destinationUrl = `/mobile/checkout/${selectedPlan}/${billingType}`;
      console.log('Navigazione verso:', destinationUrl);
      setLocation(destinationUrl);
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un problema nella selezione del piano",
        variant: "destructive",
      });
      setSubscriptionLoading(false);
    }
  };

  return (
    <MobileLayout hideBottomNav title="Piani di abbonamento">
      <div className="container px-4 py-6 mb-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Scegli il tuo piano</h1>
          <p className="text-gray-500">
            Seleziona il piano più adatto alle tue esigenze
          </p>
        </div>

        <Tabs defaultValue="monthly" className="w-full" onValueChange={(v) => setBillingType(v as "monthly" | "yearly")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="monthly">Mensile</TabsTrigger>
            <TabsTrigger value="yearly">Annuale</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center p-8">
                <p>Nessun piano disponibile</p>
              </div>
            ) : (
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedPlan === plan.id ? "border-2 border-primary" : ""
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{plan.name}</span>
                      <span className="text-xl font-bold">€{parseFloat(plan.monthlyPrice).toFixed(2)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {plan.description && <p className="text-gray-500 mb-4">{plan.description}</p>}
                    <div className="space-y-2">
                      {getFeatures(plan).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={selectedPlan === plan.id ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanSelect(plan.id);
                      }}
                    >
                      {selectedPlan === plan.id ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : null}
                      {selectedPlan === plan.id ? "Selezionato" : "Seleziona"}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="yearly" className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center p-8">
                <p>Nessun piano disponibile</p>
              </div>
            ) : (
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedPlan === plan.id ? "border-2 border-primary" : ""
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{plan.name}</span>
                      <span className="text-xl font-bold">€{parseFloat(plan.yearlyPrice).toFixed(2)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {plan.description && <p className="text-gray-500 mb-4">{plan.description}</p>}
                    <div className="space-y-2">
                      {getFeatures(plan).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={selectedPlan === plan.id ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanSelect(plan.id);
                      }}
                    >
                      {selectedPlan === plan.id ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : null}
                      {selectedPlan === plan.id ? "Selezionato" : "Seleziona"}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubscribe}
            disabled={!selectedPlan || subscriptionLoading}
          >
            {subscriptionLoading ? (
              <div className="animate-spin w-4 h-4 border-2 border-background border-t-transparent rounded-full mr-2"></div>
            ) : null}
            {(() => {
              const selectedPlanData = plans.find(plan => plan.id === selectedPlan);
              if (!selectedPlanData) return "Seleziona un piano";
              
              const price = billingType === "monthly" 
                ? parseFloat(selectedPlanData.monthlyPrice) 
                : parseFloat(selectedPlanData.yearlyPrice);
              
              if (selectedPlanData.isFree || price === 0) {
                return "Attiva Piano Gratuito";
              }
              return "Continua al Pagamento";
            })()}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}