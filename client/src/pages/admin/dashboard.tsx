import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Users, Settings, PieChart, FileText, CreditCard, User, Calendar, Edit, Award, Key } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { LanguageSelector } from "../../components/ui/language-selector";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
// Tipo di dati per il client
type Client = {
  id: number;
  name: string;
  type: "residential" | "commercial" | "industrial";
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  geoLocation: string | null;
  notes: string | null;
};

// Tipo di dati per la sottoscrizione
type Subscription = {
  id: number;
  userId: number;
  planId: number;
  status: string | null;
  startDate: Date;
  endDate: Date | null;
  billingFrequency: "monthly" | "yearly" | null;
  createdAt: Date | null;
  lastBillingDate: Date | null;
  nextBillingDate: Date | null;
};

// Tipo di dati per il piano
type Plan = {
  id: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string | null;
  features: string | null;
  createdAt: Date | null;
  isActive: boolean | null;
  isFree: boolean | null;
  monthlyDuration: number | null;
  yearlyDuration: number | null;
};

// Tipo di dati per utente
type User = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  type?: string;
  isActive?: boolean;
  roleId?: number | null;
};

// Tipo di dati per settore
type Sector = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean | null;
};

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const { t, i18n } = useTranslation();
  
  // Force re-render when language changes
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate({});
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Check user role and redirect if not super admin
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/admin/session');
        if (response.ok) {
          const session = await response.json();
          if (session.user && session.user.role !== 'superadmin') {
            // Redirect non-super-admin users to artisan dashboard
            setLocation('/admin/artisan-dashboard');
            toast({
              title: "Accesso Negato",
              description: "Questa dashboard è riservata ai Super Amministratori",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, [setLocation, toast]);
  


  // Otteniamo le statistiche dalla dashboard amministratore
  const { data: stats = {
    totalUsers: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    revenueMonthly: [],
    totalRevenue: 0,
    recentLogins: []
  }, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => apiRequest("GET", "/api/admin/stats").then(res => res.json()),
    retry: 3, // retry a few times in case of network issues
    retryDelay: 1000, // 1 second between retries
  });
  
  // Query per i clienti
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(res => res.json()),
    enabled: activeTab === "clients"
  });
  
  // Query per i piani di abbonamento
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/subscription-plans").then(res => res.json()),
    enabled: true // Always fetch plans since they're needed for administrators section
  });
  
  // Query per gli abbonamenti degli utenti
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/user-subscriptions"],
    queryFn: () => apiRequest("GET", "/api/user-subscriptions").then(res => res.json()),
    enabled: activeTab === "clients" || activeTab === "admins"
  });
  
  // Query per i settori
  const { data: sectors = [], isLoading: sectorsLoading } = useQuery({
    queryKey: ["/api/sectors"],
    queryFn: () => apiRequest("GET", "/api/sectors").then(res => res.json()),
    enabled: activeTab === "clients"
  });
  
  // Query per gli utenti amministratori
  const { data: administrators = [], isLoading: adminsLoading } = useQuery({
    queryKey: ["/api/administrators"],
    queryFn: () => apiRequest("GET", "/api/administrators").then(res => res.json()),
    enabled: activeTab === "admins"
  });

  const handleNavigation = (path: string) => {
    setLocation(`/admin/${path}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
        <LanguageSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin.dashboard.totalClients')}</p>
                <h3 className="text-2xl font-bold">{stats.totalUsers || 0}</h3>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin.dashboard.activeSubscriptions')}</p>
                <h3 className="text-2xl font-bold">{stats.activeSubscriptions || 0}</h3>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin.dashboard.expiring')}</p>
                <h3 className="text-2xl font-bold">{stats.expiringSoon || 0}</h3>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('admin.dashboard.monthlyRevenue')}</p>
                <h3 className="text-2xl font-bold">€{Array.isArray(stats.revenueMonthly) ? 
                  stats.revenueMonthly.reduce((sum, item) => sum + (Number(item.value) || 0), 0).toFixed(2) : "0.00"}</h3>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">{t('admin.dashboard.menu')}</h2>
            <nav className="space-y-1">
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("overview")}
              >
                <PieChart className="mr-2 h-4 w-4" />
                {t('admin.dashboard.dashboard')}
              </Button>
              <Button
                variant={activeTab === "clients" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("clients")}
              >
                <Users className="mr-2 h-4 w-4" />
                {t('admin.dashboard.clients')}
              </Button>
              <Button
                variant={activeTab === "plans" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigation("subscription-plans")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t('admin.dashboard.plans')}
              </Button>

              <Button
                variant={activeTab === "invoices" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("invoices")}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t('admin.dashboard.billing')}
              </Button>
              <Button
                variant={activeTab === "statistics" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setLocation("/admin/statistics")}
              >
                <PieChart className="mr-2 h-4 w-4" />
                {t('admin.dashboard.statistics')}
              </Button>
              <Button
                variant={activeTab === "admins" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("admins")}
              >
                <User className="mr-2 h-4 w-4" />
                {t('admin.dashboard.users')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation("promo-spots")}
              >
                <Award className="mr-2 h-4 w-4" />
                {t('admin.dashboard.promotionalSpots')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation("settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('admin.dashboard.settings')}
              </Button>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.dashboard.overview')}</CardTitle>
                  <CardDescription>
                    {t('admin.dashboard.overviewDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('admin.dashboard.recentInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t('admin.dashboard.expiringSubscriptions')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.expiringSoon > 0 ? (
                            <div className="space-y-2">
                              <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
                              <p className="text-sm text-gray-600">Subscriptions expiring within 30 days</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">{t('admin.dashboard.noDataAvailable')}</p>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t('admin.dashboard.lastAccesses')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.recentLogins && stats.recentLogins.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-2xl font-bold text-blue-600">{stats.recentLogins.length}</p>
                              <p className="text-sm text-gray-600">Recent logins</p>
                              <div className="space-y-1">
                                {stats.recentLogins.slice(0, 3).map((login: any, index: number) => (
                                  <div key={index} className="text-xs text-gray-500">
                                    {login.username} ({login.user_type}) - {new Date(login.login_time).toLocaleString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">{t('admin.dashboard.noDataAvailable')}</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <h3 className="text-lg font-medium mt-6">{t('admin.dashboard.revenue')}</h3>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-500">{t('admin.dashboard.total')}</p>
                            <h3 className="text-2xl font-bold">€{stats.totalRevenue?.toFixed(2) || "0.00"}</h3>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t('admin.dashboard.monthly')}</p>
                            <h3 className="text-2xl font-bold">€{Array.isArray(stats.revenueMonthly) ? 
                              stats.revenueMonthly.reduce((sum, item) => sum + (Number(item.value) || 0), 0).toFixed(2) : "0.00"}</h3>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t('admin.dashboard.weekly')}</p>
                            <h3 className="text-2xl font-bold">€0.00</h3>
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={stats.revenueMonthly || []}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `€${value.toLocaleString()}`}
                              />
                              <Tooltip 
                                formatter={(value: number) => [`€${value.toLocaleString()}`, 'Revenue']}
                                labelStyle={{ color: '#374151' }}
                                contentStyle={{ 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                name="Revenue" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                activeDot={{ r: 6, fill: '#3b82f6' }}
                                dot={{ r: 4, fill: '#3b82f6' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.dashboard.clientManagement.title')}</CardTitle>
                  <CardDescription>
                    {t('admin.dashboard.clientManagement.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-4">
                    <div className="space-x-2">
                      <Button variant="outline">{t('admin.dashboard.clientManagement.filter')}</Button>
                      <Button variant="outline">{t('admin.dashboard.clientManagement.export')}</Button>
                    </div>
                    <Button onClick={() => handleNavigation("clients/create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('admin.dashboard.clientManagement.newClient')}
                    </Button>
                  </div>
                  <div className="border rounded-md">
                    <div className="bg-gray-50 p-3 border-b grid grid-cols-8 font-medium text-sm">
                      <div>{t('admin.dashboard.clientManagement.company')}</div>
                      <div>{t('admin.dashboard.clientManagement.sector')}</div>
                      <div>{t('admin.dashboard.clientManagement.city')}</div>
                      <div>{t('admin.dashboard.clientManagement.email')}</div>
                      <div>{t('admin.dashboard.clientManagement.phone')}</div>
                      <div>{t('admin.dashboard.clientManagement.plan')}</div>
                      <div>{t('admin.dashboard.clientManagement.expiration')}</div>
                      <div>{t('admin.dashboard.clientManagement.actions')}</div>
                    </div>
                    
                    {clientsLoading || plansLoading || subscriptionsLoading ? (
                      <div className="p-4">
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="grid grid-cols-8 gap-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {t('admin.dashboard.clientManagement.noClientsAvailable')}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {clients.map((client: Client) => {
                          // Trova l'abbonamento per questo cliente (se esiste)
                          const clientSubscription = subscriptions.find((sub: Subscription) => 
                            sub.userId === client.id
                          );
                          
                          // Trova il piano dell'abbonamento (se esiste)
                          const plan = clientSubscription ? plans.find((p: Plan) => 
                            p.id === clientSubscription.planId
                          ) : null;
                          
                          // Calcola giorni rimanenti alla scadenza
                          let daysRemaining = null;
                          if (clientSubscription?.endDate) {
                            const endDate = new Date(clientSubscription.endDate);
                            const today = new Date();
                            daysRemaining = differenceInDays(endDate, today);
                          }
                          
                          // Estrai la città dall'indirizzo
                          let city = "N/D";
                          if (client.address) {
                            // Semplice estrazione: assume che l'ultima parte dell'indirizzo sia la città
                            const addressParts = client.address.split(',');
                            if (addressParts.length > 0) {
                              city = addressParts[addressParts.length - 1].trim();
                            }
                          }
                          
                          return (
                            <div key={client.id} className="grid grid-cols-8 gap-2 p-3 items-center hover:bg-gray-50">
                              <div className="font-medium truncate">{client.name}</div>
                              <div className="text-sm text-gray-600">
                                {/* Settore cliente - al momento non abbiamo questo dato */}
                                {t('admin.dashboard.clientManagement.notAvailable')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {city}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {client.email || t('admin.dashboard.clientManagement.notAvailable')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {client.phone || t('admin.dashboard.clientManagement.notAvailable')}
                              </div>
                              <div>
                                {plan ? (
                                  <Badge variant="outline" className="bg-blue-50">
                                    {plan.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100">
                                    Nessun piano
                                  </Badge>
                                )}
                              </div>
                              <div>
                                {clientSubscription?.endDate ? (
                                  <div className="text-sm">
                                    <div>{format(new Date(clientSubscription.endDate), 'dd/MM/yyyy')}</div>
                                    <div className={`text-xs ${daysRemaining && daysRemaining < 7 ? 'text-red-500' : 'text-gray-500'}`}>
                                      {daysRemaining !== null ? `${daysRemaining} giorni rimanenti` : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">N/D</span>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleNavigation(`clients/${client.id}/plan`)}
                                  title="Impostazioni piano"
                                >
                                  <Award className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleNavigation(`clients/${client.id}`)}
                                  title="Modifica cliente"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Impostazioni Generali</CardTitle>
                  <CardDescription>
                    Gestisci le impostazioni generali dell'applicazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="cursor-pointer" onClick={() => handleNavigation("settings/sectors")}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Gestione Settori</CardTitle>
                        <CardDescription>
                          Crea e modifica i settori disponibili per i clienti
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => handleNavigation("settings/job-types")}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Tipi di Lavoro</CardTitle>
                        <CardDescription>
                          Gestisci i tipi di lavoro disponibili per ogni settore
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => handleNavigation("settings/activities")}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Attività</CardTitle>
                        <CardDescription>
                          Configura le attività associate ai tipi di lavoro
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => handleNavigation("settings/roles")}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Ruoli</CardTitle>
                        <CardDescription>
                          Gestisci i ruoli degli utenti e le relative autorizzazioni
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.settings.billingSystem')}</CardTitle>
                  <CardDescription>
                    {t('admin.settings.billingSystemDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between">
                      <div className="space-x-2">
                        <Button variant="outline">{t('admin.settings.filter')}</Button>
                        <Button variant="outline">{t('admin.settings.export')}</Button>
                      </div>
                      <Button onClick={() => handleNavigation("invoices/create")}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('admin.settings.newInvoice')}
                      </Button>
                    </div>
                    
                    <Tabs defaultValue="all">
                      <TabsList>
                        <TabsTrigger value="all">{t('admin.settings.all')}</TabsTrigger>
                        <TabsTrigger value="paid">{t('admin.settings.paid')}</TabsTrigger>
                        <TabsTrigger value="unpaid">{t('admin.settings.unpaid')}</TabsTrigger>
                        <TabsTrigger value="draft">{t('admin.settings.draft')}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all" className="mt-4">
                        <div className="border rounded-md">
                          <div className="bg-gray-50 p-3 border-b grid grid-cols-7 font-medium text-sm">
                            <div>{t('admin.settings.number')}</div>
                            <div>{t('admin.settings.client')}</div>
                            <div>{t('admin.settings.date')}</div>
                            <div>{t('admin.settings.dueDate')}</div>
                            <div>{t('admin.settings.amount')}</div>
                            <div>{t('admin.settings.status')}</div>
                            <div>{t('admin.settings.actions')}</div>
                          </div>
                          <div className="p-8 text-center text-gray-500">
                            {t('admin.settings.noInvoicesAvailable')}
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="paid" className="mt-4">
                        <div className="p-8 text-center text-gray-500">
                          {t('admin.settings.noPaidInvoices')}
                        </div>
                      </TabsContent>
                      <TabsContent value="unpaid" className="mt-4">
                        <div className="p-8 text-center text-gray-500">
                          {t('admin.settings.noUnpaidInvoices')}
                        </div>
                      </TabsContent>
                      <TabsContent value="draft" className="mt-4">
                        <div className="p-8 text-center text-gray-500">
                          {t('admin.settings.noDraftInvoices')}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.statistics.title')}</CardTitle>
                  <CardDescription>
                    {t('admin.statistics.detailedAnalysis')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t('admin.statistics.subscriptions')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48 bg-gray-100 flex items-center justify-center rounded-md">
                            <p className="text-gray-500">{t('admin.statistics.subscriptionTrend')}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t('admin.statistics.clientsBySector')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48 bg-gray-100 flex items-center justify-center rounded-md">
                            <p className="text-gray-500">{t('admin.statistics.sectorDistribution')}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Attività</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48 bg-gray-100 flex items-center justify-center rounded-md">
                            <p className="text-gray-500">Grafico Attività</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Analisi Temporale</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-100 flex items-center justify-center rounded-md">
                          <p className="text-gray-500">Grafico Temporale</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end">
                      <Button onClick={() => handleNavigation("statistics/export")}>Esporta Report Completo</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.users.userManagement')}</CardTitle>
                  <CardDescription>
                    {t('admin.users.userManagementDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-4">
                    <div className="space-x-2">
                      <Button variant="outline">
                        {t('admin.users.filter')}
                      </Button>
                      <Button variant="outline">
                        {t('admin.users.export')}
                      </Button>
                    </div>
                    <Button onClick={() => handleNavigation("administrators/create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('admin.users.newAdministrator')}
                    </Button>
                  </div>
                  
                  <Tabs defaultValue="all" className="mb-6">
                    <TabsList>
                      <TabsTrigger value="all">{t('admin.users.all')}</TabsTrigger>
                      <TabsTrigger value="admin">{t('admin.users.administrators')}</TabsTrigger>
                      <TabsTrigger value="registered">{t('admin.users.payingClients')}</TabsTrigger>
                      <TabsTrigger value="trial">{t('admin.users.trialClients')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="border rounded-md">
                    <div className="bg-gray-50 p-3 border-b grid grid-cols-6 font-medium text-sm">
                      <div>{t('admin.users.name')}</div>
                      <div>{t('admin.users.email')}</div>
                      <div>{t('admin.users.phone')}</div>
                      <div>{t('admin.users.userType')}</div>
                      <div>{t('admin.users.status')}</div>
                      <div>{t('admin.users.actions')}</div>
                    </div>
                    
                    {adminsLoading || subscriptionsLoading ? (
                      <div className="p-4">
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="grid grid-cols-6 gap-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : administrators.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {t('admin.users.noUsersAvailable')}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {administrators.map((user: User) => {
                          // Trova l'abbonamento per questo utente (se esiste)
                          const userSubscription = subscriptions.find((sub: Subscription) => 
                            sub.userId === user.id
                          );
                          
                          // Trova il piano dell'abbonamento (se esiste)
                          const plan = userSubscription && plans ? plans.find((p: Plan) => 
                            p.id === userSubscription.planId
                          ) : null;
                          
                          // Determina il tipo di utente
                          let userType = t('admin.users.administrator');
                          let userTypeColor = "bg-purple-100";
                          
                          if (user.type === "client") {
                            if (userSubscription && userSubscription.status === "trial") {
                              userType = t('admin.users.trialClient');
                              userTypeColor = "bg-yellow-100";
                            } else if (userSubscription && userSubscription.status === "active") {
                              userType = t('admin.users.payingClient');
                              userTypeColor = "bg-green-100";
                            } else {
                              userType = t('admin.users.client');
                              userTypeColor = "bg-blue-100";
                            }
                          } else if (user.type === "collaborator") {
                            userType = t('admin.users.collaborator');
                            userTypeColor = "bg-orange-100";
                          }
                          
                          // Determina lo stato dell'utente
                          const isActive = user.isActive !== false; // default a true se non specificato
                          
                          return (
                            <div key={user.id} className="grid grid-cols-6 gap-2 p-3 items-center hover:bg-gray-50">
                              <div className="font-medium truncate">{user.fullName || user.username}</div>
                              <div className="text-sm text-gray-600 truncate">
                                {user.email || 'N/D'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {user.phone || 'N/D'}
                              </div>
                              <div>
                                <Badge variant="outline" className={userTypeColor}>
                                  {userType}
                                </Badge>
                              </div>
                              <div>
                                <Badge variant={isActive ? "outline" : "secondary"} className={isActive ? "bg-green-50" : ""}>
                                  {isActive ? t('admin.users.active') : t('admin.users.inactive')}
                                </Badge>
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleNavigation(`administrators/${user.id}/edit`)}
                                  title="Modifica utente"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleNavigation(`administrators/${user.id}/password`)}
                                  title="Cambia password"
                                >
                                  <Key className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}