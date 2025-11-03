import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

export interface ArtisanPermissions {
  // These match what /api/mobile/permissions actually returns
  canViewClients?: boolean;
  canEditClients?: boolean;
  canCreateClients?: boolean;
  canDeleteClients?: boolean;
  
  canViewJobs?: boolean;
  canEditJobs?: boolean;
  canCreateJobs?: boolean;
  canDeleteJobs?: boolean;
  canUpdateJobStatus?: boolean;
  
  canViewReports?: boolean;
  canCreateReports?: boolean;
  canExportReports?: boolean;
  
  // These come from plan features.permissions
  'client.view'?: boolean;
  'client.view_all'?: boolean;
  'client.create'?: boolean;
  'client.edit'?: boolean;
  'client.delete'?: boolean;
  
  'job.view'?: boolean;
  'job.view_all'?: boolean;
  'job.create'?: boolean;
  'job.edit'?: boolean;
  'job.delete'?: boolean;
  'job.complete'?: boolean;
  
  'collaborator.create'?: boolean;
  'collaborator.edit'?: boolean;
  'collaborator.delete'?: boolean;
  'collaborator.assign'?: boolean;
  
  'invoice.create'?: boolean;
  'invoice.edit'?: boolean;
  'invoice.delete'?: boolean;
  'invoice.send'?: boolean;
  
  'settings.view'?: boolean;
  'settings.edit'?: boolean;
}

export interface PlanConfiguration {
  planId: number;
  features: {
    client_management?: boolean;
    job_management?: boolean;
    collaborator_management?: boolean;
    activity_tracking?: boolean;
    materials_inventory?: boolean;
    calendar?: boolean;
    invoice_generation?: boolean;
    reports?: boolean;
    notifications?: boolean;
    permissions?: ArtisanPermissions;
  };
}

/**
 * Hook to get user permissions from mobile API
 * Works exactly like mobile permission system
 */
export function useArtisanPermissions() {
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = useQuery({
    queryKey: ["/api/mobile/permissions"],
    queryFn: () => apiRequest("GET", "/api/mobile/permissions").then(res => res.json()),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: planConfig, isLoading: planLoading } = useQuery<PlanConfiguration>({
    queryKey: ["/api/mobile/plan-configuration"],
    queryFn: () => apiRequest("GET", "/api/mobile/plan-configuration").then(res => res.json()),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get permissions from API response - it returns permissions directly AND in permissions object
  const apiPermissions = permissionsData?.permissions || permissionsData || {};
  const planPermissions = planConfig?.features?.permissions || {};
  const features = planConfig?.features || {};
  
  // Merge both permission sources - plan permissions take priority
  const permissions: ArtisanPermissions = {
    ...apiPermissions,
    ...planPermissions
  };

  // Debug logging
  console.log('🔍 useArtisanPermissions Debug:', {
    permissionsData,
    planConfig,
    apiPermissions,
    planPermissions,
    mergedPermissions: permissions,
    features,
    permissionsLoading,
    planLoading
  });

  // Helper functions to check permissions
  const hasPermission = (permission: keyof ArtisanPermissions): boolean => {
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionList: (keyof ArtisanPermissions)[]): boolean => {
    return permissionList.some(permission => permissions[permission] === true);
  };

  const hasAllPermissions = (permissionList: (keyof ArtisanPermissions)[]): boolean => {
    return permissionList.every(permission => permissions[permission] === true);
  };

  const hasFeature = (feature: string): boolean => {
    return features[feature as keyof typeof features] === true;
  };

  // Computed permissions for common checks - check BOTH formats
  const canViewClients = 
    permissions.canViewClients === true || 
    permissions['client.view'] === true || 
    permissions['client.view_all'] === true;
    
  const canCreateClients = 
    permissions.canCreateClients === true || 
    permissions['client.create'] === true;
    
  const canEditClients = 
    permissions.canEditClients === true || 
    permissions['client.edit'] === true;
    
  const canDeleteClients = 
    permissions.canDeleteClients === true || 
    permissions['client.delete'] === true;

  const canViewJobs = 
    permissions.canViewJobs === true || 
    permissions['job.view'] === true || 
    permissions['job.view_all'] === true;
    
  const canCreateJobs = 
    permissions.canCreateJobs === true || 
    permissions['job.create'] === true;
    
  const canEditJobs = 
    permissions.canEditJobs === true || 
    permissions['job.edit'] === true;
    
  const canDeleteJobs = 
    permissions.canDeleteJobs === true || 
    permissions['job.delete'] === true;
    
  const canCompleteJobs = 
    permissions['job.complete'] === true;

  const canManageCollaborators = 
    permissions['collaborator.create'] === true || 
    permissions['collaborator.edit'] === true || 
    permissions['collaborator.delete'] === true;
    
  const canCreateCollaborators = 
    permissions['collaborator.create'] === true;

  const canManageInvoices = 
    permissions['invoice.create'] === true || 
    permissions['invoice.edit'] === true || 
    permissions['invoice.delete'] === true;
    
  const canViewReports = 
    permissions.canViewReports === true || 
    features.reports === true;
    
  const canViewCalendar = 
    features.calendar === true;
    
  const canViewSettings = 
    permissions['settings.view'] === true || 
    permissions['settings.edit'] === true;

  console.log('🎯 Computed Permissions:', {
    rawPermissions: permissions,
    canViewClients,
    canViewJobs,
    canManageCollaborators,
    canManageInvoices,
    canViewReports,
    canViewCalendar,
    canViewSettings
  });

  return {
    // Raw data
    permissions,
    features,
    planConfig,
    
    // Loading states
    isLoading: permissionsLoading || planLoading,
    error: permissionsError,
    
    // Helper functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasFeature,
    
    // Common computed permissions
    canViewClients,
    canCreateClients,
    canEditClients,
    canDeleteClients,
    
    canViewJobs,
    canCreateJobs,
    canEditJobs,
    canDeleteJobs,
    canCompleteJobs,
    
    canManageCollaborators,
    canCreateCollaborators,
    canManageInvoices,
    canViewReports,
    canViewCalendar,
    canViewSettings,
  };
}

