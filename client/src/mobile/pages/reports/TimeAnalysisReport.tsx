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
  Cell,
  ComposedChart,
  Area
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Hourglass,
  ClipboardCheck,
  CheckCircle,
  Users,
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

export default function TimeAnalysisReport() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Stato per i filtri
  const [filters, setFilters] = useState<ReportFilterOptions>({
    timeframe: 'month'
  });
  
  // Carica i dati dal server utilizzando i filtri
  const { data = {}, isLoading } = useQuery({
    queryKey: ['/api/reports/time', filters],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/api/reports/time');
      if (!response.ok) throw new Error('Errore nel recuperare i dati di analisi temporale');
      return response.json();
    },
    refetchOnWindowFocus: false,
    placeholderData: {} // Usa questo invece di keepPreviousData
  });
  
  // Gestisce il cambio filtri
  const handleFilterChange = (newFilters: ReportFilterOptions) => {
    setFilters(newFilters);
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
  const determineStatus = (value: number, inverse = false) => {
    if (!inverse) {
      if (value > 0) return "positive";
      if (value < 0) return "negative";
    } else {
      if (value > 0) return "negative";
      if (value < 0) return "positive";
    }
    return "neutral";
  };

  // Estrai i dati dalla risposta API
  const {
    summary = { totalPlanned: 0, totalActual: 0, efficiency: 0, delta: 0, onTimeCompletion: 0 },
    byPeriod = [],
    byJobType = [],
    byCollaborator = [],
    delays = { avgDelay: 0, maxDelay: 0, delayDistribution: [] }
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
      default: return t('mobile.reports.timeReport.title');
    }
  };
  
  // Dati di esempio per la distribuzione dei ritardi
  const delayDistributionData = [
    { name: '0-1h', value: 45 },
    { name: '1-3h', value: 30 },
    { name: '3-8h', value: 15 },
    { name: '>8h', value: 10 }
  ];
  
  // Dati di esempio per il tempo per tipo di lavoro
  const timeByJobTypeData = [
    { name: 'Riparazioni', planned: 45, actual: 48 },
    { name: 'Installazioni', planned: 70, actual: 65 },
    { name: 'Manutenzione', planned: 30, actual: 32 },
    { name: 'Sopralluoghi', planned: 15, actual: 14 },
    { name: 'Emergenze', planned: 10, actual: 14 }
  ];
  
  // Dati per le attività recenti
  const recentActivities = [
    { id: 1, job: 'Installazione caldaia', client: 'Mario Rossi', planned: 3, actual: 3.5, status: 'complete' },
    { id: 2, job: 'Riparazione impianto', client: 'Anna Verdi', planned: 2, actual: 1.5, status: 'complete' },
    { id: 3, job: 'Manutenzione annuale', client: 'Giuseppe Bianchi', planned: 1, actual: 1, status: 'complete' },
    { id: 4, job: 'Sopralluogo', client: 'Sofia Neri', planned: 0.5, actual: 0.5, status: 'complete' },
  ];
  
  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6666'];

  return (
    <MobileLayout title="Report Tempi">
      <div className="container mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Report Tempi: {getTimeframeTitle()}
          </h1>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/performance")}
              title="Report precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/financial")}
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
            variant="default"
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
            variant="outline"
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
                title={t('mobile.reports.timeReport.plannedHours')} 
                value={formatHours(summary.totalPlanned || 120)}
                icon={<Calendar className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.timeReport.actualHours')} 
                value={formatHours(summary.totalActual || 126)}
                icon={<Clock className="w-4 h-4 text-primary" />}
                trend={summary.delta || 5}
                trendLabel={t('mobile.reports.timeReport.vsPlan')}
                status={determineStatus(summary.delta || 5, true)}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.timeReport.efficiency')} 
                value={formatPercent(summary.efficiency || 95.2)}
                icon={<Hourglass className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.timeReport.onTimeCompletion')} 
                value={formatPercent(summary.onTimeCompletion || 83.5)}
                icon={<ClipboardCheck className="w-4 h-4 text-primary" />}
              />
            </div>
            
            {/* Grafici */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Confronto ore pianificate vs effettive */}
              <ReportChartCard 
                title="Confronto tempo pianificato vs effettivo" 
                subtitle="Suddivisione per tipo di lavoro"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={timeByJobTypeData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Ore', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value}h`, '']} />
                    <Legend />
                    <Bar dataKey="planned" name="Ore pianificate" fill="#8884d8" />
                    <Bar dataKey="actual" name="Ore effettive" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
              
              {/* Distribuzione ritardi */}
              <ReportChartCard 
                title="Distribuzione ritardi" 
                subtitle="In base alla durata del ritardo"
                chartType="pie"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={delayDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {delayDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentuale']} />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
            
            {/* Attività recenti con tempi */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Attività recenti</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lavoro</TableHead>
                      <TableHead className="text-right">Ore plan.</TableHead>
                      <TableHead className="text-right">Ore eff.</TableHead>
                      <TableHead className="text-right">Diff.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((activity, index) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.job}</TableCell>
                        <TableCell className="text-right">{activity.planned}h</TableCell>
                        <TableCell className="text-right">{activity.actual}h</TableCell>
                        <TableCell className="text-right">
                          <span className={`${activity.actual > activity.planned ? 'text-red-500' : activity.actual < activity.planned ? 'text-green-500' : 'text-gray-500'}`}>
                            {activity.actual > activity.planned ? '+' : ''}
                            {(activity.actual - activity.planned).toFixed(1)}h
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MobileLayout>
  );
}