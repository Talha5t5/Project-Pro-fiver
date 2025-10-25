import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  PieChart,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdvancedCharts from '../../components/analytics/AdvancedCharts';

interface AnalyticsData {
  planUsage: {
    totalPlans: number;
    activePlans: number;
    planDistribution: Array<{
      planName: string;
      userCount: number;
      percentage: number;
      averageUsage: number;
    }>;
    mostPopularFeatures: string[];
    leastUsedFeatures: string[];
  };
  userBehavior: {
    totalUsers: number;
    activeUsers: number;
    mostUsedFeatures: Array<{
      featureName: string;
      usageCount: number;
      uniqueUsers: number;
      averageUsagePerUser: number;
    }>;
    featureAdoptionRate: Array<{
      featureName: string;
      totalUsers: number;
      adoptedUsers: number;
      adoptionRate: number;
    }>;
    monthlyUserGrowth: Array<{
      month: string;
      totalUsers: number;
      activeUsers: number;
      newUsers: number;
    }>;
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    planRevenueBreakdown: Array<{
      planName: string;
      monthlyRevenue: number;
      yearlyRevenue: number;
      userCount: number;
      totalRevenue: number;
    }>;
    averageRevenuePerUser: number;
  };
  systemPerformance: {
    systemUptime: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    dailyMetrics: Array<{
      date: string;
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      uptime: number;
    }>;
  };
  featureAnalytics: {
    monthlyFeatureUsage: Array<{
      month: string;
      totalUsage: number;
      features: {
        clientManagement: number;
        jobManagement: number;
        collaboratorManagement: number;
        invoiceGeneration: number;
        activityTracking: number;
        materialsInventory: number;
      };
    }>;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800">
                {t('analytics.error.title', 'Error Loading Analytics')}
              </h3>
              <p className="text-red-600 mt-2">
                {t('analytics.error.message', 'Failed to load analytics data. Please try again.')}
              </p>
              <Button 
                onClick={() => refetch()} 
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('analytics.error.retry', 'Retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const { planUsage, userBehavior, revenueMetrics, systemPerformance, featureAnalytics } = analyticsData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('analytics.title', 'Analytics Dashboard')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('analytics.subtitle', 'Monitor your system performance, user behavior, and revenue metrics')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSensitiveData ? t('analytics.hideSensitive', 'Hide Sensitive') : t('analytics.showSensitive', 'Show Sensitive')}
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('analytics.refresh', 'Refresh')}
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            {t('analytics.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.metrics.totalPlans', 'Total Plans')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planUsage.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {planUsage.activePlans} {t('analytics.metrics.active', 'active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.metrics.totalUsers', 'Total Users')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userBehavior.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userBehavior.activeUsers} {t('analytics.metrics.active', 'active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.metrics.monthlyRevenue', 'Monthly Revenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${showSensitiveData ? revenueMetrics.monthlyRecurringRevenue.toFixed(2) : '***'}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.metrics.recurring', 'recurring')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.metrics.systemUptime', 'System Uptime')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemPerformance.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">
              {t('analytics.metrics.uptime', 'uptime')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            {t('analytics.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="plans">
            {t('analytics.tabs.plans', 'Plans')}
          </TabsTrigger>
          <TabsTrigger value="users">
            {t('analytics.tabs.users', 'Users')}
          </TabsTrigger>
          <TabsTrigger value="revenue">
            {t('analytics.tabs.revenue', 'Revenue')}
          </TabsTrigger>
          <TabsTrigger value="charts">
            {t('analytics.tabs.charts', 'Advanced Charts')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.overview.planDistribution', 'Plan Distribution')}</CardTitle>
                <CardDescription>
                  {t('analytics.overview.planDistributionDesc', 'How users are distributed across different plans')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {planUsage.planDistribution.map((plan, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{plan.planName}</span>
                      <span className="text-sm text-muted-foreground">
                        {plan.userCount} {t('analytics.overview.users', 'users')} ({plan.percentage}%)
                      </span>
                    </div>
                    <Progress value={plan.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Feature Usage */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.overview.featureUsage', 'Feature Usage')}</CardTitle>
                <CardDescription>
                  {t('analytics.overview.featureUsageDesc', 'Most and least used features')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    {t('analytics.overview.mostPopular', 'Most Popular')}
                  </h4>
                  <div className="space-y-2">
                    {planUsage.mostPopularFeatures.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    {t('analytics.overview.leastUsed', 'Least Used')}
                  </h4>
                  <div className="space-y-2">
                    {planUsage.leastUsedFeatures.map((feature, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.plans.detailedAnalysis', 'Detailed Plan Analysis')}</CardTitle>
              <CardDescription>
                {t('analytics.plans.detailedAnalysisDesc', 'Comprehensive breakdown of plan performance')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('analytics.plans.planName', 'Plan Name')}</th>
                      <th className="text-left p-2">{t('analytics.plans.users', 'Users')}</th>
                      <th className="text-left p-2">{t('analytics.plans.percentage', 'Percentage')}</th>
                      <th className="text-left p-2">{t('analytics.plans.avgUsage', 'Avg Usage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planUsage.planDistribution.map((plan, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{plan.planName}</td>
                        <td className="p-2">{plan.userCount}</td>
                        <td className="p-2">{plan.percentage}%</td>
                        <td className="p-2">{plan.averageUsage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Adoption */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.users.featureAdoption', 'Feature Adoption')}</CardTitle>
                <CardDescription>
                  {t('analytics.users.featureAdoptionDesc', 'How quickly users adopt new features')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userBehavior.featureAdoptionRate.slice(0, 5).map((feature, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.featureName}</span>
                      <span className="text-sm text-muted-foreground">
                        {feature.adoptionRate}%
                      </span>
                    </div>
                    <Progress value={feature.adoptionRate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Most Used Features */}
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.users.mostUsedFeatures', 'Most Used Features')}</CardTitle>
                <CardDescription>
                  {t('analytics.users.mostUsedFeaturesDesc', 'Features with highest usage rates')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userBehavior.mostUsedFeatures.slice(0, 5).map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{feature.featureName}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{feature.usageCount}</div>
                      <div className="text-xs text-muted-foreground">
                        {feature.uniqueUsers} {t('analytics.users.uniqueUsers', 'unique users')}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.revenue.breakdown', 'Revenue Breakdown')}</CardTitle>
              <CardDescription>
                {t('analytics.revenue.breakdownDesc', 'Detailed revenue analysis by plan')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('analytics.revenue.planName', 'Plan Name')}</th>
                      <th className="text-left p-2">{t('analytics.revenue.users', 'Users')}</th>
                      <th className="text-left p-2">{t('analytics.revenue.monthly', 'Monthly')}</th>
                      <th className="text-left p-2">{t('analytics.revenue.yearly', 'Yearly')}</th>
                      <th className="text-left p-2">{t('analytics.revenue.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueMetrics.planRevenueBreakdown.map((plan, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{plan.planName}</td>
                        <td className="p-2">{plan.userCount}</td>
                        <td className="p-2">
                          ${showSensitiveData ? plan.monthlyRevenue.toFixed(2) : '***'}
                        </td>
                        <td className="p-2">
                          ${showSensitiveData ? plan.yearlyRevenue.toFixed(2) : '***'}
                        </td>
                        <td className="p-2">
                          ${showSensitiveData ? plan.totalRevenue.toFixed(2) : '***'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {t('analytics.revenue.totalRevenue', 'Total Revenue')}
                    </div>
                    <div className="text-2xl font-bold">
                      ${showSensitiveData ? revenueMetrics.totalRevenue.toFixed(2) : '***'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {t('analytics.revenue.monthlyRecurring', 'Monthly Recurring')}
                    </div>
                    <div className="text-2xl font-bold">
                      ${showSensitiveData ? revenueMetrics.monthlyRecurringRevenue.toFixed(2) : '***'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {t('analytics.revenue.avgPerUser', 'Avg per User')}
                    </div>
                    <div className="text-2xl font-bold">
                      ${showSensitiveData ? revenueMetrics.averageRevenuePerUser.toFixed(2) : '***'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          <AdvancedCharts
            planDistribution={planUsage.planDistribution.map(plan => ({
              name: plan.planName,
              value: plan.userCount
            }))}
            revenueData={revenueMetrics.planRevenueBreakdown.map(plan => ({
              name: plan.planName,
              value: plan.totalRevenue,
              monthlyRevenue: plan.monthlyRevenue,
              yearlyRevenue: plan.yearlyRevenue,
              userCount: plan.userCount
            }))}
            userGrowthData={userBehavior.monthlyUserGrowth.map((month, index) => ({
              name: month.month,
              value: month.totalUsers,
              totalUsers: month.totalUsers,
              activeUsers: month.activeUsers,
              newUsers: month.newUsers
            }))}
            featureUsageData={featureAnalytics.monthlyFeatureUsage.map((month, index) => ({
              name: month.month,
              value: month.totalUsage,
              clientManagement: month.features.clientManagement || 0,
              jobManagement: month.features.jobManagement || 0,
              collaboratorManagement: month.features.collaboratorManagement || 0,
              invoiceGeneration: month.features.invoiceGeneration || 0,
              activityTracking: month.features.activityTracking || 0,
              materialsInventory: month.features.materialsInventory || 0
            }))}
            systemPerformanceData={systemPerformance.dailyMetrics.map((day, index) => ({
              name: day.date,
              value: day.totalRequests,
              requests: day.totalRequests,
              responseTime: day.avgResponseTime,
              errorRate: day.errorRate,
              uptime: day.uptime
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard; 