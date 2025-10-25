import { cn } from "../../lib/utils";

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userName: string;
}

export function TopNavigation({ activeTab, onTabChange, userName }: TopNavProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold">
            AP
          </div>
          <span className="font-semibold text-xl text-blue-800">ArtiPro</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-neutral-100">
            <span className="material-icons text-neutral-600">notifications</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xs">
              {userName.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="hidden md:block text-sm font-medium">{userName}</span>
          </div>
        </div>
      </div>
      
      <div className="flex border-b border-neutral-200 overflow-x-auto">
        <button 
          id="dashboard-nav" 
          className={cn(
            "nav-item flex items-center justify-center px-4 py-3 border-b-2 font-medium whitespace-nowrap",
            activeTab === "dashboard" 
              ? "text-blue-600 border-blue-600" 
              : "text-neutral-500 border-transparent"
          )}
          onClick={() => onTabChange("dashboard")}
        >
          <span className="material-icons mr-1 text-sm">dashboard</span>
          <span>Dashboard</span>
        </button>
        
        <button 
          id="calendar-nav"
          className={cn(
            "nav-item flex items-center justify-center px-4 py-3 border-b-2 font-medium whitespace-nowrap",
            activeTab === "calendar" 
              ? "text-blue-600 border-blue-600" 
              : "text-neutral-500 border-transparent"
          )}
          onClick={() => onTabChange("calendar")}
        >
          <span className="material-icons mr-1 text-sm">calendar_today</span>
          <span>Calendario</span>
        </button>
        
        <button 
          id="clients-nav"
          className={cn(
            "nav-item flex items-center justify-center px-4 py-3 border-b-2 font-medium whitespace-nowrap",
            activeTab === "clients" 
              ? "text-blue-600 border-blue-600" 
              : "text-neutral-500 border-transparent"
          )}
          onClick={() => onTabChange("clients")}
        >
          <span className="material-icons mr-1 text-sm">people</span>
          <span>Clienti</span>
        </button>
        
        <button 
          id="jobs-nav"
          className={cn(
            "nav-item flex items-center justify-center px-4 py-3 border-b-2 font-medium whitespace-nowrap",
            activeTab === "jobs" 
              ? "text-blue-600 border-blue-600" 
              : "text-neutral-500 border-transparent"
          )}
          onClick={() => onTabChange("jobs")}
        >
          <span className="material-icons mr-1 text-sm">work</span>
          <span>Lavori</span>
        </button>
        
        <button 
          id="settings-nav"
          className={cn(
            "nav-item flex items-center justify-center px-4 py-3 border-b-2 font-medium whitespace-nowrap",
            activeTab === "settings" 
              ? "text-blue-600 border-blue-600" 
              : "text-neutral-500 border-transparent"
          )}
          onClick={() => onTabChange("settings")}
        >
          <span className="material-icons mr-1 text-sm">settings</span>
          <span>Impostazioni</span>
        </button>
      </div>
    </header>
  );
}
