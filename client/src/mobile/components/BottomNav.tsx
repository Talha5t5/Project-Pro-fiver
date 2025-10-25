import React from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Home, Calendar, Briefcase, Settings, FileText, BarChart2 } from 'lucide-react';
import { NewJobModal } from './NewJobModal';
import FeatureGate from './FeatureGate';

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  // Debug: console log current location to check if it's being tracked correctly
  console.log("Current location in BottomNav:", location);

  const handleAddButtonClick = () => {
    // Usa gli Eventi Personalizzati per aprire il modale
    const event = new CustomEvent('openModal', { detail: 'new-job-modal' });
    document.dispatchEvent(event);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex h-16 z-30">
        {/* Dashboard */}
        <button
          className={`flex flex-col items-center justify-center flex-1 py-2 ${
            location === '/' || location === '/mobile' || location === '/mobile/dashboard' ? 'text-primary' : 'text-gray-500'
          }`}
          onClick={() => setLocation('/mobile/dashboard')}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile.navigation.dashboard')}</span>
        </button>
        
        {/* Calendario - show only if calendar feature */}
        <FeatureGate feature="calendar">
          <button
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              location === '/mobile/calendar' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setLocation('/mobile/calendar')}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">{t('mobile.navigation.calendar')}</span>
          </button>
        </FeatureGate>
        
        {/* Lavori */}
        <button
          className={`flex flex-col items-center justify-center flex-1 py-2 ${
            location === '/mobile/jobs' ? 'text-primary' : 'text-gray-500'
          }`}
          onClick={() => setLocation('/mobile/jobs')}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile.navigation.jobs')}</span>
        </button>
        
        {/* Pulsante + */}
        <div className="relative flex items-center justify-center flex-1">
          <button
            className="absolute -top-5 bg-blue-600 text-white rounded-full p-3 shadow-lg"
            onClick={handleAddButtonClick}
            aria-label="Aggiungi nuovo lavoro"
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>
        
        {/* Registrazione - visible only if activity_tracking feature */}
        <FeatureGate feature="activity_tracking">
          <button
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              location === '/mobile/registration' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setLocation('/mobile/registration')}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs mt-1">{t('mobile.navigation.registration')}</span>
          </button>
        </FeatureGate>
        
        {/* Report - show only if reports feature */}
        <FeatureGate feature="reports">
          <button
            className={`flex flex-col items-center justify-center flex-1 py-2 ${
              location === '/mobile/report' || location === '/mobile/analytics' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setLocation('/mobile/report')}
          >
            <BarChart2 className="h-5 w-5" />
            <span className="text-xs mt-1">Report</span>
          </button>
        </FeatureGate>
        
        {/* Impostazioni */}
        <button
          className={`flex flex-col items-center justify-center flex-1 py-2 ${
            location === '/mobile/settings' ? 'text-primary' : 'text-gray-500'
          }`}
          onClick={() => setLocation('/mobile/settings')}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile.navigation.settings')}</span>
        </button>
      </div>
      
      {/* Includi il modale */}
      <NewJobModal />
    </>
  );
}