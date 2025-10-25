import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from "react";
import { useMobileAuth } from "./MobileAuthContext";
import { mobileGet } from "../utils/mobileApi";

// Permission types based on our collaborator schema
export interface MobilePermissions {
  // Client Management
  canViewClients: boolean;
  canEditClients: boolean;
  canCreateClients: boolean;
  canDeleteClients: boolean;
  canViewClientDetails: boolean;
  canViewClientSensitiveData: boolean; // Address, financial info, etc.
  
  // Client Field Visibility (based on admin settings)
  canViewClientName: boolean;
  canViewClientAddress: boolean;
  canViewClientPhone: boolean;
  canViewClientEmail: boolean;
  canViewClientType: boolean;
  canViewClientNotes: boolean;
  canViewClientGeoLocation: boolean;
  canViewClientSectors: boolean;
  canViewClientCreatedAt: boolean;
  
  // Job Management
  canViewJobs: boolean;
  canEditJobs: boolean;
  canCreateJobs: boolean;
  canDeleteJobs: boolean;
  canViewJobDetails: boolean;
  canViewJobFinancials: boolean; // Pricing, costs, etc.
  canUpdateJobStatus: boolean;
  canAddJobNotes: boolean;
  canUploadJobPhotos: boolean;
  
  // Job Field Visibility (based on admin settings)
  canViewJobTitle: boolean;
  canViewJobDescription: boolean;
  canViewJobStartDate: boolean;
  canViewJobEndDate: boolean;
  canViewJobStatus: boolean;
  canViewJobRate: boolean;
  canViewJobClient: boolean;
  canViewJobActualDuration: boolean;
  canViewJobAssignedTo: boolean;
  canViewJobPhotos: boolean;
  canViewJobMaterialsCost: boolean;
  canViewJobCost: boolean;
  canViewJobLocation: boolean;
  canViewJobDuration: boolean;
  canViewJobCompletedDate: boolean;
  canViewJobPriority: boolean;
  canViewJobMaterials: boolean;
  
  // Registration Field Visibility (based on admin settings)
  canViewRegistrationDate: boolean;
  canViewRegistrationTime: boolean;
  canViewRegistrationActivity: boolean;
  canViewRegistrationDuration: boolean;
  canViewRegistrationPhotos: boolean;
  canViewRegistrationLocation: boolean;
  canViewRegistrationJob: boolean;
  canViewRegistrationNotes: boolean;
  canViewRegistrationMaterials: boolean;
  canViewRegistrationSignature: boolean;
  
  // Reports & Analytics
  canViewReports: boolean;
  canCreateReports: boolean;
  canExportReports: boolean;
  canViewFinancialReports: boolean;
  canViewPerformanceMetrics: boolean;
  
  // Invoicing & Financials
  canViewInvoices: boolean;
  canEditInvoices: boolean;
  canCreateInvoices: boolean;
  canDeleteInvoices: boolean;
  canViewInvoiceAmounts: boolean;
  canViewPaymentHistory: boolean;
  
  // Time & Activity Tracking
  canTrackTime: boolean;
  canViewTimeEntries: boolean;
  canEditTimeEntries: boolean;
  canViewActivityLogs: boolean;
  
  // Material & Inventory
  canViewMaterials: boolean;
  canEditMaterials: boolean;
  canViewInventory: boolean;
  canUpdateInventory: boolean;
  
  // Communication & Notifications
  canSendNotifications: boolean;
  canViewMessages: boolean;
  canSendMessages: boolean;
  canViewSystemAlerts: boolean;
  
  // Settings Management
  canViewSettings: boolean;
  canEditSettings: boolean;
  canCreateSettings: boolean;
  canDeleteSettings: boolean;
  
  // Job Types Management
  canViewJobTypes: boolean;
  canEditJobTypes: boolean;
  canCreateJobTypes: boolean;
  canDeleteJobTypes: boolean;
  
  // Activities Management
  canViewActivities: boolean;
  canEditActivities: boolean;
  canCreateActivities: boolean;
  canDeleteActivities: boolean;
  
  // Roles Management
  canViewRoles: boolean;
  canEditRoles: boolean;
  canCreateRoles: boolean;
  canDeleteRoles: boolean;
  
  // Collaborators Management
  canViewCollaborators: boolean;
  canEditCollaborators: boolean;
  canCreateCollaborators: boolean;
  canDeleteCollaborators: boolean;
  
  // Company Management
  canViewCompany: boolean;
  canEditCompany: boolean;
  canCreateCompany: boolean;
  canDeleteCompany: boolean;
}

// Permission categories for easy management
export const PERMISSION_CATEGORIES = {
  CLIENTS: [
    'canViewClients',
    'canEditClients', 
    'canCreateClients',
    'canDeleteClients',
    'canViewClientDetails',
    'canViewClientSensitiveData'
  ],
  JOBS: [
    'canViewJobs',
    'canEditJobs',
    'canCreateJobs',
    'canDeleteJobs',
    'canViewJobDetails',
    'canViewJobFinancials',
    'canUpdateJobStatus',
    'canAddJobNotes',
    'canUploadJobPhotos'
  ],
  REPORTS: [
    'canViewReports',
    'canCreateReports',
    'canExportReports',
    'canViewFinancialReports',
    'canViewPerformanceMetrics'
  ],
  INVOICES: [
    'canViewInvoices',
    'canEditInvoices',
    'canCreateInvoices',
    'canDeleteInvoices',
    'canViewInvoiceAmounts',
    'canViewPaymentHistory'
  ],
  TIME_TRACKING: [
    'canTrackTime',
    'canViewTimeEntries',
    'canEditTimeEntries',
    'canViewActivityLogs'
  ],
  MATERIALS: [
    'canViewMaterials',
    'canEditMaterials',
    'canViewInventory',
    'canUpdateInventory'
  ],
  COMMUNICATION: [
    'canSendNotifications',
    'canViewMessages',
    'canSendMessages',
    'canViewSystemAlerts'
  ],
  SETTINGS: [
    'canViewSettings',
    'canEditSettings',
    'canCreateSettings',
    'canDeleteSettings'
  ],
  JOB_TYPES: [
    'canViewJobTypes',
    'canEditJobTypes',
    'canCreateJobTypes',
    'canDeleteJobTypes'
  ],
  ACTIVITIES: [
    'canViewActivities',
    'canEditActivities',
    'canCreateActivities',
    'canDeleteActivities'
  ],
  ROLES: [
    'canViewRoles',
    'canEditRoles',
    'canCreateRoles',
    'canDeleteRoles'
  ],
  COLLABORATORS: [
    'canViewCollaborators',
    'canEditCollaborators',
    'canCreateCollaborators',
    'canDeleteCollaborators'
  ],
  COMPANY: [
    'canViewCompany',
    'canEditCompany',
    'canCreateCompany',
    'canDeleteCompany'
  ]
} as const;

export interface PermissionContextType {
  // Permission checking
  hasPermission: (permission: keyof MobilePermissions) => boolean;
  hasAnyPermission: (permissions: (keyof MobilePermissions)[]) => boolean;
  hasAllPermissions: (permissions: (keyof MobilePermissions)[]) => boolean;
  hasCategoryPermission: (category: keyof typeof PERMISSION_CATEGORIES) => boolean;
  
  // Permission data
  permissions: MobilePermissions;
  isLoading: boolean;
  error: string | null;
  
  // Utility functions
  canViewClients: boolean;
  canEditClients: boolean;
  canViewJobs: boolean;
  canEditJobs: boolean;
  canViewReports: boolean;
  canViewInvoices: boolean;
  canTrackTime: boolean;
  canViewMaterials: boolean;
  
  // Data filtering helpers
  filterClientData: (client: any) => any;
  filterJobData: (job: any) => any;
  filterInvoiceData: (invoice: any) => any;
  filterReportData: (report: any) => any;
}

const defaultPermissions: MobilePermissions = {
  // Client Management
  canViewClients: false,
  canEditClients: false,
  canCreateClients: false,
  canDeleteClients: false,
  canViewClientDetails: false,
  canViewClientSensitiveData: false,
  
  // Client Field Visibility (based on admin settings)
  canViewClientName: true,
  canViewClientAddress: true,
  canViewClientPhone: true,
  canViewClientEmail: true,
  canViewClientType: true,
  canViewClientNotes: true,
  canViewClientGeoLocation: true,
  canViewClientSectors: true,
  canViewClientCreatedAt: true,
  
  // Job Management
  canViewJobs: false,
  canEditJobs: false,
  canCreateJobs: false,
  canDeleteJobs: false,
  canViewJobDetails: false,
  canViewJobFinancials: false,
  canUpdateJobStatus: false,
  canAddJobNotes: false,
  canUploadJobPhotos: false,
  
  // Job Field Visibility (based on admin settings)
  canViewJobTitle: true,
  canViewJobDescription: true,
  canViewJobStartDate: true,
  canViewJobEndDate: true,
  canViewJobStatus: true,
  canViewJobRate: true,
  canViewJobClient: true,
  canViewJobActualDuration: true,
  canViewJobAssignedTo: true,
  canViewJobPhotos: true,
  canViewJobMaterialsCost: true,
  canViewJobCost: true,
  canViewJobLocation: true,
  canViewJobDuration: true,
  canViewJobCompletedDate: true,
  canViewJobPriority: true,
  canViewJobMaterials: true,
  
  // Registration Field Visibility
  canViewRegistrationDate: true,
  canViewRegistrationTime: true,
  canViewRegistrationActivity: true,
  canViewRegistrationDuration: true,
  canViewRegistrationPhotos: true,
  canViewRegistrationLocation: true,
  canViewRegistrationJob: true,
  canViewRegistrationNotes: true,
  canViewRegistrationMaterials: true,
  canViewRegistrationSignature: true,
  
  // Reports & Analytics
  canViewReports: false,
  canCreateReports: false,
  canExportReports: false,
  canViewFinancialReports: false,
  canViewPerformanceMetrics: false,
  
  // Invoicing & Financials
  canViewInvoices: false,
  canEditInvoices: false,
  canCreateInvoices: false,
  canDeleteInvoices: false,
  canViewInvoiceAmounts: false,
  canViewPaymentHistory: false,
  
  // Time & Activity Tracking
  canTrackTime: false,
  canViewTimeEntries: false,
  canEditTimeEntries: false,
  canViewActivityLogs: false,
  
  // Material & Inventory
  canViewMaterials: false,
  canEditMaterials: false,
  canViewInventory: false,
  canUpdateInventory: false,
  
  // Communication & Notifications
  canSendNotifications: false,
  canViewMessages: false,
  canSendMessages: false,
  canViewSystemAlerts: false,
  
  // Settings Management
  canViewSettings: false,
  canEditSettings: false,
  canCreateSettings: false,
  canDeleteSettings: false,
  
  // Job Types Management
  canViewJobTypes: false,
  canEditJobTypes: false,
  canCreateJobTypes: false,
  canDeleteJobTypes: false,
  
  // Activities Management
  canViewActivities: false,
  canEditActivities: false,
  canCreateActivities: false,
  canDeleteActivities: false,
  
  // Roles Management
  canViewRoles: false,
  canEditRoles: false,
  canCreateRoles: false,
  canDeleteRoles: false,
  
  // Collaborators Management
  canViewCollaborators: false,
  canEditCollaborators: false,
  canCreateCollaborators: false,
  canDeleteCollaborators: false,
  
  // Company Management
  canViewCompany: false,
  canEditCompany: false,
  canCreateCompany: false,
  canDeleteCompany: false,
};

const PermissionContext = createContext<PermissionContextType | null>(null);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider = ({ children }: PermissionProviderProps) => {
  const { user } = useMobileAuth();
  const [permissions, setPermissions] = useState<MobilePermissions>(defaultPermissions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load permissions when user changes
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setPermissions(defaultPermissions);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user permissions from API
        const response = await mobileGet('/api/mobile/permissions');

        if (response.ok) {
          const userPermissions = await response.json();
          setPermissions(userPermissions.permissions || defaultPermissions);
        } else {
          // If no permissions endpoint, use default permissions
          setPermissions(defaultPermissions);
        }
      } catch (err) {
        console.error('Error loading permissions:', err);
        setError('Failed to load permissions');
        setPermissions(defaultPermissions);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  // Permission checking functions
  const hasPermission = (permission: keyof MobilePermissions): boolean => {
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionList: (keyof MobilePermissions)[]): boolean => {
    return permissionList.some(permission => permissions[permission] === true);
  };

  const hasAllPermissions = (permissionList: (keyof MobilePermissions)[]): boolean => {
    return permissionList.every(permission => permissions[permission] === true);
  };

  const hasCategoryPermission = (category: keyof typeof PERMISSION_CATEGORIES): boolean => {
    const categoryPermissions = PERMISSION_CATEGORIES[category];
    return categoryPermissions.some(permission => permissions[permission] === true);
  };

  // Data filtering functions
  const filterClientData = (client: any): any => {
    if (!client) return null;

    const filtered = { ...client };

    if (!hasPermission('canViewClientSensitiveData')) {
      // Remove sensitive information
      delete filtered.address;
      delete filtered.phone;
      delete filtered.financialInfo;
      delete filtered.creditLimit;
      delete filtered.paymentTerms;
    }

    if (!hasPermission('canViewClientDetails')) {
      // Remove detailed information
      delete filtered.notes;
      delete filtered.history;
      delete filtered.preferences;
    }

    return filtered;
  };

  const filterJobData = (job: any): any => {
    if (!job) return null;

    const filtered = { ...job };

    if (!hasPermission('canViewJobFinancials')) {
      // Remove financial information
      delete filtered.price;
      delete filtered.cost;
      delete filtered.profit;
      delete filtered.materialsCost;
      delete filtered.laborCost;
    }

    if (!hasPermission('canViewJobDetails')) {
      // Remove detailed information
      delete filtered.description;
      delete filtered.notes;
      delete filtered.photos;
      delete filtered.attachments;
    }

    return filtered;
  };

  const filterInvoiceData = (invoice: any): any => {
    if (!invoice) return null;

    const filtered = { ...invoice };

    if (!hasPermission('canViewInvoiceAmounts')) {
      // Remove financial amounts
      delete filtered.amount;
      delete filtered.tax;
      delete filtered.total;
      delete filtered.paidAmount;
      delete filtered.balance;
    }

    if (!hasPermission('canViewPaymentHistory')) {
      // Remove payment history
      delete filtered.payments;
      delete filtered.paymentHistory;
      delete filtered.dueDate;
    }

    return filtered;
  };

  const filterReportData = (report: any): any => {
    if (!report) return null;

    const filtered = { ...report };

    if (!hasPermission('canViewFinancialReports')) {
      // Remove financial data from reports
      delete filtered.revenue;
      delete filtered.costs;
      delete filtered.profit;
      delete filtered.budget;
      delete filtered.financialMetrics;
    }

    if (!hasPermission('canViewPerformanceMetrics')) {
      // Remove performance data
      delete filtered.efficiency;
      delete filtered.productivity;
      delete filtered.performanceScores;
      delete filtered.benchmarks;
    }

    return filtered;
  };

  // Memoized permission values for performance
  const permissionValues = useMemo(() => ({
    canViewClients: hasPermission('canViewClients'),
    canEditClients: hasPermission('canEditClients'),
    canViewJobs: hasPermission('canViewJobs'),
    canEditJobs: hasPermission('canEditJobs'),
    canViewReports: hasPermission('canViewReports'),
    canViewInvoices: hasPermission('canViewInvoices'),
    canTrackTime: hasPermission('canTrackTime'),
    canViewMaterials: hasPermission('canViewMaterials'),
  }), [permissions]);

  const contextValue: PermissionContextType = {
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasCategoryPermission,
    
    // Permission data
    permissions,
    isLoading,
    error,
    
    // Utility functions
    ...permissionValues,
    
    // Data filtering helpers
    filterClientData,
    filterJobData,
    filterInvoiceData,
    filterReportData,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}; 