import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { 
  Check, 
  X, 
  Star, 
  Zap, 
  Users, 
  Calendar,
  BarChart3,
  Shield,
  Headphones,
  Globe
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limitations: string[];
  popular?: boolean;
  icon: React.ReactNode;
  color: string;
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfetto per piccoli team e freelancer',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Fino a 5 utenti',
      'Gestione clienti illimitata',
      'Calendario progetti',
      'Email support',
      'App mobile inclusa',
      'Backup automatico'
    ],
    limitations: [
      'Analytics limitate',
      'Senza integrazioni avanzate',
      'Senza API access'
    ],
    icon: <Users className="w-6 h-6" />,
    color: 'blue'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideale per aziende in crescita',
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: [
      'Fino a 20 utenti',
      'Tutto di Starter',
      'Analytics avanzate',
      'Integrazioni API',
      'Supporto prioritario',
      'Personalizzazione avanzata',
      'Report personalizzati',
      'Workflow automation'
    ],
    limitations: [
      'Senza funzionalità enterprise',
      'Limite utenti'
    ],
    popular: true,
    icon: <Zap className="w-6 h-6" />,
    color: 'purple'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Per grandi organizzazioni',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      'Utenti illimitati',
      'Tutto di Professional',
      'SSO & LDAP',
      'Supporto dedicato',
      'SLA garantito',
      'Onboarding personalizzato',
      'Integrazioni custom',
      'White-label solution',
      'Advanced security',
      'Compliance reporting'
    ],
    limitations: [],
    icon: <Shield className="w-6 h-6" />,
    color: 'green'
  }
];

interface PricingSectionProps {
  onSelectPlan?: (planId: string, isYearly: boolean) => void;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      green: 'bg-green-50 border-green-200 text-green-700'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Piani semplici e trasparenti
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Scegli il piano perfetto per le tue esigenze. Tutti i piani includono 
            aggiornamenti gratuiti e supporto tecnico.
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center space-x-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Mensile
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-blue-600"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
              Annuale
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                -20%
              </Badge>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-purple-300 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-4 py-1">
                    Più Popolare
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${getIconColorClasses(plan.color)}`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                
                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      €{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-500 ml-1">
                      /{isYearly ? 'anno' : 'mese'}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600 mt-1">
                      Risparmi €{(plan.monthlyPrice * 12 - plan.yearlyPrice).toFixed(0)} all'anno
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Features */}
                <div className="space-y-4 mb-8">
                  <h4 className="font-semibold text-gray-900 mb-3">Incluso:</h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div className="space-y-4 mb-8">
                    <h4 className="font-semibold text-gray-900 mb-3">Non incluso:</h4>
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start">
                        <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-500">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Button */}
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  size="lg"
                  onClick={() => onSelectPlan?.(plan.id, isYearly)}
                >
                  {plan.popular ? 'Inizia Ora' : 'Scegli Piano'}
                </Button>

                {/* Trial Info */}
                <p className="text-xs text-gray-500 text-center mt-3">
                  Prova gratuita di 14 giorni • Nessuna carta di credito richiesta
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Domande Frequenti
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                Posso cambiare piano in qualsiasi momento?
              </h4>
              <p className="text-gray-600">
                Sì, puoi aggiornare o declassare il tuo piano in qualsiasi momento. 
                Le modifiche vengono applicate immediatamente.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                C'è un limite di progetti?
              </h4>
              <p className="text-gray-600">
                No, tutti i piani includono progetti illimitati. 
                I limiti si applicano solo al numero di utenti.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                I dati sono sicuri?
              </h4>
              <p className="text-gray-600">
                Assolutamente. Utilizziamo crittografia end-to-end e backup automatici 
                per garantire la sicurezza dei tuoi dati.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                Offrite supporto tecnico?
              </h4>
              <p className="text-gray-600">
                Sì, tutti i piani includono supporto tecnico. 
                I piani Professional ed Enterprise includono supporto prioritario.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Pronto a iniziare?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Unisciti a migliaia di professionisti che utilizzano ProjectPro 
              per gestire i loro progetti in modo più efficiente.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Inizia la Prova Gratuita
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 