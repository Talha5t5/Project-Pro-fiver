import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, User, Mail, Phone, Building, MapPin, Save } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schema
const profileSchema = z.object({
  fullName: z.string().min(2, "Nome completo deve contenere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Italia",
    },
  });

  // Get current user data
  const { data: currentUser, isLoading: userLoading } = useQuery({
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

  // Check if user has profile permission - use same logic as dashboard
  const hasProfilePermission = enabledFeatures.includes('profile') || enabledFeatures.includes('user_management');

  // Update form when user data loads
  useState(() => {
    if (currentUser) {
      form.reset({
        fullName: currentUser.fullName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        company: currentUser.company || "",
        address: currentUser.address || "",
        city: currentUser.city || "",
        postalCode: currentUser.postalCode || "",
        country: currentUser.country || "Italia",
      });
    }
  }, [currentUser, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      apiRequest("PUT", "/api/mobile/user", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/user"] });
      toast({
        title: t('profile.updated'),
        description: t('profile.updatedSuccess'),
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('profile.updateError'),
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasProfilePermission) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                {t('common.back')} {t('artisanDashboard.title')}
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {t('profile.noPermission')}
              </h3>
              <p className="text-yellow-700 mb-4">
                {t('profile.noPermissionDescription')}
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
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {t('profile.personalInfo')}
              </CardTitle>
              <CardDescription>
                {t('profile.personalInfoDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                    <Input
                      id="fullName"
                      {...form.register("fullName")}
                      placeholder={t('profile.fullNamePlaceholder')}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-red-600">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('profile.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder={t('profile.emailPlaceholder')}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('profile.phone')}</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder={t('profile.phonePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">{t('profile.company')}</Label>
                    <Input
                      id="company"
                      {...form.register("company")}
                      placeholder={t('profile.companyPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">{t('profile.address')}</Label>
                    <Input
                      id="address"
                      {...form.register("address")}
                      placeholder={t('profile.addressPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">{t('profile.city')}</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder={t('profile.cityPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{t('profile.postalCode')}</Label>
                    <Input
                      id="postalCode"
                      {...form.register("postalCode")}
                      placeholder={t('profile.postalCodePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">{t('profile.country')}</Label>
                    <Input
                      id="country"
                      {...form.register("country")}
                      placeholder={t('profile.countryPlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
