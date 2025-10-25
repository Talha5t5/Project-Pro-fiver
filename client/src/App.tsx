import React, { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import ActivatePage from "./pages/activate";
import SubscriptionPlansPage from "./pages/subscription-plans";
import MobileLinksPage from "./pages/mobile-links";

// Import delle pagine della dashboard amministratore
import AdminLoginPage from "./pages/admin/login";
import AdminDashboard from "./pages/admin/dashboard";
import ArtisanDashboard from "./pages/admin/artisan-dashboard";
import AdminLogout from "./pages/admin/logout";
import AdminSubscriptionPlansPage from "./pages/admin/subscription-plans";
import ClientsPage from "./pages/admin/clients";
import JobsPage from "./pages/admin/jobs";
import CollaboratorsPage from "./pages/admin/collaborators";
import AdminClientDetailsPage from "./pages/admin/client-details";
import AdminSectorsPage from "./pages/admin/settings/sectors";
import AdminSettingsIndex from "./pages/admin/settings";
import AdminSettingsPlansPage from "./pages/admin/settings/plans";
import AdminSettingsClientPlanOverrides from "./pages/admin/settings/client-plan-overrides";
import AnalyticsDashboard from "./pages/admin/analytics-dashboard";
import AdminGeneralSettings from "./pages/admin/settings/general";
import AdminUsersPage from "./pages/admin/users";
import CompanyProfilePage from "./pages/admin/settings/profile";
import AdminJobTypesPage from "./pages/admin/settings/jobtypes";
import AdminActivitiesPage from "./pages/admin/settings/activities";
import AdminRolesPage from "./pages/admin/settings/roles";
import AdminStatisticsPage from "./pages/admin/statistics";
import AdminWebPagesIndex from "./pages/admin/settings/web-pages";
import AdminWebPagesNew from "./pages/admin/settings/web-pages/new";
import AdminWebPagesEdit from "./pages/admin/settings/web-pages/edit";
import AdminInvoicePage from "./pages/admin/settings/invoice";

// Import delle pagine desktop
import DesktopLandingPage from "./pages/desktop/LandingPage";
import DesktopAuthPage from "./pages/desktop/AuthPage";
import DesktopCheckoutPage from "./pages/desktop/CheckoutPage";
import DesktopPaymentSuccessPage from "./pages/desktop/PaymentSuccessPage";

// Import della app mobile
import MobileApp from "./mobile/MobileApp";
import MobileWelcome from "./mobile/pages/Welcome";
import { MobileAuthProvider } from "./mobile/contexts/MobileAuthContext";
import WelcomeRedirect from "./pages/welcome-redirect";
import LanguageTestPage from "./pages/language-test";
import { initializeLanguage } from "./i18n";

function Router() {
  const [location] = useLocation();

  // Initialize language system
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Non abbiamo più bisogno di rilevare se è mobile, reindirizzamo sempre alle versioni mobile
  useEffect(() => {
    console.log("MobileApp location:", location);
  }, [location]);

  console.log("Current location:", location);
  
  // Allow access to all three interfaces instead of redirecting everything to mobile
  // Main route shows web registration landing page
  if (location === '/') {
    return <Redirect to="/mobile" />;
  }
  
  // Mobile app routes - accessible via /mobile prefix
  // Removed redirect to let MobileApp handle routing internally
  
  // Keep mobile redirects for backward compatibility but only for specific mobile routes
  if (location === '/calendar') {
    return <Redirect to="/mobile/calendar" />; 
  }
  if (location === '/jobs') {
    return <Redirect to="/mobile/jobs" />; 
  }
  if (location === '/report') {
    return <Redirect to="/mobile/report" />; 
  }
  if (location === '/registration') {
    return <Redirect to="/mobile/registration" />; 
  }
  if (location === '/settings') {
    return <Redirect to="/mobile/settings" />; 
  }
  if (location === '/welcome') {
    return <Redirect to="/mobile/welcome" />;
  }
  if (location === '/dashboard') {
    return <Redirect to="/mobile/dashboard" />;
  }
  if (location === '/stats') {
    return <Redirect to="/mobile/stats" />;
  }
  if (location === '/activities') {
    return <Redirect to="/mobile/activities" />;
  }
  if (location === '/profile') {
    return <Redirect to="/mobile/profile" />;
  }
  if (location === '/notifications') {
    return <Redirect to="/mobile/notifications" />;
  }
  if (location === '/checkout') {
    return <Redirect to="/mobile/checkout" />;
  }
  if (location === '/plans') {
    return <Redirect to="/mobile/plans" />;
  }

  return (
    <Switch>
      {/* Rotte app principale */}
      <Route path="/" component={Home} />
      <Route path="/activate" component={ActivatePage} />
      <Route path="/subscription-plans" component={SubscriptionPlansPage} />
      <Route path="/mobile-links" component={MobileLinksPage} />
      
      {/* Rotte desktop */}
      <Route path="/desktop" component={DesktopLandingPage} />
      <Route path="/desktop/home" component={DesktopLandingPage} />
      <Route path="/desktop/auth" component={DesktopAuthPage} />
      <Route path="/auth" component={DesktopAuthPage} />
      <Route path="/desktop/checkout/:planId/:billingType" component={DesktopCheckoutPage} />
      <Route path="/desktop/payment-success" component={DesktopPaymentSuccessPage} />
      
      {/* Rotte dashboard amministratore */}
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/artisan-dashboard" component={ArtisanDashboard} />
      <Route path="/admin/subscription-plans" component={AdminSubscriptionPlansPage} />
      
      {/* Rotte Artisan Dashboard */}
      <Route path="/admin/clients" component={ClientsPage} />
      <Route path="/admin/jobs" component={JobsPage} />
      <Route path="/admin/collaborators" component={CollaboratorsPage} />
      <Route path="/admin/clients/:id" component={AdminClientDetailsPage} />
      <Route path="/admin/promo-spots">
        {() => {
                const AdminPromoSpotsPage = React.lazy(() => import('./admin/AdminPromoSpots'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdminPromoSpotsPage />
        </React.Suspense>
      );
    }}
  </Route>
  <Route path="/admin/clients/:id/edit">
    {params => {
      const AdminClientEditPage = React.lazy(() => import('./pages/admin/clients/[id]/edit'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdminClientEditPage id={params.id} />
        </React.Suspense>
      );
    }}
  </Route>
  <Route path="/admin/clients/:id/plan">
    {params => {
      const AdminClientPlanPage = React.lazy(() => import('./pages/admin/clients/[id]/plan'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdminClientPlanPage id={params.id} />
        </React.Suspense>
      );
    }}
  </Route>
      
      {/* Rotte impostazioni */}
      <Route path="/admin/settings" component={AdminSettingsIndex} />
      <Route path="/admin/settings/general" component={AdminGeneralSettings} />
      <Route path="/admin/settings/sectors" component={AdminSectorsPage} />
              <Route path="/admin/settings/plans" component={AdminSettingsPlansPage} />
        <Route path="/admin/settings/client-plan-overrides" component={AdminSettingsClientPlanOverrides} />
      <Route path="/admin/settings/profile" component={CompanyProfilePage} />
      <Route path="/admin/settings/jobtypes" component={AdminJobTypesPage} />
      <Route path="/admin/settings/activities" component={AdminActivitiesPage} />
      <Route path="/admin/settings/roles" component={AdminRolesPage} />
      <Route path="/admin/settings/invoice" component={AdminInvoicePage} />
      
      {/* Rotte utenti */}
      <Route path="/admin/users" component={AdminUsersPage} />
      
      {/* Rotte statistiche */}
      <Route path="/admin/statistics" component={AdminStatisticsPage} />
      <Route path="/admin/analytics" component={AnalyticsDashboard} />
      
      {/* Rotte CMS pagine web */}
      <Route path="/admin/settings/web-pages" component={AdminWebPagesIndex} />
      <Route path="/admin/settings/web-pages/new" component={AdminWebPagesNew} />
      <Route path="/admin/settings/web-pages/edit/:id">
        {params => <AdminWebPagesEdit params={params} />}
      </Route>
      
      {/* Rotte amministratori */}
        <Route path="/admin/administrators/create">
    {() => {
      const AdminCreatePage = React.lazy(() => import('./pages/admin/administrators/create'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdminCreatePage />
        </React.Suspense>
      );
    }}
  </Route>
  <Route path="/admin/administrators/:id/edit">
    {params => {
      const AdminEditPage = React.lazy(() => import('./pages/admin/administrators/[id]/edit'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdminEditPage id={params.id} />
        </React.Suspense>
      );
    }}
  </Route>
  <Route path="/admin/administrators/:id/password">
    {params => {
      const AdministratorPasswordPage = React.lazy(() => import('./pages/admin/administrators/[id]/password'));
      return (
        <React.Suspense fallback={<div>Caricamento...</div>}>
          <AdministratorPasswordPage id={params.id} />
        </React.Suspense>
      );
    }}
  </Route>
        <Route path="/admin/logout" component={AdminLogout} />
      <Route path="/admin/forgot-password">
        {() => {
          const ForgotPasswordPage = React.lazy(() => import('./pages/admin/forgot-password'));
          return (
            <React.Suspense fallback={<div>Caricamento...</div>}>
              <ForgotPasswordPage />
            </React.Suspense>
          );
        }}
      </Route>
      
      {/* Rotte mobile app che potrebbero essere accedute direttamente */}
      <Route path="/welcome" component={WelcomeRedirect} />
      <Route path="/mobile" component={() => <MobileApp />} />
      <Route path="/mobile/*" component={() => <MobileApp />} />
      
      {/* Language Test Page - Now integrated into main interfaces */}
      {/* <Route path="/language-test" component={LanguageTestPage} /> */}
      
      {/* Pagina 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
