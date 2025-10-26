import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Users, Briefcase, Euro, Calendar, Download } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useTranslation } from "react-i18next";

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Check if user has reports permissions
  const { data: currentUser } = useQuery({
    queryKey: ["/api/mobile/user"],
    queryFn: () => apiRequest("GET", "/api/mobile/user").then(res => res.json()),
    enabled: true
  });

  // Fetch user subscription and plan features (same as dashboard)
  const { data: userSubscription } = useQuery({
    queryKey: ["/api/mobile/user-subscription"],
    queryFn: () => apiRequest("GET", "/api/mobile/user-subscription").then(res => res.json()),
    enabled: true
  });

  const { data: subscriptionPlans } = useQuery({
    queryKey: ["/api/mobile/subscription-plans"],
    queryFn: () => apiRequest("GET", "/api/mobile/subscription-plans").then(res => res.json()),
    enabled: true
  });

  // Get current user's plan features (same logic as dashboard)
  const currentPlan = userSubscription ? 
    subscriptionPlans?.find((plan: any) => plan.id === userSubscription.planId) : null;
  
  const planFeatures = currentPlan ? JSON.parse(currentPlan.features || '{}') : {};
  const enabledFeatures = currentPlan ? Object.keys(planFeatures).filter(key => planFeatures[key] === true) : [];

  // Check if user has reports permission - use same logic as dashboard
  const hasReportsPermission = enabledFeatures.includes('reports');

  // Fetch data for reports
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ["/api/mobile/clients"],
    queryFn: () => apiRequest("GET", "/api/mobile/clients").then(res => res.json()),
    enabled: hasReportsPermission,
    retry: false
  });

  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["/api/mobile/all-jobs"],
    queryFn: () => apiRequest("GET", "/api/mobile/all-jobs").then(res => res.json()),
    enabled: hasReportsPermission,
    retry: false
  });

  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ["/api/mobile/invoices"],
    queryFn: () => apiRequest("GET", "/api/mobile/invoices").then(res => res.json()),
    enabled: hasReportsPermission,
    retry: false
  });

  // Calculate report data
  const reportData = {
    totalClients: clientsError ? 0 : clients.length,
    totalJobs: jobsError ? 0 : jobs.length,
    completedJobs: jobsError ? 0 : jobs.filter((job: any) => job.status === 'completed').length,
    activeJobs: jobsError ? 0 : jobs.filter((job: any) => 
      job.status === 'in_progress' || job.status === 'pending' || job.status === 'scheduled'
    ).length,
    totalRevenue: invoicesError ? 0 : invoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || 0), 0),
    monthlyRevenue: invoicesError ? 0 : invoices.filter((invoice: any) => {
      const invoiceDate = new Date(invoice.createdAt);
      const now = new Date();
      return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
    }).reduce((sum: number, invoice: any) => sum + (invoice.amount || 0), 0),
  };

  if (!hasReportsPermission) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                {t('common.back')} {t('artisanDashboard.title')}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t('reports.noPermission')}
              </h3>
              <p className="text-yellow-700 mb-4">
                {t('reports.noPermissionDescription')}
              </p>
              <Button onClick={() => setLocation("/admin/artisan-dashboard")}>
                {t('common.backToDashboard')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")} className="flex items-center gap-2">
              <ArrowLeft size={16} />
              {t('common.back')} {t('artisanDashboard.title')}
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Download size={16} />
              {t('reports.export')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reports.totalClients')}</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totalClients}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reports.totalJobs')}</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totalJobs}</p>
                </div>
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reports.completedJobs')}</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.completedJobs}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('reports.totalRevenue')}</p>
                  <p className="text-2xl font-bold text-gray-900">€{reportData.totalRevenue.toFixed(2)}</p>
                </div>
                <Euro className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jobs Status Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-green-600" />
                {t('reports.jobsStatus')}
              </CardTitle>
              <CardDescription>
                {t('reports.jobsStatusDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.activeJobs')}</span>
                  <Badge variant="default">{reportData.activeJobs}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.completedJobs')}</span>
                  <Badge variant="secondary">{reportData.completedJobs}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.totalJobs')}</span>
                  <Badge variant="outline">{reportData.totalJobs}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-orange-600" />
                {t('reports.revenue')}
              </CardTitle>
              <CardDescription>
                {t('reports.revenueDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.monthlyRevenue')}</span>
                  <span className="font-semibold">€{reportData.monthlyRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.totalRevenue')}</span>
                  <span className="font-semibold">€{reportData.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reports.invoices')}</span>
                  <Badge variant="outline">{invoicesError ? 0 : invoices.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Messages */}
        {(clientsError || jobsError || invoicesError) && (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                {t('reports.dataError')}
              </h3>
              <p className="text-red-700">
                {t('reports.dataErrorDescription')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
