import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Check } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeleton';

// Interfacce
interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean | null;
  isFree: boolean | null;
  features: string | null;
  vatRate: number | null;
}

interface SubscriptionPlanFeatures {
  modules?: {
    collaborators?: boolean;
    jobActivities?: boolean;
    [key: string]: boolean | undefined;
  };
  hiddenData?: {
    [key: string]: boolean | undefined;
  };
  pages?: {
    [key: string]: boolean | undefined;
  };
  limits?: {
    maxClients?: number;
    maxJobs?: number;
    [key: string]: number | undefined;
  };
  max_clients?: number;
  max_jobs?: number;
  max_collaborators?: number;
  job_types?: boolean;
  activities?: boolean;
  reporting?: boolean;
  invoicing?: boolean;
  custom_branding?: boolean;
  api_access?: boolean;
  priority_support?: boolean;
  [key: string]: any;
}

// Proprietà del componente
type SubscriptionPlansGridProps = {
  onSelectPlan?: (planId: number, billingType: 'monthly' | 'annual') => void;
};

export function SubscriptionPlansGrid({ onSelectPlan }: SubscriptionPlansGridProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  
  // Query reale: carica i piani dal server senza fallback hardcoded
  const { data: plans, isLoading, error } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
    queryFn: async () => {
      const res = await fetch('/api/subscription-plans');
      if (!res.ok) throw new Error('Failed to load plans');
      return res.json();
    }
  });

  // Funzione per analizzare le caratteristiche di un piano
  const parsePlanFeatures = (plan: SubscriptionPlan): SubscriptionPlanFeatures => {
    if (!plan.features) return {};
    
    try {
      return JSON.parse(plan.features);
    } catch (e) {
      console.error(`Errore nel parsing delle caratteristiche del piano ${plan.id}:`, e);
      return {};
    }
  };

  // Funzione per generare un elenco di caratteristiche leggibili
  const getPlanFeaturesList = (plan: SubscriptionPlan): string[] => {
    const features = parsePlanFeatures(plan);
    const featuresList: string[] = [];
    
    // Limite clienti
    const maxClients = features.limits?.maxClients || features.max_clients;
    if (maxClients !== undefined) {
      featuresList.push(maxClients === -1 
        ? 'Clienti illimitati' 
        : `Massimo ${maxClients} clienti`);
    }
    
    // Limite lavori
    const maxJobs = features.limits?.maxJobs || features.max_jobs;
    if (maxJobs !== undefined) {
      featuresList.push(maxJobs === -1 
        ? 'Lavori illimitati' 
        : `Massimo ${maxJobs} lavori`);
    }
    
    // Limite collaboratori
    const maxCollaborators = features.limits?.maxCollaborators || features.max_collaborators;
    if (maxCollaborators !== undefined) {
      featuresList.push(maxCollaborators === -1 
        ? 'Collaboratori illimitati' 
        : `Massimo ${maxCollaborators} collaboratori`);
    }
    
    // Moduli attivati
    if (features.modules?.collaborators || features.collaborators) {
      featuresList.push('Gestione collaboratori');
    }
    
    if (features.modules?.jobActivities || features.activities) {
      featuresList.push('Gestione attività');
    }
    
    if (features.job_types) {
      featuresList.push('Configurazione tipi di lavoro');
    }
    
    if (features.reporting) {
      featuresList.push('Reportistica avanzata');
    }
    
    if (features.invoicing) {
      featuresList.push('Gestione fatturazione');
    }
    
    if (features.custom_branding) {
      featuresList.push('Personalizzazione branding');
    }
    
    if (features.api_access) {
      featuresList.push('Accesso API');
    }
    
    if (features.priority_support) {
      featuresList.push('Supporto prioritario');
    }
    
    // Se non ci sono caratteristiche, aggiungi alcune predefinite in base al prezzo
    if (featuresList.length === 0) {
      if (plan.monthlyPrice === 0) {
        featuresList.push(
          'Gestione clienti base',
          'Gestione lavori base',
          'Funzionalità limitate',
          'Supporto via email'
        );
      } else if (plan.monthlyPrice < 30) {
        featuresList.push(
          'Gestione clienti completa',
          'Gestione lavori avanzata',
          'Calendario integrato',
          'Reportistica base',
          'Supporto via email'
        );
      } else {
        featuresList.push(
          'Tutte le funzionalità',
          'Utenti illimitati',
          'Supporto prioritario',
          'Personalizzazione avanzata',
          'Integrazioni API'
        );
      }
    }
    
    return featuresList;
  };

  // Gestisci la selezione di un piano
  const handleSelectPlan = (planId: number) => {
    if (onSelectPlan) {
      onSelectPlan(planId, billingPeriod);
    }
  };

  // Determina quale piano è popolare (scegli il piano di mezzo o quello più costoso ma non il più costoso in assoluto)
  const getPopularPlanIndex = (plans: SubscriptionPlan[] | undefined): number => {
    if (!plans || plans.length <= 1) return -1;
    
    // Se ci sono solo 2 piani, il secondo è popolare
    if (plans.length === 2) return 1;
    
    // Se ci sono 3 o più piani, quello di mezzo è popolare
    if (plans.length >= 3) {
      // Ottieni l'indice del piano di mezzo, escludendo eventuali piani gratuiti
      const paidPlans = plans.filter(plan => !plan.isFree && plan.monthlyPrice > 0);
      if (paidPlans.length === 0) return -1;
      if (paidPlans.length === 1) return plans.findIndex(p => p.id === paidPlans[0].id);
      
      // Se ci sono almeno 2 piani a pagamento, il piano popolare è quello di mezzo
      const middleIndex = Math.floor(paidPlans.length / 2) - (paidPlans.length % 2 === 0 ? 1 : 0);
      return plans.findIndex(p => p.id === paidPlans[middleIndex].id);
    }
    
    return -1;
  };

  const popularPlanIndex = getPopularPlanIndex(plans);

  // Rendering degli skeleton loaders durante il caricamento
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <Skeleton className="w-[400px] h-10" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="border shadow h-full">
              <CardHeader>
                <Skeleton className="h-7 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-6">
                <Skeleton className="h-10 w-24" />
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Skeleton className="h-4 w-4 mt-0.5" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Mostra un messaggio di errore se necessario
  if (error || !plans || plans.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-semibold mb-2">Impossibile caricare i piani di abbonamento</h3>
        <p className="text-gray-500">
          Si è verificato un errore durante il caricamento dei piani. Riprova più tardi o contatta l'assistenza.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <Tabs 
          defaultValue="monthly" 
          value={billingPeriod}
          onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'annual')}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Mensile</TabsTrigger>
            <TabsTrigger value="annual">Annuale (2 mesi gratis)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans
          .filter(plan => plan.isActive !== false)
          .map((plan, i) => {
            const isPopular = i === popularPlanIndex;
            const rawPrice = billingPeriod === 'monthly' ? (plan as any).monthlyPrice : (plan as any).yearlyPrice;
            const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice ?? 0);
            const formattedPrice = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(numericPrice) ? numericPrice : 0);
            const features = getPlanFeaturesList(plan);
            
            return (
              <Card 
                key={plan.id} 
                className={`border shadow h-full relative flex flex-col ${isPopular ? 'border-primary shadow-md' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Più Popolare
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {formattedPrice}
                    </span>
                    <span className="text-gray-500">
                      {billingPeriod === 'monthly' ? '/mese' : '/anno'}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      IVA {plan.vatRate || 22}% inclusa
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    Seleziona Piano
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
      </div>
    </div>
  );
}