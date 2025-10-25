import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  Play,
  Star,
  Zap
} from 'lucide-react';

interface LandingHeroProps {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
}

export default function LandingHero({ onGetStarted, onWatchDemo }: LandingHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 mb-8">
            <Zap className="w-4 h-4 mr-2" />
            Nuovo: Gestione Avanzata Progetti
            <Badge variant="secondary" className="ml-2">v2.0</Badge>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            <span className="block">Gestisci i tuoi</span>
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              progetti come un pro
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            ProjectPro è la piattaforma completa per gestire clienti, collaboratori e progetti. 
            Ottimizza i tuoi processi, aumenta la produttività e cresci il tuo business.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
              onClick={onGetStarted}
            >
              Inizia Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-3 text-lg font-semibold border-2"
              onClick={onWatchDemo}
            >
              <Play className="mr-2 h-5 w-5" />
              Guarda Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Nessuna carta di credito richiesta
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Setup in 5 minuti
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Supporto 24/7
            </div>
          </div>

          {/* Rating */}
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              <strong>4.9/5</strong> da oltre 1,000+ utenti
            </span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Gestione Clienti
              </h3>
              <p className="text-gray-600">
                Organizza i tuoi clienti, traccia le comunicazioni e gestisci i rapporti in modo professionale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pianificazione Progetti
              </h3>
              <p className="text-gray-600">
                Crea e gestisci progetti con calendario integrato, assegnazione attività e tracking progressi.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Analytics Avanzate
              </h3>
              <p className="text-gray-600">
                Monitora le performance, analizza i dati e prendi decisioni informate per crescere il business.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">10,000+</div>
              <div className="text-sm text-gray-600 mt-1">Progetti Completati</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">5,000+</div>
              <div className="text-sm text-gray-600 mt-1">Clienti Soddisfatti</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">99.9%</div>
              <div className="text-sm text-gray-600 mt-1">Uptime Garantito</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">24/7</div>
              <div className="text-sm text-gray-600 mt-1">Supporto Clienti</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 