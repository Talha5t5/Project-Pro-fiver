import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ArrowLeft, Loader2, Check, CreditCard } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { mobileApiCall } from "../utils/mobileApi";
import StripePaymentForm from "../../components/StripePaymentForm";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyDuration: number;
  yearlyDuration: number;
  isFree: boolean;
  features: string[];
}

interface UserSubscription {
  id: number;
  planId: number;
  billingFrequency: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function ChangePlan() {
  const [location, setLocation] = useLocation();
  const { user } = useMobileAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load subscription plans
      const plansResponse = await mobileApiCall("GET", "/api/mobile/subscription-plans");
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }

      // Load current subscription
      const subscriptionResponse = await mobileApiCall("GET", "/api/mobile/subscription");
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setCurrentSubscription(subscriptionData);
        if (subscriptionData) {
          setBillingType(subscriptionData.billingFrequency);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei dati",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: number) => {
    setSelectedPlan(planId);
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    return billingType === "monthly" 
      ? parseFloat(plan.monthlyPrice)
      : parseFloat(plan.yearlyPrice);
  };

  const isFreePlan = (plan: SubscriptionPlan) => {
    return plan.isFree || parseFloat(plan.monthlyPrice) === 0;
  };

  const handleStripePaymentSuccess = async (paymentIntent: any) => {
    if (!selectedPlan || !currentSubscription) return;

    try {
      setProcessingPayment(true);
      
      console.log('Updating subscription with payment intent:', paymentIntent.id);
      const response = await mobileApiCall("PUT", `/api/mobile/subscriptions/${currentSubscription.id}`, {
        planId: selectedPlan,
        billingFrequency: billingType,
        paymentMethod: "credit_card",
        paymentIntentId: paymentIntent.id
      });
      
      console.log('Subscription update response:', response.status, response.ok);
      
      if (response.ok) {
        console.log('Subscription updated successfully, redirecting to dashboard');
        toast({
          title: "Successo",
          description: "Piano aggiornato con successo!",
          variant: "default",
        });
        setLocation("/mobile/dashboard");
      } else {
        const errorData = await response.json();
        console.error('Subscription update failed:', errorData);
        throw new Error(errorData.error || "Errore durante l'aggiornamento del piano");
      }
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un problema durante l'aggiornamento",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleStripePaymentError = (error: string) => {
    toast({
      title: "Errore di pagamento",
      description: error,
      variant: "destructive",
    });
    setProcessingPayment(false);
  };

  const handleFreePlanChange = async () => {
    if (!selectedPlan || !currentSubscription) return;

    try {
      setProcessingPayment(true);
      
      const response = await mobileApiCall("PUT", `/api/mobile/subscriptions/${currentSubscription.id}`, {
        planId: selectedPlan,
        billingFrequency: billingType,
        paymentMethod: null
      });
      
      if (response.ok) {
        toast({
          title: "Successo",
          description: "Piano aggiornato con successo!",
          variant: "default",
        });
        setLocation("/mobile/dashboard");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'aggiornamento del piano");
      }
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un problema durante l'aggiornamento",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  return (
    <MobileLayout hideBottomNav title="Cambia Piano">
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
                onClick={() => setLocation("/mobile/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla dashboard
              </Button>
              
              <h1 className="text-2xl font-bold mb-2">Cambia Piano</h1>
              <p className="text-gray-600">Scegli un nuovo piano per la tua sottoscrizione</p>
            </div>

            {/* Billing Toggle */}
            <div className="mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    billingType === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600"
                  }`}
                  onClick={() => setBillingType("monthly")}
                >
                  Mensile
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    billingType === "yearly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600"
                  }`}
                  onClick={() => setBillingType("yearly")}
                >
                  Annuale
                </button>
              </div>
            </div>

            {/* Plans */}
            <div className="space-y-4 mb-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id 
                      ? "ring-2 ring-primary border-primary" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {selectedPlan === plan.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      €{getPlanPrice(plan).toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">
                        /{billingType === "monthly" ? "mese" : "anno"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <ul className="space-y-2">
                      {Array.isArray(plan.features) ? plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      )) : (
                        <li className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          Tutte le funzionalità incluse
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Section */}
            {selectedPlan && selectedPlanData && (
              <div className="space-y-4">
                {isFreePlan(selectedPlanData) ? (
                  <Button 
                    onClick={handleFreePlanChange}
                    disabled={processingPayment}
                    className="w-full"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Aggiornamento...
                      </>
                    ) : (
                      "Aggiorna a Piano Gratuito"
                    )}
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                      <h3 className="font-medium">Pagamento sicuro con Stripe</h3>
                    </div>
                    
                    <StripePaymentForm
                      amount={getPlanPrice(selectedPlanData)}
                      currency="eur"
                      onSuccess={handleStripePaymentSuccess}
                      onError={handleStripePaymentError}
                      disabled={processingPayment}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
