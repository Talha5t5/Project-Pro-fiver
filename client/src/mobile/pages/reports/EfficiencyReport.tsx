import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Zap, 
  GitMerge, 
  Clock, 
  BadgeCheck,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import ReportChartCard from '../../components/reports/ReportChartCard';
import ReportFilters, { ReportFilterOptions } from '../../components/reports/ReportFilters';
import DashboardMetricCard from '../../components/reports/DashboardMetricCard';
import MobileLayout from '../../components/MobileLayout';
import { mobileApiCall } from '../../utils/mobileApi';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Progress } from '../../../components/ui/progress';
import { Button } from '../../../components/ui/button';
import { useLocation } from 'wouter';

export default function EfficiencyReport() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Stato per i filtri
  const [filters, setFilters] = useState<ReportFilterOptions>({
    timeframe: 'month'
  });
  
  // Carica i dati dal server utilizzando i filtri
  const { data = {}, isLoading } = useQuery({
    queryKey: ['/api/reports/efficiency', filters],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/api/reports/efficiency');
      if (!response.ok) throw new Error('Errore nel recuperare i dati di efficienza');
      return response.json();
    },
    refetchOnWindowFocus: false,
    placeholderData: {},
  });
  
  // Gestisce il cambio filtri
  const handleFilterChange = (newFilters: ReportFilterOptions) => {
    setFilters(newFilters);
  };
  
  // Funzione per formattare le percentuali
  const formatPercent = (percent: number | string) => {
    const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
    return `${numPercent.toFixed(1)}%`;
  };
  
  // Funzione per determinare lo stato (positivo, negativo, neutrale)
  const determineStatus = (value: number) => {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  };

  // Estrai i dati dalla risposta API
  const {
    summary = { 
      overallEfficiency: 0, 
      resourceUtilization: 0, 
      processOptimization: 0, 
      qualityIndex: 0,
      trend: 0
    },
    byJobType = [],
    byProcess = [],
    byCollaborator = []
  } = data;
  
  // Ottieni il titolo in base al periodo selezionato
  const getTimeframeTitle = () => {
    switch (filters.timeframe) {
      case 'day': return t('mobile.reports.filters.day');
      case 'week': return t('mobile.reports.filters.week');
      case 'month': return t('mobile.reports.filters.month');
      case 'quarter': return t('mobile.reports.filters.quarter');
      case 'year': return t('mobile.reports.filters.year');
      case 'custom': 
        if (filters.startDate && filters.endDate) {
          return `${t('mobile.reports.filters.startDate')}: ${format(filters.startDate, 'dd/MM/yyyy')} - ${t('mobile.reports.filters.endDate')}: ${format(filters.endDate, 'dd/MM/yyyy')}`;
        }
        return t('mobile.reports.filters.custom');
      default: return t('mobile.reports.efficiencyReport.title');
    }
  };
  
  // Dati di esempio per l'efficienza per tipo di lavoro
  const efficiencyByJobTypeData = [
    { name: 'Riparazioni', value: 87 },
    { name: 'Installazioni', value: 92 },
    { name: 'Manutenzione', value: 95 },
    { name: 'Sopralluoghi', value: 88 },
    { name: 'Emergenze', value: 81 }
  ];
  
  // Dati di esempio per il radar chart delle prestazioni
  const performanceData = [
    { subject: 'Velocità', A: 85 },
    { subject: 'Qualità', A: 92 },
    { subject: 'Costi', A: 78 },
    { subject: 'Soddisfazione', A: 90 },
    { subject: 'Supporto', A: 85 },
    { subject: 'Affidabilità', A: 88 }
  ];
  
  // Dati di esempio per i migliori processi
  const topProcessesData = [
    { id: 1, name: 'Installazione Caldaie', efficiency: 95, status: 'ottimizzato' },
    { id: 2, name: 'Riparazione Impianti', efficiency: 89, status: 'standard' },
    { id: 3, name: 'Manutenzione Condizionatori', efficiency: 93, status: 'ottimizzato' },
    { id: 4, name: 'Preventivo e Sopralluogo', efficiency: 87, status: 'standard' },
  ];
  
  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6666'];

  return (
    <MobileLayout title="Efficienza Lavori">
      <div className="container mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Efficienza Lavori: {getTimeframeTitle()}
          </h1>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/financial")}
              title="Report precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/performance")}
              title="Report successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Navigazione tra report */}
        <div className="flex overflow-x-auto gap-2 mb-4 pb-2 -mx-4 px-4">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation("/mobile/reports/performance")}
          >
            Performance
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation("/mobile/reports/time")}
          >
            Report Tempi
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setLocation("/mobile/reports/financial")}
          >
            Report Finanziario
          </Button>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => setLocation("/mobile/reports/efficiency")}
          >
            Efficienza
          </Button>
        </div>
        
        {/* Filtri */}
        <ReportFilters onApplyFilters={handleFilterChange} />
        
        {/* Se i dati stanno caricando, mostra un messaggio */}
        {isLoading ? (
          <div className="p-4 text-center">Caricamento dati in corso...</div>
        ) : (
          <>
            {/* Metriche principali */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <DashboardMetricCard 
                title={t('mobile.reports.efficiencyReport.overallEfficiency')} 
                value={formatPercent(summary.overallEfficiency || 88.5)}
                icon={<Zap className="w-4 h-4 text-primary" />}
                trend={summary.trend || 2.3}
                trendLabel={t('mobile.reports.metrics.vs') + ' ' + t('mobile.reports.metrics.previous') + ' ' + t('mobile.reports.metrics.period')}
                status={determineStatus(summary.trend || 2.3)}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.efficiencyReport.resourceUtilization')} 
                value={formatPercent(summary.resourceUtilization || 83.2)}
                icon={<Users className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.efficiencyReport.processOptimization')} 
                value={formatPercent(summary.processOptimization || 79.8)}
                icon={<GitMerge className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.efficiencyReport.qualityIndex')} 
                value={formatPercent(summary.qualityIndex || 92.5)}
                icon={<BadgeCheck className="w-4 h-4 text-primary" />}
              />
            </div>
            
            {/* Grafici */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Efficienza per tipo di lavoro */}
              <ReportChartCard 
                title="Efficienza per tipo di lavoro" 
                subtitle="In percentuale"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={efficiencyByJobTypeData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Efficienza']} />
                    <Bar dataKey="value" name="Efficienza (%)" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
              
              {/* Radar chart prestazioni */}
              <ReportChartCard 
                title="Indicatori di prestazione" 
                subtitle="Valutazione multi-dimensionale"
              >
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart cx="50%" cy="50%" outerRadius={90} data={performanceData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Valore']} />
                  </RadarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
            
            {/* Processi ottimizzati */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Processi valutati</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processo</TableHead>
                      <TableHead className="text-right">Efficienza</TableHead>
                      <TableHead className="text-right">Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProcessesData.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-medium">
                          {process.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <span className="mr-2">{process.efficiency}%</span>
                            <Progress value={process.efficiency} className="h-2 w-16" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={process.status === "ottimizzato" ? "outline" : "secondary"}>
                            {process.status === "ottimizzato" 
                              ? <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> 
                              : <Activity className="h-3 w-3 mr-1 text-amber-500" />
                            }
                            {process.status === "ottimizzato" ? "Ottimizzato" : "Standard"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Suggerimenti di ottimizzazione */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Suggerimenti di ottimizzazione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Riduci i tempi di attesa</h4>
                      <p className="text-xs text-gray-600">Il tempo di attesa tra le fasi di riparazione è superiore alla media. Una migliore pianificazione può ridurre i tempi morti.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-md">
                    <Activity className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Standardizza i processi di installazione</h4>
                      <p className="text-xs text-gray-600">Creare procedure standard per le installazioni più comuni può aumentare l'efficienza del 15%.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-md">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Ottimizzazione ottenuta: Manutenzioni</h4>
                      <p className="text-xs text-gray-600">Il processo di manutenzione programmata ha raggiunto un'efficienza superiore al 90%. Continua così!</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MobileLayout>
  );
}