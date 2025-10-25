import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Smartphone, 
  Download, 
  Star, 
  CheckCircle, 
  ArrowRight,
  Calendar,
  Users,
  Target,
  Bell,
  Settings,
  Home,
  BarChart3,
  Plus
} from 'lucide-react';

interface MobileFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface MobileAppPreviewProps {
  onDownload?: () => void;
}

const mobileFeatures: MobileFeature[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Mobile',
    description: 'Visualizza statistiche e attività in tempo reale',
    icon: <Home className="w-5 h-5" />,
    color: 'blue'
  },
  {
    id: 'projects',
    title: 'Gestione Progetti',
    description: 'Crea e gestisci progetti ovunque tu sia',
    icon: <Target className="w-5 h-5" />,
    color: 'green'
  },
  {
    id: 'calendar',
    title: 'Calendario Integrato',
    description: 'Pianifica e visualizza le tue attività',
    icon: <Calendar className="w-5 h-5" />,
    color: 'purple'
  },
  {
    id: 'clients',
    title: 'Clienti a Portata di Mano',
    description: 'Accedi ai dati dei clienti in movimento',
    icon: <Users className="w-5 h-5" />,
    color: 'orange'
  },
  {
    id: 'notifications',
    title: 'Notifiche Push',
    description: 'Ricevi aggiornamenti in tempo reale',
    icon: <Bell className="w-5 h-5" />,
    color: 'red'
  },
  {
    id: 'analytics',
    title: 'Analytics Mobile',
    description: 'Monitora le performance ovunque',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'indigo'
  }
];

export default function MobileAppPreview({ onDownload }: MobileAppPreviewProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div>
              <Badge className="bg-blue-100 text-blue-800 mb-4">
                <Smartphone className="w-4 h-4 mr-2" />
                App Mobile Disponibile
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
                Gestisci i tuoi progetti
                <span className="block text-blue-600">dovunque tu sia</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                L'app ProjectPro ti permette di gestire clienti, progetti e attività 
                direttamente dal tuo smartphone. Sincronizzazione automatica e 
                interfaccia ottimizzata per mobile.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mobileFeatures.map((feature, index) => (
                <div 
                  key={feature.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                    activeFeature === index 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(feature.color)}`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Download Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Scarica l'App</h3>
                  <p className="text-sm text-gray-600">Disponibile su iOS e Android</p>
                </div>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">4.9</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                  onClick={onDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  App Store
                </Button>
                <Button 
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                  onClick={onDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Google Play
                </Button>
              </div>
              
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Gratuita
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Nessuna pubblicità
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Sincronizzazione
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Preview */}
          <div className="relative">
            {/* Phone Frame */}
            <div className="relative mx-auto w-80 h-[600px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                {/* Status Bar */}
                <div className="h-8 bg-blue-600 flex items-center justify-between px-6 text-white text-xs">
                  <span>9:41</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-2 bg-white rounded-sm"></div>
                    <div className="w-1 h-2 bg-white rounded-sm"></div>
                    <div className="w-1 h-2 bg-white rounded-sm"></div>
                  </div>
                </div>

                {/* App Content */}
                <div className="h-full bg-gray-50">
                  {/* Header */}
                  <div className="bg-white p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-lg font-bold text-gray-900">ProjectPro</h1>
                        <p className="text-sm text-gray-600">Dashboard</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Bell className="w-5 h-5 text-gray-600" />
                        <Settings className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">24</div>
                        <div className="text-xs text-blue-800">Progetti</div>
                      </div>
                      <div className="bg-green-100 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">156</div>
                        <div className="text-xs text-green-800">Clienti</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="px-4 mb-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuovo Progetto
                    </Button>
                  </div>

                  {/* Recent Activities */}
                  <div className="px-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Attività Recenti</h3>
                    <div className="space-y-2">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Target className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Website Aziendale</p>
                            <p className="text-xs text-gray-600">Completato • 2 ore fa</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Done
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Nuovo Cliente</p>
                            <p className="text-xs text-gray-600">TechCorp • 4 ore fa</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            New
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white border-t">
                    <div className="flex items-center justify-around py-2">
                      <div className="flex flex-col items-center">
                        <Home className="w-5 h-5 text-blue-600" />
                        <span className="text-xs text-blue-600">Home</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">Calendario</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Target className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">Progetti</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">Stats</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Inizia a usare ProjectPro Mobile
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Scarica l'app e gestisci i tuoi progetti ovunque tu sia. 
              Sincronizzazione automatica con la versione desktop.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={onDownload}
            >
              <Download className="w-5 h-5 mr-2" />
              Scarica Ora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 