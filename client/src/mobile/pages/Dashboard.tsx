import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { mobileApiCall } from "../utils/mobileApi";
import MobileLayout from "../components/MobileLayout";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { Button } from "../../components/ui/button";
import { Calendar, User, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export default function MobileDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useMobileAuth();
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState(t('mobile.dashboard.greeting.afternoon'));
  
  // Add error boundary and debugging
  console.log('🔍 Dashboard rendering with user:', user);
  console.log('🚨 TEST: This is the UPDATED Dashboard component!');
  console.log('🚨 TEST: If you see this, the new code is loaded!');
  console.log('🚨 FORCE RELOAD: Dashboard component loaded at:', new Date().toISOString());
  
  // Check if mobileApiCall is available
  console.log('Dashboard: mobileApiCall available:', typeof mobileApiCall);
  
  // Check localStorage for session ID
  const storedSessionId = localStorage.getItem('mobileSessionId');
  console.log('Dashboard: Stored session ID:', storedSessionId);
  
  // Debug session handling
  useEffect(() => {
    // Test if we can make an API call
    if (storedSessionId && typeof mobileApiCall === 'function') {
      console.log('Dashboard: API call available with session');
    } else {
      console.log('Dashboard: Cannot make API call - missing session or mobileApiCall');
    }
  }, [user, storedSessionId]);
  
  // Imposta il saluto in base all'ora del giorno
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting(t('mobile.dashboard.greeting.morning'));
    } else if (hour >= 12 && hour < 18) {
      setGreeting(t('mobile.dashboard.greeting.afternoon'));
    } else {
      setGreeting(t('mobile.dashboard.greeting.evening'));
    }
  }, [t]);

  // Fetch real data from API
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await mobileApiCall('GET', '/api/mobile/stats');
        if (!response.ok) {
          throw new Error(`Stats API failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: async () => {
      try {
        const response = await mobileApiCall('GET', '/api/mobile/today-appointments');
        if (!response.ok) {
          throw new Error(`Appointments API failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Default values while loading
  const defaultStats = {
    lavoriAttivi: 0,
    clientiTotali: 0,
    lavoriCompletati: 0,
    incassoMensile: 0
  };

  const defaultAppointments: any[] = [];

  // Add error handling for queries
  if ((stats && stats.error) || (appointments && appointments.error)) {
    console.error('❌ Dashboard query errors:', { 
      stats: stats?.error, 
      appointments: appointments?.error 
    });
    return (
      <MobileLayout title={t('mobile.dashboard.title')}>
        <div className="space-y-4 p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-bold">{t('mobile.dashboard.error.title')}</h3>
            <p>{t('mobile.dashboard.error.message')}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              {t('mobile.dashboard.error.reload')}
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Dashboard">
      <div className="space-y-4 p-4">

        {/* Saluto all'utente */}
        <div className="bg-slate-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">
              {greeting}, {user?.fullName || "Marco"}
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/mobile/change-plan")}
            >
              Cambia Piano
            </Button>
          </div>
        </div>

        {/* Contatori statistiche */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">{t('mobile.dashboard.stats.activeJobs')}</div>
            <div className="text-3xl font-bold mt-1">
              {statsLoading ? '...' : (stats?.lavoriAttivi || defaultStats.lavoriAttivi)}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">{t('mobile.dashboard.stats.totalClients')}</div>
            <div className="text-3xl font-bold mt-1">
              {statsLoading ? '...' : (stats?.clientiTotali || defaultStats.clientiTotali)}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">{t('mobile.dashboard.stats.completedJobs')}</div>
            <div className="text-3xl font-bold mt-1">
              {statsLoading ? '...' : (stats?.lavoriCompletati || defaultStats.lavoriCompletati)}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">{t('mobile.dashboard.stats.monthlyIncome')}</div>
            <div className="text-3xl font-bold mt-1">
              €{statsLoading ? '...' : (stats?.incassoMensile || defaultStats.incassoMensile)},00
            </div>
          </div>
        </div>

        {/* Impegni di oggi */}
        <div className="mt-6">
          <h3 className="text-xl font-medium mb-3">{t('mobile.dashboard.appointments.title')}</h3>
          
          <div className="space-y-3">
            {appointmentsLoading ? (
              <div className="text-center py-4 text-slate-500">{t('mobile.dashboard.appointments.loading')}</div>
            ) : (appointments || defaultAppointments).map((appointment: any) => (
              <div key={appointment.id} className={`border-l-4 border-${appointment.color}-500 bg-white p-3 rounded-r-lg shadow-sm`} style={{borderLeftColor: appointment.color === 'blue' ? '#3b82f6' : appointment.color === 'yellow' ? '#f59e0b' : '#a855f7'}}>
                <div className="font-medium">{appointment.title}</div>
                
                <div className="flex items-center text-sm text-slate-500 mt-1">
                  <User className="h-3.5 w-3.5 mr-1" />
                  {appointment.client}
                </div>
                
                <div className="flex items-center text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {appointment.location}
                </div>
                
                <div className="mt-2">
                  <span className={`bg-${appointment.color}-100 text-${appointment.color}-700 text-xs font-medium px-2 py-1 rounded`} style={{backgroundColor: appointment.color === 'blue' ? '#dbeafe' : appointment.color === 'yellow' ? '#fef3c7' : '#f3e8ff', color: appointment.color === 'blue' ? '#1d4ed8' : appointment.color === 'yellow' ? '#b45309' : '#7e22ce'}}>
                    {appointment.startTime} - {appointment.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports Section */}
        <div className="mt-6">
          <h3 className="text-xl font-medium mb-3">{t('mobile.dashboard.reports.title')}</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">{t('mobile.dashboard.reports.efficiency')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? '...' : 
                      stats?.lavoriCompletati && stats?.totalJobs ? 
                      Math.round((stats.lavoriCompletati / stats.totalJobs) * 100) : 0}%
                  </div>
                </div>
                <div className="text-green-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Valore Medio per Lavoro</div>
                  <div className="text-2xl font-bold text-blue-600">
                    €{statsLoading ? '...' : 
                      stats?.totalJobs && stats?.incassoMensile ? 
                      Math.round(stats.incassoMensile / stats.totalJobs) : 0}
                  </div>
                </div>
                <div className="text-blue-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}