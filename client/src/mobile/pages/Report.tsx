import React from 'react';
import { useLocation } from 'wouter';
import { 
  BarChart, 
  Clock, 
  DollarSign, 
  Activity, 
  LineChart,
  ArrowRight
} from 'lucide-react';
import MobileLayout from "../components/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export default function MobileReport() {
  const [, setLocation] = useLocation();

  const reportCards = [
    {
      title: "Performance Generale",
      description: "Panoramica completa di fatturato, costi e tempi",
      icon: <BarChart className="h-8 w-8 text-blue-600" />,
      link: "/mobile/reports/performance"
    },
    {
      title: "Analisi Tempi",
      description: "Confronto tra tempi pianificati e reali",
      icon: <Clock className="h-8 w-8 text-yellow-600" />,
      link: "/mobile/reports/time"
    },
    {
      title: "Analisi Finanziaria",
      description: "Fatturato, preventivi e profitto",
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      link: "/mobile/reports/financial"
    },
    {
      title: "Efficienza Lavori",
      description: "Analisi dell'efficienza dei lavori completati",
      icon: <Activity className="h-8 w-8 text-indigo-600" />,
      link: "/mobile/reports/efficiency"
    }
  ];

  return (
    <MobileLayout title="Report e Statistiche">
      <div className="space-y-6">
        <div className="bg-blue-600/10 p-4 rounded-lg">
          <h2 className="text-xl font-semibold">Report e Statistiche</h2>
          <p className="text-gray-600">
            Analisi dettagliate sulle performance della tua attività
          </p>
        </div>

        <div className="space-y-4">
          {reportCards.map((card, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <div className="p-2 bg-blue-600/10 rounded-full">
                    {card.icon}
                  </div>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => setLocation(card.link)}
                >
                  Visualizza Report
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Indicatori di tendenza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ultimi Andamenti</CardTitle>
            <CardDescription>
              Tendenze recenti delle performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <LineChart className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm">Completamento lavori</span>
                </div>
                <div className="text-sm font-medium text-green-600">+12%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <LineChart className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm">Fatturato medio</span>
                </div>
                <div className="text-sm font-medium text-green-600">+8%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <LineChart className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm">Tempo di risposta</span>
                </div>
                <div className="text-sm font-medium text-green-600">-5%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <LineChart className="h-5 w-5 text-indigo-600 mr-2" />
                  <span className="text-sm">Soddisfazione clienti</span>
                </div>
                <div className="text-sm font-medium text-green-600">+15%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}