import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../../lib/queryClient";
import { format, subMonths } from "date-fns";
import { it } from "date-fns/locale";

import { ArrowLeft, Calendar, Filter, Download, RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

// Formatta il denaro in euro
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Componente carta con grafico
const ChartCard = ({ title, subtitle, children, className = "", filterComponent = null }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  filterComponent?: React.ReactNode;
}) => (
  <Card className={className}>
    <CardHeader className="pb-4">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        {filterComponent}
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="h-72">
        {children}
      </div>
    </CardContent>
  </Card>
);

export default function StatisticsPage() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const [activePeriod, setActivePeriod] = useState("month");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedClientType, setSelectedClientType] = useState("all");

  // Otteniamo le statistiche avanzate
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/stats/advanced", activePeriod, selectedSector, selectedPlan, selectedClientType],
    queryFn: () => apiRequest({
      method: "GET",
      url: `/api/admin/stats/advanced?period=${activePeriod}&sector=${selectedSector}&plan=${selectedPlan}&clientType=${selectedClientType}`
    }).then(res => res.json()),
    placeholderData: {
      subscriptionsStats: {
        total: 0,
        active: 0,
        expiringSoon: 0,
        byType: [],
        trend: []
      },
      clientsStats: {
        total: 0,
        active: 0,
        new: 0,
        bySector: [],
        byPlan: []
      },
      revenueStats: {
        total: 0,
        monthly: 0,
        trend: []
      },
      usageStats: {
        avgSessionDuration: 0,
        avgSessionsPerUser: 0,
        sessionTrend: []
      },
      sectors: [],
      plans: []
    }
  });

  // Dati per i grafici
  const subscriptionsByTypeData = stats?.subscriptionsStats?.byType || [];
  const clientsBySectorData = stats?.clientsStats?.bySector || [];
  const clientsByPlanData = stats?.clientsStats?.byPlan || [];
  const revenueTrendData = stats?.revenueStats?.trend || [];
  const subscriptionTrendData = stats?.subscriptionsStats?.trend || [];
  const sessionTrendData = stats?.usageStats?.sessionTrend || [];

  // Elenco settori e piani disponibili
  const sectors = stats?.sectors || [];
  const plans = stats?.plans || [];

  // Genera dati per il grafico a torta delle scadenze
  const expirationData = [
    { name: 'In scadenza (30gg)', value: stats?.subscriptionsStats?.expiringSoon || 0 },
    { name: 'Attivi', value: (stats?.subscriptionsStats?.active || 0) - (stats?.subscriptionsStats?.expiringSoon || 0) }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/settings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('admin.statistics.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.statistics.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Select value={activePeriod} onValueChange={setActivePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.statistics.periods.month')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('admin.statistics.periods.week')}</SelectItem>
              <SelectItem value="month">{t('admin.statistics.periods.month')}</SelectItem>
              <SelectItem value="quarter">{t('admin.statistics.periods.quarter')}</SelectItem>
              <SelectItem value="year">{t('admin.statistics.periods.year')}</SelectItem>
              <SelectItem value="all">Tutti i Tempi</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCcw size={16} />
            {t('admin.statistics.refresh')}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download size={16} />
            {t('admin.statistics.download')}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('admin.statistics.title')}</CardTitle>
          <CardDescription>
            {t('admin.statistics.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm text-slate-500 mb-1">{t('admin.statistics.metrics.totalSubscriptions')}</h3>
              <p className="text-2xl font-bold">{stats?.subscriptionsStats?.total || 0}</p>
              <p className="text-xs text-green-600 mt-2">{stats?.subscriptionsStats?.active || 0} attivi</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm text-slate-500 mb-1">{t('admin.statistics.metrics.totalClients')}</h3>
              <p className="text-2xl font-bold">{stats?.clientsStats?.total || 0}</p>
              <p className="text-xs text-green-600 mt-2">+{stats?.clientsStats?.new || 0} nell'ultimo periodo</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm text-slate-500 mb-1">{t('admin.statistics.metrics.totalRevenue')}</h3>
              <p className="text-2xl font-bold">{formatCurrency(stats?.revenueStats?.total || 0)}</p>
              <p className="text-xs text-green-600 mt-2">{formatCurrency(stats?.revenueStats?.monthly || 0)} mensile</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm text-slate-500 mb-1">{t('admin.statistics.metrics.avgSessionDuration')}</h3>
              <p className="text-2xl font-bold">{stats?.usageStats?.avgSessionDuration || 0} min</p>
              <p className="text-xs text-slate-600 mt-2">{stats?.usageStats?.avgSessionsPerUser || 0} sessioni per utente</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('admin.statistics.filters.sector')}:</span>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('admin.statistics.filters.allSectors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.statistics.filters.allSectors')}</SelectItem>
                  {sectors.map((sector: any) => (
                    <SelectItem key={sector.id} value={sector.id.toString()}>{sector.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('admin.statistics.filters.plan')}:</span>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('admin.statistics.filters.allPlans')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.statistics.filters.allPlans')}</SelectItem>
                  {plans.map((plan: any) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('admin.statistics.filters.clientType')}:</span>
              <Select value={selectedClientType} onValueChange={setSelectedClientType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="residential">Residenziale</SelectItem>
                  <SelectItem value="commercial">Commerciale</SelectItem>
                  <SelectItem value="industrial">Industriale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="subscriptions">{t('admin.statistics.tabs.subscriptions')}</TabsTrigger>
          <TabsTrigger value="clients">{t('admin.statistics.tabs.clients')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('admin.statistics.tabs.revenue')}</TabsTrigger>
          <TabsTrigger value="usage">{t('admin.statistics.tabs.usage')}</TabsTrigger>
        </TabsList>

        {/* Tab Abbonamenti */}
        <TabsContent value="subscriptions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard 
              title={t('admin.statistics.charts.subscriptionsByType')}
              subtitle="Ripartizione degli abbonamenti attivi"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionsByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriptionsByTypeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Abbonamenti']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard 
              title="Abbonamenti in Scadenza vs Attivi"
              subtitle="Proporzione degli abbonamenti in scadenza nei prossimi 30 giorni"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expirationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FFBB28" />
                    <Cell fill="#00C49F" />
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Abbonamenti']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard 
            title={t('admin.statistics.charts.subscriptionTrend')}
            subtitle="Evoluzione del numero di abbonamenti attivi"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={subscriptionTrendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip labelFormatter={(label) => `Data: ${label}`} />
                <Legend />
                <Line type="monotone" dataKey="active" name="Abbonamenti Attivi" stroke="#00C49F" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="expiring" name="In Scadenza" stroke="#FFBB28" />
                <Line type="monotone" dataKey="new" name="Nuovi" stroke="#0088FE" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* Tab Clienti */}
        <TabsContent value="clients">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard 
              title="Distribuzione per Settore"
              subtitle="Ripartizione dei clienti per settore di attività"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsBySectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientsBySectorData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Clienti']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard 
              title="Distribuzione per Piano di Abbonamento"
              subtitle="Ripartizione dei clienti per tipo di abbonamento"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsByPlanData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientsByPlanData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Clienti']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard 
            title="Distribuzione Clienti per Tipo"
            subtitle="Percentuali di clienti per categoria (residenziale, commerciale, industriale)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Residenziale', value: 40 },
                  { name: 'Commerciale', value: 35 },
                  { name: 'Industriale', value: 25 }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [value, 'Clienti']} />
                <Legend />
                <Bar dataKey="value" name="Numero Clienti" fill="#8884d8">
                  <Cell fill="#0088FE" />
                  <Cell fill="#00C49F" />
                  <Cell fill="#FFBB28" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        {/* Tab Fatturato */}
        <TabsContent value="revenue">
          <ChartCard 
            title="Andamento Fatturato"
            subtitle="Evoluzione del fatturato nel tempo"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueTrendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `€${value}`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Fatturato" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ChartCard 
              title="Fatturato per Piano di Abbonamento"
              subtitle="Ripartizione del fatturato per piano"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientsByPlanData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `€${value}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Fatturato" fill="#8884d8">
                    {clientsByPlanData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard 
              title="Fatturato per Settore"
              subtitle="Ripartizione del fatturato per settore di attività"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientsBySectorData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `€${value}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Fatturato']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Fatturato" fill="#8884d8">
                    {clientsBySectorData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* Tab Utilizzo */}
        <TabsContent value="usage">
          <ChartCard 
            title="Andamento Sessioni"
            subtitle="Numero di sessioni utente nel tempo"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sessionTrendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sessions" name="Sessioni" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="uniqueUsers" name="Utenti Unici" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ChartCard 
              title="Tempo Medio di Sessione per Piano"
              subtitle="Durata media delle sessioni per piano di abbonamento"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientsByPlanData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value} min`} />
                  <Tooltip formatter={(value: number) => [`${value} minuti`, 'Tempo Medio']} />
                  <Legend />
                  <Bar dataKey="avgSessionTime" name="Tempo Medio di Sessione" fill="#8884d8">
                    {clientsByPlanData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard 
              title="Frequenza di Accesso"
              subtitle="Numero medio di accessi settimanali per piano"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clientsByPlanData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value} accessi`, 'Media Settimanale']} />
                  <Legend />
                  <Bar dataKey="accessFrequency" name="Frequenza Accessi" fill="#8884d8">
                    {clientsByPlanData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}