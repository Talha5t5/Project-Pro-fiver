import { ReactNode } from "react";
import { useLocation } from "wouter";
import { 
  Home, 
  Calendar, 
  Briefcase, 
  BarChart, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  User,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useMobileAuth } from "../contexts/MobileAuthContext";
import { mobileApiCall } from "../utils/mobileApi";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  hideBottomNav?: boolean;
  hideSideMenu?: boolean;
  rightAction?: ReactNode;
  showNavButtons?: boolean;
  prevPage?: string; 
  nextPage?: string;
  showBackButton?: boolean;
}

export default function MobileLayout({ 
  children, 
  title = "Gestione Progetti", 
  hideBottomNav = false,
  hideSideMenu = false,
  rightAction,
  showNavButtons = false,
  prevPage,
  nextPage,
  showBackButton = false
}: MobileLayoutProps) {
  
  const [location, setLocation] = useLocation();
  const { user, logout } = useMobileAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      const response = await mobileApiCall('POST', '/api/logout');
      
      if (response.ok) {
        await logout(); // Aggiorna il contesto locale
        setLocation("/mobile/welcome");
      } else {
        throw new Error("Errore durante il logout");
      }
    } catch (err) {
      console.error("Errore durante il logout:", err);
    }
  };

  // Funzione per ottenere le iniziali del nome
  const getInitials = (name: string) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Check se la rotta è attiva
  const isActive = (path: string) => {
    if (path === "/mobile" && location === "/mobile") return true;
    if (path !== "/mobile" && location.startsWith(path)) return true;
    return false;
  };

  // Determina se mostrare l'header (nascondi per login/signup/welcome)
  const shouldShowHeader = !location.includes('/login') && 
                          !location.includes('/signup') && 
                          !location.includes('/welcome') && 
                          !location.includes('/activate');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Menu - Hidden for auth pages */}
      {shouldShowHeader && (
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            {!hideSideMenu && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu size={22} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center space-x-4 py-6">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {user ? getInitials(user.fullName || user.username) : "G"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user?.fullName || user?.username || t('mobile.common.guest')}</p>
                        {user?.email && (
                          <p className="text-sm text-gray-500">{user.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 py-4 space-y-1">
                      <Button 
                        variant={isActive("/mobile/dashboard") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/dashboard")}
                      >
                        <Home size={18} className="mr-2" />
                        {t('mobile.navigation.dashboard')}
                      </Button>
                      
                      <Button 
                        variant={isActive("/mobile/calendar") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/calendar")}
                      >
                        <Calendar size={18} className="mr-2" />
                        {t('mobile.navigation.calendar')}
                      </Button>
                      
                      <Button 
                        variant={isActive("/mobile/jobs") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/jobs")}
                      >
                        <Briefcase size={18} className="mr-2" />
                        {t('mobile.navigation.jobs')}
                      </Button>
                      
                      <Button 
                        variant={isActive("/mobile/report") || isActive("/mobile/stats") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/report")}
                      >
                        <BarChart size={18} className="mr-2" />
                        Report
                      </Button>
                      
                      
                      <Button 
                        variant={isActive("/mobile/profile") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/profile")}
                      >
                        <User size={18} className="mr-2" />
                        {t('mobile.navigation.profile')}
                      </Button>
                      
                      <Button 
                        variant={isActive("/mobile/settings") ? "default" : "ghost"} 
                        className="w-full justify-start" 
                        onClick={() => setLocation("/mobile/settings")}
                      >
                        <Settings size={18} className="mr-2" />
                        {t('mobile.navigation.settings')}
                      </Button>
                    </div>
                    
                    <div className="py-4 border-t">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive" 
                        onClick={handleLogout}
                      >
                        <LogOut size={18} className="mr-2" />
                        {t('mobile.auth.logout')}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            <h1 className="text-lg font-bold ml-2">{title}</h1>
          </div>
          
          {rightAction ? (
            rightAction
          ) : (
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setLocation("/mobile/notifications")}
              >
                <Bell size={22} />
                {/* Badge notifiche (solo esempio) */}
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  2
                </span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/mobile/profile")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {user ? getInitials(user.fullName || user.username) : "G"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          )}
        </header>
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
        
        {/* Navigation buttons */}
        {showNavButtons && (
          <div className="fixed bottom-20 left-0 right-0 flex justify-between px-4 pb-4">
            {prevPage ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center shadow-md bg-white"
                onClick={() => setLocation(prevPage)}
              >
                <ChevronLeft size={16} className="mr-1" />
                {t('mobile.common.previous')}
              </Button>
            ) : <div></div>}
            
            {nextPage ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center shadow-md bg-white"
                onClick={() => setLocation(nextPage)}
              >
                {t('mobile.common.next')}
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : <div></div>}
          </div>
        )}
      </main>
      
      {/* Bottom navigation */}
      {!hideBottomNav && (
        <div className="h-16 pb-safe"> {/* Spazio per la BottomNav */}
          {/* Il componente BottomNav effettivo è importato direttamente in MobileApp.tsx */}
        </div>
      )}
    </div>
  );
}