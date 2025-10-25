import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '../../../components/ui/button';
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
  Cell
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CalendarClock, 
  Clock, 
  PiggyBank,
  DollarSign,
  TrendingUp,
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import MobileLayout from "../../components/MobileLayout";
import ReportChartCard from '../../components/reports/ReportChartCard';
import ReportFilters, { ReportFilterOptions } from '../../components/reports/ReportFilters';
import DashboardMetricCard from '../../components/reports/DashboardMetricCard';
import PerformanceGauge from '../../components/reports/PerformanceGauge';
import { mobileApiCall } from '../../utils/mobileApi';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

export default function PerformanceReport() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  // Stato per i filtri
  const [filters, setFilters] = useState<ReportFilterOptions>({
    timeframe: 'month'
  });
  
  // Carica i dati dal server utilizzando i filtri
  const { data = {}, isLoading } = useQuery({
    queryKey: ['/api/reports/performance', filters],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/api/reports/performance');
      if (!response.ok) throw new Error('Errore nel recuperare i dati di performance');
      return response.json();
    },
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Mantiene i dati precedenti durante il caricamento (nuova sintassi)
  });
  
  // Gestisce il cambio filtri
  const handleFilterChange = (newFilters: ReportFilterOptions) => {
    setFilters(newFilters);
  };

  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // Funzione per formattare i numeri in valuta
  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(numValue);
  };
  
  // Funzione per formattare le ore
  const formatHours = (hours: number | string) => {
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
    return `${numHours.toFixed(1)}h`;
  };
  
  // Funzione per formattare le percentuali
  const formatPercent = (percent: number | string) => {
    const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
    return `${numPercent.toFixed(1)}%`;
  };
  
  // Funzione per determinare lo stato (positivo, negativo, neutrale)
  const determineStatus = (value: number, threshold = 0) => {
    if (value > threshold) return "positive";
    if (value < -threshold) return "negative";
    return "neutral";
  };

  // Estrai i dati dalla risposta API
  const {
    revenue = 0,
    timeData = { totalPlanned: 0, totalActual: 0, efficiency: 0 },
    costData = { total: 0, materials: 0, labor: 0 },
    deltas = { revenue: 0, efficiency: 0, costs: 0 },
    performanceData = { score: 0, onTimeCompletion: 0, clientSatisfaction: 0 }
  } = data as any;
  
  // Se i dati stanno caricando, mostra un messaggio
  if (isLoading) {
    return (
      <MobileLayout title={t('mobile.reports.performanceReport.title')}>
        <div className="p-4">{t('mobile.reports.loading')}</div>
      </MobileLayout>
    );
  }

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
      default: return t('mobile.reports.performanceReport.title');
    }
  };
  
  // Dati per il grafico a torta dei costi
  const costChartData = [
    { name: t('mobile.reports.performanceReport.materials'), value: costData.materials },
    { name: t('mobile.reports.performanceReport.labor'), value: costData.labor },
    { name: t('mobile.reports.performanceReport.totalCosts'), value: costData.total - costData.materials - costData.labor }
  ];
  
  // Dati per l'efficienza nel tempo (esempio)
  const efficiencyByPeriodData = [
    { name: 'Gen', efficiency: 75 },
    { name: 'Feb', efficiency: 78 },
    { name: 'Mar', efficiency: 82 },
    { name: 'Apr', efficiency: 79 },
    { name: 'Mag', efficiency: 85 },
    { name: 'Giu', efficiency: 82 },
    { name: 'Lug', efficiency: 80 },
    { name: 'Ago', efficiency: 84 },
    { name: 'Set', efficiency: 87 },
    { name: 'Ott', efficiency: 89 },
    { name: 'Nov', efficiency: 91 },
    { name: 'Dic', efficiency: 92 }
  ];
  
  // Dati per la tabella KPI
  const kpiTableData = [
    { name: t('mobile.reports.performanceReport.performanceScore'), value: performanceData.score, target: 85, unit: '%' },
    { name: t('mobile.reports.performanceReport.onTimeCompletion'), value: performanceData.onTimeCompletion, target: 90, unit: '%' },
    { name: t('mobile.reports.performanceReport.clientSatisfaction'), value: performanceData.clientSatisfaction, target: 85, unit: '%' },
    { name: t('mobile.reports.performanceReport.efficiency'), value: timeData.efficiency, target: 80, unit: '%' }
  ];

  return (
    <MobileLayout title={t('mobile.reports.performanceReport.title')}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {t('mobile.reports.performanceReport.title')}: {getTimeframeTitle()}
          </h1>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/efficiency")}
              title="Report precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/time")}
              title="Report successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filtri */}
        <ReportFilters onApplyFilters={handleFilterChange} />
        
        {/* Metriche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <DashboardMetricCard 
            title={t('mobile.reports.performanceReport.revenue')} 
            value={formatCurrency(revenue)}
            icon={<DollarSign className="w-4 h-4 text-primary" />}
            trend={deltas.revenue}
            trendLabel={t('mobile.reports.metrics.vs') + ' ' + t('mobile.reports.metrics.previous')}
            status={determineStatus(deltas.revenue, 2)}
          />
          
          <DashboardMetricCard 
            title={t('mobile.reports.performanceReport.efficiency')} 
            value={formatPercent(timeData.efficiency)}
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            trend={deltas.efficiency}
            trendLabel={t('mobile.reports.metrics.vs') + ' ' + t('mobile.reports.metrics.previous')}
            status={determineStatus(deltas.efficiency, 2)}
          />
          
          <DashboardMetricCard 
            title={t('mobile.reports.performanceReport.plannedHours')} 
            value={formatHours(timeData.totalPlanned)}
            icon={<CalendarClock className="w-4 h-4 text-primary" />}
          />
          
          <DashboardMetricCard 
            title={t('mobile.reports.performanceReport.actualHours')} 
            value={formatHours(timeData.totalActual)}
            icon={<Clock className="w-4 h-4 text-primary" />}
          />
        </div>
        
        {/* Indicatori di performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <PerformanceGauge 
            title={t('mobile.reports.performanceReport.performanceScore')} 
            value={performanceData.score}
            indicator={performanceData.score >= 80 ? "green" : performanceData.score >= 60 ? "yellow" : "red"}
            description={t('mobile.reports.performanceReport.performanceScore')}
          />
          
          <PerformanceGauge 
            title={t('mobile.reports.performanceReport.onTimeCompletion')} 
            value={performanceData.onTimeCompletion}
            indicator={performanceData.onTimeCompletion >= 80 ? "green" : performanceData.onTimeCompletion >= 60 ? "yellow" : "red"}
            description={t('mobile.reports.performanceReport.onTimeCompletion')}
          />
          
          <PerformanceGauge 
            title={t('mobile.reports.performanceReport.clientSatisfaction')} 
            value={performanceData.clientSatisfaction}
            indicator={performanceData.clientSatisfaction >= 80 ? "green" : performanceData.clientSatisfaction >= 60 ? "yellow" : "red"}
            description={t('mobile.reports.performanceReport.clientSatisfaction')}
          />
        </div>
        
        {/* Grafici */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Grafico efficienza nel tempo */}
          <ReportChartCard 
            title="Andamento efficienza" 
            subtitle="Evoluzione dell'efficienza nel tempo"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={efficiencyByPeriodData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[50, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Efficienza']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#10b981" 
                  name="Efficienza (%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ReportChartCard>
          
          {/* Grafico distribuzione costi */}
          <ReportChartCard 
            title="Distribuzione costi" 
            subtitle="Ripartizione dei costi per categoria"
            chartType="pie"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Importo']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ReportChartCard>
        </div>
        
        {/* Tabella KPI */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Tabella KPI Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicatore</TableHead>
                  <TableHead className="text-right">Valore attuale</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiTableData.map((kpi, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{kpi.name}</TableCell>
                    <TableCell className="text-right">{kpi.value}{kpi.unit}</TableCell>
                    <TableCell className="text-right">{kpi.target}{kpi.unit}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center ${kpi.value >= kpi.target ? 'text-green-600' : 'text-amber-600'}`}>
                        {kpi.value >= kpi.target ? (
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                        )}
                        {kpi.value >= kpi.target ? 'A target' : 'Sotto target'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}