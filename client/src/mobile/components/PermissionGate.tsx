import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { MobilePermissions } from '../contexts/PermissionContext';

interface PermissionGateProps {
  children: React.ReactNode;
  permission: keyof MobilePermissions;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  permissions?: (keyof MobilePermissions)[];
}

export default function PermissionGate({ 
  children, 
  permission, 
  fallback = null, 
  requireAll = false,
  permissions = []
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // If specific permissions array is provided, use that
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // Otherwise use single permission
  const hasAccess = hasPermission(permission);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common permission checks
export function CanView({ children, fallback = null, ...props }: Omit<PermissionGateProps, 'permission'>) {
  return (
    <PermissionGate permission="canViewSettings" {...props}>
      {children}
    </PermissionGate>
  );
}

export function CanEdit({ children, fallback = null, ...props }: Omit<PermissionGateProps, 'permission'>) {
  return (
    <PermissionGate permission="canEditSettings" {...props}>
      {children}
    </PermissionGate>
  );
}

export function CanCreate({ children, fallback = null, ...props }: Omit<PermissionGateProps, 'permission'>) {
  return (
    <PermissionGate permission="canCreateSettings" {...props}>
      {children}
    </PermissionGate>
  );
}

export function CanDelete({ children, fallback = null, ...props }: Omit<PermissionGateProps, 'permission'>) {
  return (
    <PermissionGate permission="canDeleteSettings" {...props}>
      {children}
    </PermissionGate>
  );
}