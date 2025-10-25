import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionGate } from './PermissionGate';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Receipt, 
  Clock, 
  Package, 
  MessageSquare, 
  BarChart3,
  Settings,
  Home
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  permission: string;
  badge?: string | number;
  children?: NavigationItem[];
}

interface PermissionNavigationProps {
  onNavigate: (path: string) => void;
  currentPath: string;
  className?: string;
}

/**
 * Permission-based navigation component that shows only accessible features
 */
export const PermissionNavigation: React.FC<PermissionNavigationProps> = ({
  onNavigate,
  currentPath,
  className = ''
}) => {
  const { permissions, isLoading } = usePermissions();

  // Define navigation structure with permissions
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/mobile/dashboard',
      permission: 'canViewJobs' // Basic access to see jobs
    },
    {
      id: 'clients',
      label: 'Clienti',
      icon: Users,
      path: '/mobile/clients',
      permission: 'canViewClients',
      children: [
        {
          id: 'clients-view',
          label: 'Visualizza',
          icon: Users,
          path: '/mobile/clients',
          permission: 'canViewClients'
        },
        {
          id: 'clients-edit',
          label: 'Modifica',
          icon: Users,
          path: '/mobile/clients/edit',
          permission: 'canEditClients'
        },
        {
          id: 'clients-create',
          label: 'Nuovo Cliente',
          icon: Users,
          path: '/mobile/clients/new',
          permission: 'canCreateClients'
        }
      ]
    },
    {
      id: 'jobs',
      label: 'Lavori',
      icon: Briefcase,
      path: '/mobile/jobs',
      permission: 'canViewJobs',
      children: [
        {
          id: 'jobs-view',
          label: 'Visualizza',
          icon: Briefcase,
          path: '/mobile/jobs',
          permission: 'canViewJobs'
        },
        {
          id: 'jobs-edit',
          label: 'Modifica',
          icon: Briefcase,
          path: '/mobile/jobs/edit',
          permission: 'canEditJobs'
        },
        {
          id: 'jobs-create',
          label: 'Nuovo Lavoro',
          icon: Briefcase,
          path: '/mobile/jobs/new',
          permission: 'canCreateJobs'
        },
        {
          id: 'jobs-status',
          label: 'Aggiorna Stato',
          icon: Briefcase,
          path: '/mobile/jobs/status',
          permission: 'canUpdateJobStatus'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Report',
      icon: BarChart3,
      path: '/mobile/reports',
      permission: 'canViewReports',
      children: [
        {
          id: 'reports-view',
          label: 'Visualizza',
          icon: BarChart3,
          path: '/mobile/reports',
          permission: 'canViewReports'
        },
        {
          id: 'reports-create',
          label: 'Crea Report',
          icon: BarChart3,
          path: '/mobile/reports/new',
          permission: 'canCreateReports'
        },
        {
          id: 'reports-export',
          label: 'Esporta',
          icon: BarChart3,
          path: '/mobile/reports/export',
          permission: 'canExportReports'
        }
      ]
    },
    {
      id: 'invoices',
      label: 'Fatture',
      icon: Receipt,
      path: '/mobile/invoices',
      permission: 'canViewInvoices',
      children: [
        {
          id: 'invoices-view',
          label: 'Visualizza',
          icon: Receipt,
          path: '/mobile/invoices',
          permission: 'canViewInvoices'
        },
        {
          id: 'invoices-edit',
          label: 'Modifica',
          icon: Receipt,
          path: '/mobile/invoices/edit',
          permission: 'canEditInvoices'
        },
        {
          id: 'invoices-create',
          label: 'Nuova Fattura',
          icon: Receipt,
          path: '/mobile/invoices/new',
          permission: 'canCreateInvoices'
        }
      ]
    },
    {
      id: 'time-tracking',
      label: 'Tracciamento Tempo',
      icon: Clock,
      path: '/mobile/time-tracking',
      permission: 'canTrackTime',
      children: [
        {
          id: 'time-track',
          label: 'Traccia Tempo',
          icon: Clock,
          path: '/mobile/time-tracking/track',
          permission: 'canTrackTime'
        },
        {
          id: 'time-entries',
          label: 'Registrazioni',
          icon: Clock,
          path: '/mobile/time-tracking/entries',
          permission: 'canViewTimeEntries'
        },
        {
          id: 'time-edit',
          label: 'Modifica',
          icon: Clock,
          path: '/mobile/time-tracking/edit',
          permission: 'canEditTimeEntries'
        }
      ]
    },
    {
      id: 'materials',
      label: 'Materiali',
      icon: Package,
      path: '/mobile/materials',
      permission: 'canViewMaterials',
      children: [
        {
          id: 'materials-view',
          label: 'Visualizza',
          icon: Package,
          path: '/mobile/materials',
          permission: 'canViewMaterials'
        },
        {
          id: 'materials-edit',
          label: 'Modifica',
          icon: Package,
          path: '/mobile/materials/edit',
          permission: 'canEditMaterials'
        },
        {
          id: 'materials-inventory',
          label: 'Inventario',
          icon: Package,
          path: '/mobile/materials/inventory',
          permission: 'canViewInventory'
        }
      ]
    },
    {
      id: 'messages',
      label: 'Messaggi',
      icon: MessageSquare,
      path: '/mobile/messages',
      permission: 'canViewMessages',
      children: [
        {
          id: 'messages-view',
          label: 'Visualizza',
          icon: MessageSquare,
          path: '/mobile/messages',
          permission: 'canViewMessages'
        },
        {
          id: 'messages-send',
          label: 'Invia',
          icon: MessageSquare,
          path: '/mobile/messages/send',
          permission: 'canSendMessages'
        }
      ]
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: Settings,
      path: '/mobile/settings',
      permission: 'canViewSystemAlerts' // Basic settings access
    }
  ];

  // Filter navigation items based on permissions
  const filteredNavigation = React.useMemo(() => {
    if (isLoading) return [];

    return navigationItems.filter(item => {
      // Check if user has permission for this item
      const hasPermission = permissions[item.permission as keyof typeof permissions];
      
      // Filter children based on permissions
      if (item.children) {
        item.children = item.children.filter(child => 
          permissions[child.permission as keyof typeof permissions]
        );
      }
      
      return hasPermission;
    });
  }, [navigationItems, permissions, isLoading]);

  if (isLoading) {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <nav className={`flex flex-col space-y-2 ${className}`}>
      {filteredNavigation.map((item) => (
        <PermissionGate key={item.id} permission={item.permission}>
          <div className="space-y-1">
            {/* Main navigation item */}
            <button
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                currentPath === item.path
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>

            {/* Sub-navigation items */}
            {item.children && item.children.length > 0 && (
              <div className="ml-8 space-y-1">
                {item.children.map((child) => (
                  <PermissionGate key={child.id} permission={child.permission}>
                    <button
                      onClick={() => onNavigate(child.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors text-sm ${
                        currentPath === child.path
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.label}</span>
                    </button>
                  </PermissionGate>
                ))}
              </div>
            )}
          </div>
        </PermissionGate>
      ))}
    </nav>
  );
};

export default PermissionNavigation; 