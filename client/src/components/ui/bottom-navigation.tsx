import { useCallback } from "react";
import { cn } from "../../lib/utils";
import { useLocation } from "wouter";
import { Home, Calendar, Briefcase, Settings, FileText, Plus, BarChart } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}

export function BottomNavigation({ activeTab, onTabChange, isMobile = false }: BottomNavProps) {
  const [location, setLocation] = useLocation();
  
  const isMobileActive = (path: string) => {
    if (path === '/mobile' && (location === '/mobile' || location === '/mobile/dashboard')) return true;
    if (path === '/mobile/report' && location.startsWith('/mobile/reports/')) return true;
    return location === path;
  };
  
  const isDesktopActive = (tab: string) => {
    return activeTab === tab;
  };
  
  const handleTabClick = useCallback((tab: string, path: string) => {
    if (isMobile) {
      setLocation(path);
    } else {
      onTabChange(tab);
    }
  }, [isMobile, onTabChange, setLocation]);

  const handleAddClick = useCallback(() => {
    if (isMobile) {
      setLocation('/mobile/new-job');
    } else {
      document.dispatchEvent(new CustomEvent('openModal', { detail: 'new-job-modal' }));
    }
  }, [isMobile, setLocation]);

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-neutral-200 py-2 px-1 flex justify-around items-center z-10">
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("dashboard", "/mobile")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Home className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Dashboard</span>
      </button>
      
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("calendar", "/mobile/calendar")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile/calendar') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Calendar className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Calendario</span>
      </button>
      
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("jobs", "/mobile/jobs")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile/jobs') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Briefcase className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Lavori</span>
      </button>
      
      <button
        className="flex items-center justify-center rounded-full w-12 h-12 bg-blue-600 text-white shadow-lg -mt-5"
        onClick={handleAddClick}
      >
        <Plus className="h-6 w-6" />
      </button>
      
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("jobRegistration", "/mobile/registration")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile/registration') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <FileText className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Registrazione</span>
      </button>
      
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("report", "/mobile/report")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile/report') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <BarChart className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Report</span>
      </button>
      
      <button 
        className="flex flex-col items-center justify-center"
        onClick={() => handleTabClick("settings", "/mobile/settings")}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full w-6 h-6",
          isMobileActive('/mobile/settings') ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Settings className="h-4 w-4" />
        </div>
        <span className="text-xs mt-1">Impostazioni</span>
      </button>
    </nav>
  );
}
