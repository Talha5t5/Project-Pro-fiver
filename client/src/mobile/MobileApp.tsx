import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { MobileAuthProvider } from "./contexts/MobileAuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { Toaster } from "../components/ui/toaster";
import { BottomNavigation } from "../components/ui/bottom-navigation";
import BottomNav from "./components/BottomNav";
import PromoSpotWrapper from "./components/PromoSpotWrapper";
import { mobileLogger } from "./utils/logger";
import { useTranslation } from "react-i18next";
import { mobileApiCall } from "./utils/mobileApi";

// Pagine
import MobileWelcome from "./pages/Welcome";
import MobileLogin from "./pages/Login";
import MobileSignup from "./pages/Signup";
import TestCapacitor from "./pages/TestCapacitor";
import MobileSubscriptionPlans from "./pages/SubscriptionPlans";
import MobileCheckout from "./pages/Checkout";
import ChangePlan from "./pages/ChangePlan";
import MobileActivate from "./pages/Activate";
import MobileDashboard from "./pages/Dashboard";
import MobileProfile from "./pages/Profile";
import Reports from "./pages/Reports";
import MobileJobs from "./pages/Jobs";
import Jobs01 from "./pages/Jobs01";
import Registration from "./pages/Registration";
import JobsRegistration from "./pages/JobsRegistration";
import TestRegistration from "./pages/TestRegistration";
import MobileSettings from "./pages/Settings";
import MobileCalendar from "./pages/Calendar";
import NotificationSettings from "./components/NotificationSettings";
import PerformanceReport from "./pages/reports/PerformanceReport";
import TimeAnalysisReport from "./pages/reports/TimeAnalysisReport";
import FinancialReport from "./pages/reports/FinancialReport";
import EfficiencyReport from "./pages/reports/EfficiencyReport";
import NotFound from "../pages/not-found";
import Analytics from './pages/Analytics';

// Placeholder per pagine non ancora implementate
const MobileJobDetails = () => <div className="flex items-center justify-center h-screen">Dettaglio Lavoro</div>;
const MobileActivities = () => <div className="flex items-center justify-center h-screen">Pagina Attività</div>;
const MobileActivityDetails = () => <div className="flex items-center justify-center h-screen">Dettaglio Attività</div>;
const MobileStats = () => <div className="flex items-center justify-center h-screen">Pagina Statistiche</div>;
const MobileNotifications = () => <div className="flex items-center justify-center h-screen">Pagina Notifiche</div>;

// Implementazione diretta della pagina di registrazione
const MobileRegistrationPage = () => {
  const MobileLayout = require('./components/MobileLayout').default;
  
  return (
    <MobileLayout title="Registrazioni">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Pagina Registrazioni</h1>
        <p className="mb-4">Questa è la pagina per le registrazioni delle attività.</p>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-sm text-yellow-700">
            Registra le tue attività di lavoro qui.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Riparazione impianto elettrico</h3>
            <p className="text-sm text-gray-500">Cliente: Famiglia Bianchi</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Installazione condizionatore</h3>
            <p className="text-sm text-gray-500">Cliente: Ufficio Rossi</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow p-4 border border-gray-200">
            <h3 className="font-medium">Sostituzione infissi</h3>
            <p className="text-sm text-gray-500">Cliente: Condominio Via Roma</p>
            <div className="mt-2 flex justify-end">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Registra
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottone di aggiunta fisso */}
        <button className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
          <span className="text-2xl">+</span>
        </button>
      </div>
    </MobileLayout>
  );
};

// Importa le sottopagine delle impostazioni
import CompanySettings from "./pages/Company";
import ClientsSettings from "./pages/Clients";
import ClientForm from "./components/ClientForm";
import JobTypesSettings from "./pages/JobTypes";
import ActivitiesSettings from "./pages/Activities";
import RolesSettings from "./pages/Roles";
import CollaboratorsSettings from "./pages/Collaborators";
import JobTypeForm from "./components/JobTypeForm";
import ActivityForm from "./components/ActivityForm";
import RoleFormPage from "./pages/RoleFormPage";
import CollaboratorFormPage from "./pages/CollaboratorFormPage";

// Mobile 404 Page
const Mobile404 = () => (
  <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
    <h1 className="text-2xl font-bold mb-4">Pagina non trovata</h1>
    <p className="mb-6">La pagina che stai cercando non esiste o è stata spostata.</p>
    <div className="flex gap-4">
      <button 
        onClick={() => window.location.href = "/mobile/welcome"}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Torna alla Home
      </button>
      <button 
        onClick={() => window.location.href = "/mobile/login"}
        className="border border-primary text-primary px-4 py-2 rounded-md"
      >
        Accedi
      </button>
    </div>
  </div>
 );

export default function MobileApp() {
  const [location] = useLocation();
  const { t } = useTranslation();
  
  // 🚨 FORCE RELOAD TEST - Add this to verify new code is loaded
  console.log('🚨 FORCE RELOAD: MobileApp.tsx loaded at:', new Date().toISOString());
  console.log('🚨 FORCE RELOAD: This should be visible in mobile app console!');
  
  // Force reload if needed
  useEffect(() => {
    const lastReload = localStorage.getItem('lastMobileAppReload');
    const now = Date.now();
    
    if (!lastReload || (now - parseInt(lastReload)) > 300000) { // 5 minutes
      console.log('🚨 FORCE RELOAD: Triggering reload due to timeout');
      localStorage.setItem('lastMobileAppReload', now.toString());
      // Force a small change to trigger rebuild
    }
    
    // Test session handling immediately
    console.log('🚨 SESSION TEST: Checking if mobileApiCall is available');
    console.log('🚨 SESSION TEST: mobileApiCall type:', typeof mobileApiCall);
    
    // Test localStorage
    const sessionId = localStorage.getItem('mobileSessionId');
    console.log('🚨 SESSION TEST: Current session ID:', sessionId);
    
    // Test if we can make an API call
    if (typeof mobileApiCall === 'function') {
      console.log('🚨 SESSION TEST: mobileApiCall is available, testing...');
      // Don't actually make the call, just test if it's available
    } else {
      console.log('🚨 SESSION TEST: mobileApiCall is NOT available!');
    }
  }, []);
  
  // Determina se la pagina corrente dovrebbe nascondere la bottom navigation
  const shouldHideBottomNav = location === '/mobile' ||
                              location === '/mobile/login' || 
                              location === '/mobile/signup' || 
                              location === '/mobile/welcome' || 
                              location.includes('/activate') ||
                              location.includes('/plans') ||
                              location.includes('/checkout');
  
  // Determina la tab attiva in base all'URL corrente
  const getActiveTab = () => {
    if (location === '/mobile' || location === '/mobile/dashboard') return 'dashboard';
    if (location === '/mobile/calendar') return 'calendar';
    if (location.startsWith('/mobile/jobs') || location === '/mobile/new-job') return 'jobs';
    if (location.startsWith('/mobile/registration') || location === '/mobile/jobs01') return 'jobRegistration';
    if (location.startsWith('/mobile/settings')) return 'settings';
    if (location === '/mobile/report' || location.startsWith('/mobile/reports/')) return 'report';
    return '';
  };
  
  return (
    <MobileAuthProvider>
      <PermissionProvider>
        <div className="min-h-screen bg-white flex flex-col">
          <div className="flex-1 overflow-auto">
            <Switch>
              <Route path="/mobile/login" component={MobileLogin} />
              <Route path="/mobile/signup" component={MobileSignup} />
              <Route path="/mobile/test-capacitor" component={TestCapacitor} />
              <Route path="/mobile/plans" component={MobileSubscriptionPlans} />
              <Route path="/mobile/subscription-plans" component={MobileSubscriptionPlans} />
              <Route path="/mobile/checkout/:planId?/:billingType?" component={MobileCheckout} />
              <Route path="/mobile/change-plan" component={ChangePlan} />
              <Route path="/mobile/activate/:code" component={MobileActivate} />
              <Route path="/mobile/analytics" component={Analytics} />
              <Route path="/mobile" component={MobileLogin} />
              <Route path="/mobile/dashboard" component={MobileDashboard} />
              <Route path="/mobile/calendar" component={MobileCalendar} />
              <Route path="/mobile/profile" component={MobileProfile} />
              <Route path="/mobile/registration">
                {() => <MobileJobs isRegistrationPage={true} /> }
              </Route>
              <Route path="/mobile/jobs" component={MobileJobs} />
              <Route path="/mobile/new-job" component={MobileJobs} />
              <Route path="/mobile/jobs/:id" component={MobileJobDetails} />
              <Route path="/mobile/activities" component={MobileActivities} />
              <Route path="/mobile/activities/:id" component={MobileActivityDetails} />
              <Route path="/mobile/stats" component={MobileStats} />
              <Route path="/mobile/report" component={Reports} />
              <Route path="/mobile/reports/performance" component={PerformanceReport} />
              <Route path="/mobile/reports/time" component={TimeAnalysisReport} />
              <Route path="/mobile/reports/financial" component={FinancialReport} />
              <Route path="/mobile/reports/efficiency" component={EfficiencyReport} />
              <Route path="/mobile/notifications" component={MobileNotifications} />
              <Route path="/mobile/settings" component={MobileSettings} />
              <Route path="/mobile/settings/company" component={CompanySettings} />
              <Route path="/mobile/settings/clients" component={ClientsSettings} />
              <Route path="/mobile/settings/clients/new" component={ClientForm} />
              <Route path="/mobile/settings/clients/:id" component={ClientForm} />
              <Route path="/mobile/settings/jobtypes" component={JobTypesSettings} />
              <Route path="/mobile/settings/jobtypes/new" component={JobTypeForm} />
              <Route path="/mobile/settings/jobtypes/:id" component={JobTypeForm} />
              <Route path="/mobile/settings/activities" component={ActivitiesSettings} />
              <Route path="/mobile/settings/activities/new" component={ActivityForm} />
              <Route path="/mobile/settings/activities/:id" component={ActivityForm} />
              <Route path="/mobile/settings/roles" component={RolesSettings} />
              <Route path="/mobile/settings/roles/new" component={RoleFormPage} />
              <Route path="/mobile/settings/roles/:id" component={RoleFormPage} />
              <Route path="/mobile/settings/collaborators" component={CollaboratorsSettings} />
              <Route path="/mobile/settings/collaborators/new" component={CollaboratorFormPage} />
              <Route path="/mobile/settings/collaborators/:id" component={CollaboratorFormPage} />
              <Route path="/mobile/settings/notifications" component={NotificationSettings} />
              <Route component={Mobile404} />
            </Switch>
          </div>
          {/* Bottom navigation (hidden for auth pages) */}
          {!shouldHideBottomNav && (
            <div className="h-16 pb-safe">
              <BottomNav />
            </div>
          )}
        </div>
        <Toaster />
      </PermissionProvider>
    </MobileAuthProvider>
  );
}