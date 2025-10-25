import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface AnalyticsData {
  totalUsers: number;
  activeJobs: number;
  totalRevenue: number;
  monthlyGrowth: number;
  topClients: Array<{
    name: string;
    revenue: number;
  }>;
  jobTypes: Array<{
    name: string;
    count: number;
  }>;
}

const Analytics: React.FC = () => {
  const { t } = useTranslation();

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['mobile-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-base text-gray-600">
          {t('analytics.loading', 'Loading analytics...')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg text-red-500 mb-4">
            {t('analytics.error.title', 'Error Loading Analytics')}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('analytics.error.message', 'Unable to load analytics data. Please try again.')}
          </p>
          <button
            onClick={() => refetch()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            {t('analytics.error.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <p className="text-base text-gray-600">
          {t('analytics.noData', 'No analytics data available')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-2xl font-bold text-indigo-600">{analyticsData.totalUsers}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Active Jobs</h3>
            <p className="text-2xl font-bold text-green-600">{analyticsData.activeJobs}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-2xl font-bold text-blue-600">€{analyticsData.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Monthly Growth</h3>
            <p className="text-2xl font-bold text-purple-600">{analyticsData.monthlyGrowth}%</p>
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Clients</h3>
          <div className="space-y-3">
            {analyticsData.topClients.map((client, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{client.name}</span>
                <span className="font-semibold text-green-600">€{client.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Job Types */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Types</h3>
          <div className="space-y-3">
            {analyticsData.jobTypes.map((jobType, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{jobType.name}</span>
                <span className="font-semibold text-indigo-600">{jobType.count} jobs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 