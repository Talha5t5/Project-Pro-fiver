import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Users, Settings, PieChart, FileText, CreditCard, User, Calendar, Edit, Award, Key, Briefcase, Phone, Loader2 } from "lucide-react";
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

// Types for Artisan Dashboard
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

type Job = {
  id: number;
  title: string;
  status: string;
  clientId: number;
  startDate: Date;
  endDate: Date | null;
  priority: string;
  description: string | null;
};

type Collaborator = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
};

type Invoice = {
  id: number;
  number: string;
  clientId: number;
  amount: number;
  status: string;
  dueDate: Date;
  createdAt: Date;
};

export default function ArtisanDashboard() {
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

  // Fetch user subscription and plan features
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/user-subscriptions"],
    queryFn: () => apiRequest("GET", "/api/user-subscriptions").then(res => res.json()),
    enabled: true
  });

  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/subscription-plans").then(res => res.json()),
    enabled: true
  });

  // Get current user's plan features
  const currentPlan = userSubscription?.[0] ? 
    subscriptionPlans?.find((plan: any) => plan.id === userSubscription[0].planId) : null;
  
  const planFeatures = currentPlan ? JSON.parse(currentPlan.features || '{}') : {};

  // Navigation handler
  const handleNavigation = (path: string) => {
    setLocation(`/admin/${path}`);
  };

  // Real data from API calls
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(res => res.json()),
    enabled: true
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(res => res.json()),
    enabled: true
  });

  const { data: collaborators, isLoading: collaboratorsLoading } = useQuery({
    queryKey: ["/api/collaborators"],
    queryFn: () => apiRequest("GET", "/api/collaborators").then(res => res.json()),
    enabled: true
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: () => apiRequest("GET", "/api/invoices").then(res => res.json()),
    enabled: true
  });

  // Calculate real stats from API data
  const realStats = {
    totalClients: clients?.length || 0,
    activeJobs: jobs?.filter((job: any) => 
      job.status === 'in_progress' || 
      job.status === 'pending' || 
      job.status === 'scheduled' || 
      job.status === 'active'
    )?.length || 0,
    completedJobs: jobs?.filter((job: any) => job.status === 'completed')?.length || 0,
    monthlyRevenue: invoices?.filter((invoice: any) => {
      const invoiceDate = new Date(invoice.createdAt);
      const now = new Date();
      return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
    })?.reduce((sum: number, invoice: any) => sum + invoice.amount, 0) || 0,
    pendingInvoices: invoices?.filter((invoice: any) => invoice.status === 'pending')?.length || 0,
    totalCollaborators: collaborators?.length || 0
  };



  // Get recent data from API
  const recentJobs = jobs?.slice(0, 3) || [];
  const recentClients = clients?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('artisanDashboard.title')}</h1>
            <Badge variant="secondary" className="text-sm">
              {t('artisanDashboard.subtitle')}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <Button variant="outline" onClick={() => setLocation("/admin/logout")}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Plan Information */}
        {subscriptionLoading || plansLoading ? (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            </CardContent>
          </Card>
        ) : currentPlan ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                {t('artisanDashboard.currentPlan')}: {currentPlan.name}
              </CardTitle>
              <CardDescription>
                {currentPlan.description || t('artisanDashboard.planForSmallBusinesses')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">{t('artisanDashboard.monthlyPrice')}</p>
                  <p className="text-gray-600">€{currentPlan.monthlyPrice}</p>
                </div>
                <div>
                  <p className="font-medium">{t('artisanDashboard.annualPrice')}</p>
                  <p className="text-gray-600">€{currentPlan.yearlyPrice}</p>
                </div>
                <div>
                  <p className="font-medium">{t('artisanDashboard.status')}</p>
                  <Badge variant={currentPlan.isActive ? "default" : "secondary"}>
                    {currentPlan.isActive ? t('artisanDashboard.active') : "Inattivo"}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">{t('artisanDashboard.type')}</p>
                  <Badge variant={currentPlan.isFree ? "outline" : "default"}>
                    {currentPlan.isFree ? "Gratuito" : t('artisanDashboard.paid')}
                  </Badge>
                </div>
              </div>
              
              {/* Feature Status */}
              <div className="mt-4 pt-4 border-t">
                <p className="font-medium mb-2">{t('artisanDashboard.enabledFeatures')}:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={planFeatures.collaborators !== false ? "default" : "secondary"} className="text-xs">
                      {planFeatures.collaborators !== false ? "✓" : "✗"}
                    </Badge>
                    <span>{t('artisanDashboard.collaborators')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={planFeatures.jobActivities !== false ? "default" : "secondary"} className="text-xs">
                      {planFeatures.jobActivities !== false ? "✓" : "✗"}
                    </Badge>
                    <span>{t('artisanDashboard.jobManagement')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={planFeatures.invoicing !== false ? "default" : "secondary"} className="text-xs">
                      {planFeatures.invoicing !== false ? "✓" : "✗"}
                    </Badge>
                    <span>{t('artisanDashboard.invoicing')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={planFeatures.reporting !== false ? "default" : "secondary"} className="text-xs">
                      {planFeatures.reporting !== false ? "✓" : "✗"}
                    </Badge>
                    <span>{t('artisanDashboard.reports')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={planFeatures.settings !== false ? "default" : "secondary"} className="text-xs">
                      {planFeatures.settings !== false ? "✓" : "✗"}
                    </Badge>
                    <span>{t('artisanDashboard.settings')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Award className="h-5 w-5" />
                <span className="font-medium">{t('artisanDashboard.noActivePlan')}</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Contatta l'amministratore per attivare un piano
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Clients - Always visible */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('artisanDashboard.totalClients')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clientsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  realStats.totalClients
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {clientsLoading ? t('common.loading') : `+2 ${t('artisanDashboard.thisMonth')}`}
              </p>
            </CardContent>
          </Card>

          {/* Jobs - Based on plan features */}
          {planFeatures.jobActivities !== false && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('artisanDashboard.activeJobs')}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {jobsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    realStats.activeJobs
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {jobsLoading ? t('common.loading') : t('artisanDashboard.inProgress')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Revenue - Based on plan features */}
          {planFeatures.invoicing !== false && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('artisanDashboard.monthlyRevenue')}</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {invoicesLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    `€${realStats.monthlyRevenue.toLocaleString()}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoicesLoading ? t('common.loading') : `+12% ${t('artisanDashboard.comparedToLastMonth')}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Collaborators - Based on plan features */}
          {planFeatures.collaborators !== false && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('artisanDashboard.collaboratorsActive')}</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {collaboratorsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    realStats.totalCollaborators
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {collaboratorsLoading ? t('common.loading') : t('artisanDashboard.active')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation Menu */}
        <Card className="mb-8">
          <CardHeader>
                      <CardTitle className="text-lg font-semibold">{t('artisanDashboard.mainMenu')}</CardTitle>
          <CardDescription>
            {t('artisanDashboard.mainMenuDescription')}
          </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Clients - Always available */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("clients")}>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium">{t('clients.title')}</p>
                  <p className="text-sm text-gray-500">{t('artisanDashboard.manageClients')}</p>
                </CardContent>
              </Card>

              {/* Jobs - Based on plan features */}
              {planFeatures.jobActivities !== false && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("jobs")}>
                  <CardContent className="p-4 text-center">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">{t('jobs.title')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageJobs')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Collaborators - Based on plan features */}
              {planFeatures.collaborators !== false && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("collaborators")}>
                  <CardContent className="p-4 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="font-medium">{t('artisanDashboard.collaborators')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageTeam')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Invoices - Based on plan features */}
              {planFeatures.invoicing !== false && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("invoices")}>
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="font-medium">Fatture</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageInvoicing')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Calendar - Always available */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("calendar")}>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <p className="font-medium">Calendario</p>
                  <p className="text-sm text-gray-500">Pianifica attività</p>
                </CardContent>
              </Card>

              {/* Reports - Based on plan features */}
              {planFeatures.reporting !== false && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("reports")}>
                  <CardContent className="p-4 text-center">
                    <PieChart className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                    <p className="font-medium">Report</p>
                    <p className="text-sm text-gray-500">Analisi e statistiche</p>
                  </CardContent>
                </Card>
              )}

              {/* Settings - Based on plan features */}
              {planFeatures.settings !== false && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("settings")}>
                  <CardContent className="p-4 text-center">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <p className="font-medium">{t('artisanDashboard.settings')}</p>
                    <p className="text-sm text-gray-500">Configura sistema</p>
                  </CardContent>
                </Card>
              )}

              {/* Profile - Always available */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("profile")}>
                <CardContent className="p-4 text-center">
                  <Award className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="font-medium">Profilo</p>
                  <p className="text-sm text-gray-500">Dati aziendali</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs - Based on plan features */}
          {planFeatures.jobActivities !== false && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {t('artisanDashboard.recentJobs')}
                </CardTitle>
                <CardDescription>
                  {t('artisanDashboard.recentJobsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>{t('common.loading')}</p>
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('artisanDashboard.noRecentJobs')}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {recentJobs.map((job: any) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{job.title || 'Untitled Job'}</p>
                            <p className="text-sm text-gray-500">
                              {typeof job.client === 'object' ? job.client.name : job.client || 'No Client'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              job.status === 'completed' ? 'default' : 
                              job.status === 'in_progress' ? 'secondary' : 
                              job.status === 'scheduled' ? 'secondary' :
                              job.status === 'active' ? 'secondary' : 'outline'
                            }>
                              {job.status === 'completed' ? t('jobs.statuses.completed') : 
                               job.status === 'in_progress' ? t('jobs.statuses.in_progress') : 
                               job.status === 'scheduled' ? t('jobs.statuses.scheduled') :
                               job.status === 'active' ? t('jobs.statuses.active') :
                               job.status === 'pending' ? t('jobs.statuses.pending') : job.status}
                            </Badge>
                            <Badge variant={job.priority === 'high' ? 'destructive' : job.priority === 'medium' ? 'secondary' : 'outline'}>
                              {job.priority === 'high' ? t('jobs.priorities.high') : job.priority === 'medium' ? t('jobs.priorities.medium') : t('jobs.priorities.low')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => handleNavigation("jobs")}>
                      {t('artisanDashboard.viewAll')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('clients.title')}
              </CardTitle>
              <CardDescription>
                {t('artisanDashboard.recentClientsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>{t('common.loading')}</p>
                </div>
              ) : recentClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('artisanDashboard.noRecentClients')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {recentClients.map((client: any) => (
                      <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{client.name || 'Unnamed Client'}</p>
                          <p className="text-sm text-gray-500">{client.email || t('clients.noEmail')}</p>
                        </div>
                        <Badge variant="outline">
                          {client.type === 'residential' ? t('clients.types.residential') : 
                           client.type === 'commercial' ? t('clients.types.commercial') : 
                           client.type === 'industrial' ? t('clients.types.industrial') : client.type || 'Unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => handleNavigation("clients")}>
                    {t('artisanDashboard.viewAll')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 