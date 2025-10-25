import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector, MobileLanguageSelector } from '../components/ui/language-selector';
import { initializeLanguage, getCurrentLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// Initialize language on component mount
initializeLanguage();

export default function LanguageTestPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('dashboard.welcome')}</h1>
            <p className="text-muted-foreground">
              {t('planConfiguration.description')}
            </p>
          </div>
          <LanguageSelector />
        </div>

        {/* Language Test Sections */}
        <Tabs defaultValue="common" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="common">{t('common.title')}</TabsTrigger>
            <TabsTrigger value="auth">{t('auth.login')}</TabsTrigger>
            <TabsTrigger value="jobs">{t('jobs.title')}</TabsTrigger>
            <TabsTrigger value="admin">{t('admin.title')}</TabsTrigger>
            <TabsTrigger value="mobile">{t('mobile.title')}</TabsTrigger>
            <TabsTrigger value="settings">{t('settings.title')}</TabsTrigger>
          </TabsList>

          {/* Common Terms */}
          <TabsContent value="common">
            <Card>
              <CardHeader>
                <CardTitle>{t('common.title')} - Common Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline">{t('common.save')}</Button>
                  <Button variant="outline">{t('common.cancel')}</Button>
                  <Button variant="outline">{t('common.edit')}</Button>
                  <Button variant="outline">{t('common.delete')}</Button>
                  <Button variant="outline">{t('common.create')}</Button>
                  <Button variant="outline">{t('common.update')}</Button>
                  <Button variant="outline">{t('common.close')}</Button>
                  <Button variant="outline">{t('common.confirm')}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication */}
          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.login')} - Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.email')}</label>
                    <input type="email" className="w-full p-2 border rounded" placeholder={t('auth.email')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.password')}</label>
                    <input type="password" className="w-full p-2 border rounded" placeholder={t('auth.password')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.username')}</label>
                    <input type="text" className="w-full p-2 border rounded" placeholder={t('auth.username')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.fullName')}</label>
                    <input type="text" className="w-full p-2 border rounded" placeholder={t('auth.fullName')} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button>{t('auth.login')}</Button>
                  <Button variant="outline">{t('auth.register')}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>{t('jobs.title')} - Job Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.jobTitle')}</label>
                    <input type="text" className="w-full p-2 border rounded" placeholder={t('jobs.jobTitle')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.jobType')}</label>
                    <select className="w-full p-2 border rounded">
                      <option>{t('jobs.jobType')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.client')}</label>
                    <select className="w-full p-2 border rounded">
                      <option>{t('jobs.client')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.location')}</label>
                    <input type="text" className="w-full p-2 border rounded" placeholder={t('jobs.location')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.materialCost')}</label>
                    <input type="number" className="w-full p-2 border rounded" placeholder={t('jobs.materialCost')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('jobs.photos')}</label>
                    <input type="file" className="w-full p-2 border rounded" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button>{t('jobs.newJob')}</Button>
                  <Button variant="outline">{t('jobs.editJob')}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.title')} - Administration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">{t('admin.planSettings')}</h3>
                    <p className="text-sm text-muted-foreground">{t('planConfiguration.availableFeaturesDesc')}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{t('admin.advancedConfigurations')}</h3>
                    <p className="text-sm text-muted-foreground">{t('planConfiguration.pageAccessDesc')}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{t('admin.entityManagement')}</h3>
                    <ul className="text-sm space-y-1">
                      <li>• {t('admin.clientManagement')}</li>
                      <li>• {t('admin.jobManagement')}</li>
                      <li>• {t('admin.collaboratorManagement')}</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{t('admin.operationalTools')}</h3>
                    <ul className="text-sm space-y-1">
                      <li>• {t('admin.activityMonitoring')}</li>
                      <li>• {t('admin.reports')}</li>
                      <li>• {t('admin.statistics')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile */}
          <TabsContent value="mobile">
            <Card>
              <CardHeader>
                <CardTitle>{t('mobile.title')} - Mobile Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline">{t('mobile.home')}</Button>
                  <Button variant="outline">{t('mobile.jobs')}</Button>
                  <Button variant="outline">{t('mobile.activities')}</Button>
                  <Button variant="outline">{t('mobile.calendar')}</Button>
                  <Button variant="outline">{t('mobile.profile')}</Button>
                  <Button variant="outline">{t('mobile.settings')}</Button>
                  <Button variant="outline">{t('mobile.addPhoto')}</Button>
                  <Button variant="outline">{t('mobile.takePhoto')}</Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('mobile.allowedFormats')}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.title')} - Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">{t('settings.language')}</h3>
                  <MobileLanguageSelector />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.companyName')}</label>
                    <input type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.vatNumber')}</label>
                    <input type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.address')}</label>
                    <input type="text" className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.phone')}</label>
                    <input type="tel" className="w-full p-2 border rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Current Language Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Current Language Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>Current Language:</strong> {t('settings.language')} ({getCurrentLanguage()})
            </p>
            <p className="text-sm mt-2">
              <strong>Translation Key Example:</strong> {t('jobs.materialCost')} → "{t('jobs.materialCost')}"
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 