import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { ArrowLeft, User, Users, Briefcase, Activity, Wrench, Flag, Settings2, Building2, FileText, CreditCard, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../../../components/ui/language-selector";

export default function SettingsIndex() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  const settingsModules = [
    {
      id: "profile",
      title: t('admin.settings.modules.companyProfile.title'),
      description: t('admin.settings.modules.companyProfile.description'),
      icon: <Building2 size={36} className="text-primary mb-2" />,
      path: "/admin/settings/profile"
    },
    {
      id: "roles",
      title: t('admin.settings.modules.userRoles.title'),
      description: t('admin.settings.modules.userRoles.description'),
      icon: <Flag size={36} className="text-primary mb-2" />,
      path: "/admin/settings/roles"
    },
    {
      id: "sectors",
      title: t('admin.settings.modules.businessSectors.title'),
      description: t('admin.settings.modules.businessSectors.description'),
      icon: <Activity size={36} className="text-primary mb-2" />,
      path: "/admin/settings/sectors"
    },
    {
      id: "jobtypes",
      title: t('admin.settings.modules.jobTypes.title'),
      description: t('admin.settings.modules.jobTypes.description'),
      icon: <Briefcase size={36} className="text-primary mb-2" />,
      path: "/admin/settings/jobtypes"
    },
    {
      id: "activities",
      title: t('admin.settings.modules.activities.title'),
      description: t('admin.settings.modules.activities.description'),
      icon: <Wrench size={36} className="text-primary mb-2" />,
      path: "/admin/settings/activities"
    },
    {
      id: "invoice",
      title: t('admin.settings.modules.invoiceSettings.title'),
      description: t('admin.settings.modules.invoiceSettings.description'),
      icon: <FileText size={36} className="text-primary mb-2" />,
      path: "/admin/settings/invoice"
    },
    {
      id: "plans",
      title: t('admin.settings.modules.subscriptionPlans.title'),
      description: t('admin.settings.modules.subscriptionPlans.description'),
      icon: <CreditCard size={36} className="text-primary mb-2" />,
      path: "/admin/settings/plans"
    },
    {
      id: "client-plan-overrides",
      title: t('admin.settings.modules.clientPlanOverrides.title'),
      description: t('admin.settings.modules.clientPlanOverrides.description'),
      icon: <Users size={36} className="text-primary mb-2" />,
      path: "/admin/settings/client-plan-overrides"
    },
    {
      id: "web-pages",
      title: t('admin.settings.modules.webPages.title'),
      description: t('admin.settings.modules.webPages.description'),
      icon: <Globe size={36} className="text-primary mb-2" />,
      path: "/admin/settings/web-pages"
    },
    {
      id: "general",
      title: t('admin.settings.modules.generalSettings.title'),
      description: t('admin.settings.modules.generalSettings.description'),
      icon: <Settings2 size={36} className="text-primary mb-2" />,
      path: "/admin/settings/general"
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/admin/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('admin.settings.backDashboard')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.settings.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsModules.map((module) => (
          <Card 
            key={module.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setLocation(module.path)}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-col items-center">
                {module.icon}
                <CardTitle className="text-xl">{module.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {module.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.settings.guide.title')}</CardTitle>
            <CardDescription>
              {t('admin.settings.guide.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.companyProfile.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.companyProfile.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.roleManagement.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.roleManagement.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.workTypes.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.workTypes.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.billing.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.billing.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.subscriptionPlans.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.subscriptionPlans.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.notifications.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.notifications.description')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg">{t('admin.settings.guide.webPages.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('admin.settings.guide.webPages.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}