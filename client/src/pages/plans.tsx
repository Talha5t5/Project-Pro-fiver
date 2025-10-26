import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Check } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { Workflow } from 'lucide-react';

type Plan = {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyDuration: number | null;
  yearlyDuration: number | null;
  isActive: boolean | null;
  isFree: boolean | null;
  features: string | null;
};

export default function PlansPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Query per ottenere i piani
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/subscription-plans").then(res => res.json()),
  });

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

    // Find the selected plan
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    // Check if it's a free plan
    const isFreePlan = plan.isFree || parseFloat(plan.monthlyPrice || '0') === 0;

    if (isFreePlan) {
      // For free plans, check if user is authenticated
      const tempUser = sessionStorage.getItem('tempUser');
      
      if (!tempUser) {
        // Not authenticated, redirect to login/register
        toast({
          title: "Autenticazione richiesta",
          description: "Per favore registrati o effettua il login per attivare il piano gratuito",
          variant: "default",
        });
        setLocation('/desktop/auth');
        return;
      }

      try {
        setIsActivating(true);
        // User is registered, activate the free plan directly
        const userData = JSON.parse(tempUser);
        
        // Use the direct subscription endpoint
        const startDate = new Date();
        let endDate = new Date();
        
        // Set end date based on billing type
        if (billingType === "monthly") {
          endDate.setDate(endDate.getDate() + 30);
        } else {
          endDate.setDate(endDate.getDate() + 365);
        }
        
        const response = await apiRequest('POST', '/api/user-subscriptions', {
          userId: userData.id,
          planId: selectedPlan,
          billingFrequency: billingType,
          status: 'active',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (response.ok) {
          // Clear temp user data
          sessionStorage.removeItem('tempUser');
          
          toast({
            title: "Successo!",
            description: "Piano gratuito attivato con successo!",
            variant: "default",
          });
          
          // Redirect to artisan dashboard
          setTimeout(() => {
            setLocation('/admin/artisan-dashboard');
          }, 1500);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Errore durante l\'attivazione del piano');
        }
      } catch (error) {
        console.error('Errore durante l\'attivazione del piano gratuito:', error);
        toast({
          title: "Errore",
          description: error instanceof Error ? error.message : "Si è verificato un errore",
          variant: "destructive",
        });
      } finally {
        setIsActivating(false);
      }
    } else {
      // For paid plans, check authentication first
      const tempUser = sessionStorage.getItem('tempUser');
      
      if (!tempUser) {
        // Not authenticated, redirect to login/register
        toast({
          title: "Autenticazione richiesta",
          description: "Per favore registrati o effettua il login per procedere con il pagamento",
          variant: "default",
        });
        // Store selected plan info for after registration
        sessionStorage.setItem('pendingPlan', JSON.stringify({ planId: selectedPlan, billingType }));
        setLocation('/desktop/auth');
        return;
      }

      // User is authenticated, go to checkout
      setLocation(`/desktop/checkout/${selectedPlan}/${billingType}`);
    }
  };

  const getFeatures = (plan: Plan) => {
    if (!plan.features) return [];
    try {
      const features = JSON.parse(plan.features);
      return Object.entries(features).map(([key, value]) => ({
        key,
        value,
      }));
    } catch {
      return [];
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <Link href="/desktop" className="text-xl font-bold flex items-center">
            <Workflow className="h-6 w-6 mr-2 text-primary" />
            ProjectPro
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Scegli il Piano Perfetto per Te
            </h1>
            <p className="text-gray-500">
              Seleziona il piano più adatto alle tue esigenze
            </p>
          </div>

          <Tabs 
            defaultValue="monthly" 
            className="w-full" 
            onValueChange={(v) => setBillingType(v as "monthly" | "yearly")}
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="monthly">Mensile</TabsTrigger>
              <TabsTrigger value="yearly">Annuale</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center p-8">
                  <p>Nessun piano disponibile</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedPlan === plan.id ? "border-2 border-primary" : ""
                      }`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.isFree && <Badge>Gratuito</Badge>}
                        </div>
                        <CardDescription className="text-2xl font-bold text-primary">
                          €{parseFloat(plan.monthlyPrice).toFixed(2)}
                          <span className="text-sm font-normal text-gray-500">/mese</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {plan.description && (
                          <p className="text-gray-500 mb-4 text-sm">{plan.description}</p>
                        )}
                        <div className="space-y-2">
                          {getFeatures(plan).slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{feature.key}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center p-8">
                  <p>Nessun piano disponibile</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedPlan === plan.id ? "border-2 border-primary" : ""
                      }`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.isFree && <Badge>Gratuito</Badge>}
                        </div>
                        <CardDescription className="text-2xl font-bold text-primary">
                          €{parseFloat(plan.yearlyPrice).toFixed(2)}
                          <span className="text-sm font-normal text-gray-500">/anno</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {plan.description && (
                          <p className="text-gray-500 mb-4 text-sm">{plan.description}</p>
                        )}
                        <div className="space-y-2">
                          {getFeatures(plan).slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{feature.key}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {selectedPlan && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={handleSubscribe} disabled={isActivating}>
                {isActivating ? 'Attivazione in corso...' : 'Procedi al Checkout'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          © 2025 ProjectPro. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
}