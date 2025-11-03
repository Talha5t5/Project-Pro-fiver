import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, Settings, PieChart, FileText, CreditCard, User, Calendar, Award, Briefcase, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Badge } from "../../components/ui/badge";
import { LanguageSelector } from "../../components/ui/language-selector";
import { useTranslation } from "react-i18next";
import { useArtisanPermissions } from "../../hooks/useArtisanPermissions";
import { useToast } from "../../hooks/use-toast";


export default function ArtisanDashboard() {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  
  // Debug: Check if mobileSessionId exists
  useEffect(() => {
    const sessionId = localStorage.getItem('mobileSessionId');
    console.log('🔍 Dashboard loaded - mobileSessionId from localStorage:', sessionId);
    if (!sessionId) {
      console.warn('⚠️ No mobile session found! Redirecting to login...');
      setLocation('/artisan/login');
    }
  }, [setLocation]);
  
  // Get permissions using the hook (same as mobile app)
  const {
    permissions,
    features,
    planConfig,
    isLoading: permissionsLoading,
    canViewClients,
    canViewJobs,
    canManageCollaborators,
    canManageInvoices,
    canViewReports,
    canViewCalendar,
    canViewSettings,
  } = useArtisanPermissions();
  
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

  // Fetch user subscription and plan features (for display purposes)
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/mobile/user-subscription"],
    queryFn: () => apiRequest("GET", "/api/mobile/user-subscription").then(res => res.json()),
    enabled: true
  });

  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/mobile/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/mobile/subscription-plans").then(res => res.json()),
    enabled: true
  });

  // Get current user's plan features (for display)
  const currentPlan = userSubscription ? 
    subscriptionPlans?.find((plan: any) => plan.id === userSubscription.planId) : null;
  
  const planFeatures = currentPlan ? JSON.parse(currentPlan.features || '{}') : {};

  // Get enabled features based on plan (for display)
  const enabledFeatures = currentPlan ? Object.keys(planFeatures).filter(key => 
    key !== 'permissions' && planFeatures[key] === true
  ) : [];

  // Get current user data
  const { data: currentUser } = useQuery({
    queryKey: ["/api/mobile/user"],
    queryFn: () => apiRequest("GET", "/api/mobile/user").then(res => res.json()),
    enabled: true
  });

  // Navigation handler - use artisan paths
  const handleNavigation = (path: string) => {
    setLocation(`/artisan/${path}`);
  };

  // Real data from API calls - ONLY fetch if user has permission
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ["/api/mobile/clients"],
    queryFn: () => apiRequest("GET", "/api/mobile/clients").then(res => res.json()),
    enabled: canViewClients && !permissionsLoading,
    retry: false
  });

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["/api/mobile/all-jobs"],
    queryFn: () => apiRequest("GET", "/api/mobile/all-jobs").then(res => res.json()),
    enabled: canViewJobs && !permissionsLoading,
    retry: false
  });

  const { data: collaborators, isLoading: collaboratorsLoading, error: collaboratorsError } = useQuery({
    queryKey: ["/api/mobile/collaborators"],
    queryFn: () => apiRequest("GET", "/api/mobile/collaborators").then(res => res.json()),
    enabled: canManageCollaborators && !permissionsLoading,
    retry: false
  });

  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/mobile/invoices"],
    queryFn: () => apiRequest("GET", "/api/mobile/invoices").then(res => res.json()),
    enabled: canManageInvoices && !permissionsLoading,
    retry: false
  });

  // Calculate real stats from API data - handle errors gracefully
  const realStats = {
    totalClients: clientsError ? 0 : (clients?.length || 0),
    activeJobs: jobsError ? 0 : (jobs?.filter((job: any) => 
      job.status === 'in_progress' || 
      job.status === 'pending' || 
      job.status === 'scheduled' || 
      job.status === 'active'
    )?.length || 0),
    completedJobs: jobsError ? 0 : (jobs?.filter((job: any) => job.status === 'completed')?.length || 0),
    monthlyRevenue: invoicesError ? 0 : (invoices?.filter((invoice: any) => {
      const invoiceDate = new Date(invoice.createdAt);
      const now = new Date();
      return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
    })?.reduce((sum: number, invoice: any) => sum + invoice.amount, 0) || 0),
    pendingInvoices: invoicesError ? 0 : (invoices?.filter((invoice: any) => invoice.status === 'pending')?.length || 0),
    totalCollaborators: collaboratorsError ? 0 : (collaborators?.length || 0)
  };



  // Get recent data from API - handle errors gracefully
  const recentJobs = jobsError ? [] : (jobs?.slice(0, 3) || []);
  const recentClients = clientsError ? [] : (clients?.slice(0, 3) || []);

  // Debug logging
  console.log('Dashboard Debug:', {
    userSubscription,
    subscriptionPlans,
    currentPlan,
    planFeatures,
    enabledFeatures,
    permissions,
    features,
    canViewClients,
    canViewJobs,
    canManageCollaborators,
    canManageInvoices,
    canViewReports,
    canViewCalendar,
    canViewSettings,
    currentUser,
    clientsError,
    jobsError,
    collaboratorsError,
    invoicesError,
    realStats
  });

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('artisanDashboard.title')}</h1>
              {currentUser && (
                <p className="text-sm text-gray-600 mt-1">
                  Welcome, <span className="font-semibold text-blue-600">{currentUser.fullName || currentUser.username}</span>
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-sm">
              {t('artisanDashboard.subtitle')}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <Button variant="outline" onClick={() => setLocation("/artisan/logout")}>
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
                {t('artisanDashboard.currentPlan')}: {currentPlan.name || `Plan ${userSubscription?.planId || 'Unknown'}`}
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
                    {currentPlan.isActive ? t('artisanDashboard.active') : t('artisanDashboard.inactive')}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">{t('artisanDashboard.type')}</p>
                  <Badge variant={currentPlan.isFree ? "outline" : "default"}>
                    {currentPlan.isFree ? t('artisanDashboard.free') : t('artisanDashboard.paid')}
                  </Badge>
                </div>
              </div>
              
              {/* Feature Status */}
              <div className="mt-4 pt-4 border-t">
                <p className="font-medium mb-2">{t('artisanDashboard.enabledFeatures')}:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {enabledFeatures.length > 0 ? (
                    enabledFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          ✓
                        </Badge>
                        <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-gray-500 py-2">
                      No features enabled for this plan
                    </div>
                  )}
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
          {/* Clients - Based on permissions */}
          {canViewClients && (
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
          )}

          {/* Jobs - Based on permissions */}
          {canViewJobs && (
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

          {/* Revenue - Based on permissions */}
          {canManageInvoices && (
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

          {/* Collaborators - Based on permissions */}
          {canManageCollaborators && (
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
              {/* Clients - Based on permissions */}
              {canViewClients && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("clients")}>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-medium">{t('clients.title')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageClients')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Jobs - Based on permissions */}
              {canViewJobs && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("jobs")}>
                  <CardContent className="p-4 text-center">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">{t('jobs.title')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageJobs')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Collaborators - Based on permissions */}
              {canManageCollaborators && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("collaborators")}>
                  <CardContent className="p-4 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="font-medium">{t('artisanDashboard.collaborators')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageTeam')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Invoices - Based on permissions */}
              {canManageInvoices && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("invoices")}>
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="font-medium">{t('artisanDashboard.invoices')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.manageInvoicing')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Calendar - Based on permissions */}
              {canViewCalendar && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("calendar")}>
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <p className="font-medium">{t('artisanDashboard.calendar')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.scheduleActivities')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Reports - Based on permissions */}
              {canViewReports && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("reports")}>
                  <CardContent className="p-4 text-center">
                    <PieChart className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                    <p className="font-medium">{t('artisanDashboard.reports')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.analyticsAndStats')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Settings - Based on permissions */}
              {canViewSettings && (
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigation("settings")}>
                  <CardContent className="p-4 text-center">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <p className="font-medium">{t('artisanDashboard.settings')}</p>
                    <p className="text-sm text-gray-500">{t('artisanDashboard.configureSystem')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs - Based on permissions */}
          {canViewJobs && (
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

          {/* Recent Clients - Based on permissions */}
          {canViewClients && (
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
          )}
        </div>
      </div>
    </div>
  );
} 