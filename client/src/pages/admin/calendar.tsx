import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, User, Plus } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useTranslation } from "react-i18next";

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Check if user has calendar permissions
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

  // Check if user has calendar permission - use same logic as dashboard
  const hasCalendarPermission = enabledFeatures.includes('calendar');

  // Fetch calendar events/jobs
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["/api/mobile/all-jobs"],
    queryFn: () => apiRequest("GET", "/api/mobile/all-jobs").then(res => res.json()),
    enabled: hasCalendarPermission,
    retry: false
  });

  // Filter jobs for calendar view (upcoming and scheduled)
  const calendarJobs = jobs.filter((job: any) => 
    job.status === 'scheduled' || 
    job.status === 'pending' || 
    (job.startDate && new Date(job.startDate) >= new Date())
  );

  if (!hasCalendarPermission) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                {t('common.back')} {t('artisanDashboard.title')}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t('calendar.noPermission')}
              </h3>
              <p className="text-yellow-700 mb-4">
                {t('calendar.noPermissionDescription')}
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
            <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => setLocation("/admin/jobs")} className="flex items-center gap-2">
              <Plus size={16} />
              {t('calendar.newEvent')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {jobsError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                {t('calendar.error')}
              </h3>
              <p className="text-red-700">
                {t('calendar.errorDescription')}
              </p>
            </CardContent>
          </Card>
        ) : calendarJobs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {t('calendar.noEvents')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('calendar.noEventsDescription')}
              </p>
              <Button onClick={() => setLocation("/admin/jobs")}>
                {t('calendar.createFirstEvent')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calendarJobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                    </div>
                    <Badge variant={job.status === 'scheduled' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.startDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(job.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.client && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{job.client.name}</span>
                      </div>
                    )}
                    {job.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {job.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
