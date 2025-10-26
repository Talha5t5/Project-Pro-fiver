import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { ArrowLeft, Settings, Bell, Shield, Palette, Globe, User } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../../components/ui/language-selector";

export default function UserSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Check if user has settings permissions
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

  // Check if user has settings permission
  const hasSettingsPermission = planFeatures.permissions?.['settings.view'] === true;

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  if (!hasSettingsPermission) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                {t('common.back')} {t('artisanDashboard.title')}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t('settings.noPermission')}
              </h3>
              <p className="text-yellow-700 mb-4">
                {t('settings.noPermissionDescription')}
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
            <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                {t('settings.general')}
              </CardTitle>
              <CardDescription>
                {t('settings.generalDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.language')}</Label>
                  <p className="text-sm text-gray-500">{t('settings.languageDescription')}</p>
                </div>
                <LanguageSelector />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.autoSave')}</Label>
                  <p className="text-sm text-gray-500">{t('settings.autoSaveDescription')}</p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                {t('settings.notifications')}
              </CardTitle>
              <CardDescription>
                {t('settings.notificationsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.pushNotifications')}</Label>
                  <p className="text-sm text-gray-500">{t('settings.pushNotificationsDescription')}</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.emailNotifications')}</Label>
                  <p className="text-sm text-gray-500">{t('settings.emailNotificationsDescription')}</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-600" />
                {t('settings.appearance')}
              </CardTitle>
              <CardDescription>
                {t('settings.appearanceDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('settings.darkMode')}</Label>
                  <p className="text-sm text-gray-500">{t('settings.darkModeDescription')}</p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-orange-600" />
                {t('settings.account')}
              </CardTitle>
              <CardDescription>
                {t('settings.accountDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('settings.username')}</Label>
                  <Input
                    id="username"
                    value={currentUser?.username || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
                  <Input
                    id="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">{t('settings.currentPlan')}</Label>
                <Input
                  id="plan"
                  value={currentPlan?.name || t('settings.noPlan')}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                toast({
                  title: t('settings.saved'),
                  description: t('settings.savedDescription'),
                });
              }}
              className="px-8"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
