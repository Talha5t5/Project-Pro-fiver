import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Bar, 
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
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Wallet,
  BarChart4,
  ArrowUpRight,
  User,
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
import { Button } from '../../../components/ui/button';
import { useLocation } from 'wouter';

export default function FinancialReport() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Stato per i filtri
  const [filters, setFilters] = useState<ReportFilterOptions>({
    timeframe: 'month'
  });
  
  // Carica i dati dal server utilizzando i filtri
  const { data = {}, isLoading } = useQuery({
    queryKey: ['/api/reports/financial', filters],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/api/reports/financial');
      if (!response.ok) throw new Error('Errore nel recuperare i dati finanziari');
      return response.json();
    },
    refetchOnWindowFocus: false,
    placeholderData: {},
  });
  
  // Gestisce il cambio filtri
  const handleFilterChange = (newFilters: ReportFilterOptions) => {
    setFilters(newFilters);
  };
  
  // Funzione per formattare gli importi in euro
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(numAmount);
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
      totalRevenue: 0, 
      totalCosts: 0, 
      profit: 0, 
      profitMargin: 0, 
      revenueGrowth: 0 
    },
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
      default: return t('mobile.reports.financialReport.title');
    }
  };
  
  // Dati di esempio per la suddivisione dei ricavi
  const revenueByJobTypeData = [
    { name: 'Riparazioni', value: 2500 },
    { name: 'Installazioni', value: 5200 },
    { name: 'Manutenzione', value: 1800 },
    { name: 'Sopralluoghi', value: 800 },
    { name: 'Emergenze', value: 1200 }
  ];
  
  // Dati di esempio per ricavi e costi mensili
  const monthlyFinancialData = [
    { name: 'Gen', revenue: 8000, costs: 5500, profit: 2500 },
    { name: 'Feb', revenue: 7500, costs: 5200, profit: 2300 },
    { name: 'Mar', revenue: 9200, costs: 6100, profit: 3100 },
    { name: 'Apr', revenue: 8800, costs: 5900, profit: 2900 },
    { name: 'Mag', revenue: 9500, costs: 6300, profit: 3200 },
    { name: 'Giu', revenue: 11000, costs: 7200, profit: 3800 }
  ];
  
  // Dati di esempio per i migliori clienti
  const topClientsData = [
    { id: 1, name: 'Mario Rossi', revenue: 3500, jobs: 5 },
    { id: 2, name: 'Anna Verdi', revenue: 2800, jobs: 3 },
    { id: 3, name: 'Giuseppe Bianchi', revenue: 2200, jobs: 4 },
    { id: 4, name: 'Sofia Neri', revenue: 1900, jobs: 2 },
  ];
  
  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6666'];

  return (
    <MobileLayout title="Report Finanziario">
      <div className="container mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Report Finanziario: {getTimeframeTitle()}
          </h1>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/time")}
              title="Report precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation("/mobile/reports/efficiency")}
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
            variant="default"
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
                title={t('mobile.reports.financialReport.totalRevenue')} 
                value={formatCurrency(summary.totalRevenue || 11500)}
                icon={<DollarSign className="w-4 h-4 text-primary" />}
                trend={summary.revenueGrowth || 8.5}
                trendLabel={t('mobile.reports.metrics.vs') + ' ' + t('mobile.reports.metrics.previous') + ' ' + t('mobile.reports.metrics.period')}
                status={determineStatus(summary.revenueGrowth || 8.5)}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.financialReport.totalCosts')} 
                value={formatCurrency(summary.totalCosts || 7200)}
                icon={<Wallet className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.financialReport.profit')} 
                value={formatCurrency(summary.profit || 4300)}
                icon={<TrendingUp className="w-4 h-4 text-primary" />}
              />
              
              <DashboardMetricCard 
                title={t('mobile.reports.financialReport.profitMargin')} 
                value={formatPercent(summary.profitMargin || 37.4)}
                icon={<BarChart4 className="w-4 h-4 text-primary" />}
              />
            </div>
            
            {/* Grafici */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Andamento ricavi e costi */}
              <ReportChartCard 
                title={t('mobile.reports.financialReport.totalRevenue') + ' & ' + t('mobile.reports.financialReport.totalCosts')} 
                subtitle={t('mobile.reports.filters.month')}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart
                    data={monthlyFinancialData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
                    <Legend />
                    <Bar dataKey="revenue" name="Ricavi" fill="#8884d8" />
                    <Bar dataKey="costs" name="Costi" fill="#ff8042" />
                    <Line type="monotone" dataKey="profit" name="Utile" stroke="#82ca9d" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ReportChartCard>
              
              {/* Suddivisione ricavi per tipo di lavoro */}
              <ReportChartCard 
                title={t('mobile.reports.financialReport.revenueByJobType')} 
                subtitle={t('mobile.reports.financialReport.revenueByJobType')}
                chartType="pie"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={revenueByJobTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueByJobTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Ricavo']} />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
            
            {/* Migliori clienti */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">{t('mobile.reports.financialReport.topClients')}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('mobile.reports.financialReport.client')}</TableHead>
                      <TableHead className="text-right">{t('mobile.reports.financialReport.jobs')}</TableHead>
                      <TableHead className="text-right">{t('mobile.reports.financialReport.revenue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClientsData.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {client.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{client.jobs}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(client.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Indicatori finanziari */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Indicatori finanziari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Valore medio per lavoro</span>
                    <span className="font-medium">{formatCurrency(820)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Costo medio per lavoro</span>
                    <span className="font-medium">{formatCurrency(515)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ROI</span>
                    <Badge variant="outline" className="font-medium">
                      <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                      159%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Costo per acquisizione cliente</span>
                    <span className="font-medium">{formatCurrency(125)}</span>
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