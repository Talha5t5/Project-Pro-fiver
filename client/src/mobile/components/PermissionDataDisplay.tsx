import React from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { PermissionGate } from './PermissionGate';

interface PermissionDataDisplayProps {
  data: any;
  dataType: 'client' | 'job' | 'invoice' | 'report';
  children: (filteredData: any) => React.ReactNode;
  fallback?: React.ReactNode;
  showSensitiveData?: boolean;
}

/**
 * Component that automatically filters data based on user permissions
 * and renders the filtered data using the children render prop
 */
export const PermissionDataDisplay: React.FC<PermissionDataDisplayProps> = ({
  data,
  dataType,
  children,
  fallback = null,
  showSensitiveData = false
}) => {
  const { 
    filterClientData, 
    filterJobData, 
    filterInvoiceData, 
    filterReportData 
  } = usePermissions();

  // Filter data based on type and permissions
  const filteredData = React.useMemo(() => {
    if (!data) return null;

    switch (dataType) {
      case 'client':
        return filterClientData(data);
      case 'job':
        return filterJobData(data);
      case 'invoice':
        return filterInvoiceData(data);
      case 'report':
        return filterReportData(data);
      default:
        return data;
    }
  }, [data, dataType, filterClientData, filterJobData, filterInvoiceData, filterReportData]);

  // If no data or filtered data is null, show fallback
  if (!data || !filteredData) {
    return <>{fallback}</>;
  }

  // Render the filtered data using the children render prop
  return <>{children(filteredData)}</>;
};

/**
 * Hook for getting filtered data based on permissions
 */
export const useFilteredData = (data: any, dataType: 'client' | 'job' | 'invoice' | 'report') => {
  const { 
    filterClientData, 
    filterJobData, 
    filterInvoiceData, 
    filterReportData 
  } = usePermissions();

  return React.useMemo(() => {
    if (!data) return null;

    switch (dataType) {
      case 'client':
        return filterClientData(data);
      case 'job':
        return filterJobData(data);
      case 'invoice':
        return filterInvoiceData(data);
      case 'report':
        return filterReportData(data);
      default:
        return data;
    }
  }, [data, dataType, filterClientData, filterJobData, filterInvoiceData, filterReportData]);
};

/**
 * Component for displaying client information with permission-based filtering
 */
export const PermissionClientDisplay: React.FC<{
  client: any;
  children: (filteredClient: any) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ client, children, fallback }) => (
  <PermissionDataDisplay
    data={client}
    dataType="client"
    fallback={fallback}
  >
    {children}
  </PermissionDataDisplay>
);

/**
 * Component for displaying job information with permission-based filtering
 */
export const PermissionJobDisplay: React.FC<{
  job: any;
  children: (filteredJob: any) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ job, children, fallback }) => (
  <PermissionDataDisplay
    data={job}
    dataType="job"
    fallback={fallback}
  >
    {children}
  </PermissionDataDisplay>
);

/**
 * Component for displaying invoice information with permission-based filtering
 */
export const PermissionInvoiceDisplay: React.FC<{
  invoice: any;
  children: (filteredInvoice: any) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ invoice, children, fallback }) => (
  <PermissionDataDisplay
    data={invoice}
    dataType="invoice"
    fallback={fallback}
  >
    {children}
  </PermissionDataDisplay>
);

/**
 * Component for displaying report information with permission-based filtering
 */
export const PermissionReportDisplay: React.FC<{
  report: any;
  children: (filteredReport: any) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ report, children, fallback }) => (
  <PermissionDataDisplay
    data={report}
    dataType="report"
    fallback={fallback}
  >
    {children}
  </PermissionDataDisplay>
);

/**
 * Utility component for showing/hiding sensitive information
 */
export const SensitiveDataGate: React.FC<{
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
  data?: any;
}> = ({ children, permission, fallback = null, data }) => (
  <PermissionGate permission={permission} fallback={fallback}>
    {children}
  </PermissionGate>
);

/**
 * Component for displaying financial information only to authorized users
 */
export const FinancialDataDisplay: React.FC<{
  amount: number;
  currency?: string;
  children?: (formattedAmount: string) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ amount, currency = '€', children, fallback = '***' }) => {
  const { hasPermission } = usePermissions();
  
  const canViewFinancials = hasPermission('canViewJobFinancials') || 
                           hasPermission('canViewInvoiceAmounts') || 
                           hasPermission('canViewFinancialReports');

  if (!canViewFinancials) {
    return <>{fallback}</>;
  }

  const formattedAmount = `${amount.toFixed(2)} ${currency}`;
  
  if (children) {
    return <>{children(formattedAmount)}</>;
  }
  
  return <span className="font-mono">{formattedAmount}</span>;
};

export default PermissionDataDisplay; 