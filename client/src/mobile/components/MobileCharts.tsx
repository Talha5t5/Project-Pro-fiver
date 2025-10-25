import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Sector, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useTranslation } from 'react-i18next';

// Mobile-optimized color palette
const MOBILE_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16'
];

interface ChartData {
  name: string;
  value?: number;
  [key: string]: any;
}

interface MobileChartsProps {
  planDistribution: ChartData[];
  revenueData: ChartData[];
  userGrowthData: ChartData[];
  featureUsageData: ChartData[];
  systemPerformanceData: ChartData[];
}

// Mobile-optimized Pie Chart
export const MobilePieChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontSize: 14, fontWeight: 'bold' }}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" style={{ fontSize: 12 }}>
          {`${value} users`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" style={{ fontSize: 12 }}>
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl p-4 my-2 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={MOBILE_COLORS[index % MOBILE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mobile-optimized Bar Chart
export const MobileBarChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-4 my-2 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="monthlyRevenue" fill={MOBILE_COLORS[0]} name={t('analytics.charts.monthly', 'Monthly')} />
          <Bar dataKey="yearlyRevenue" fill={MOBILE_COLORS[1]} name={t('analytics.charts.yearly', 'Yearly')} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mobile-optimized Line Chart
export const MobileLineChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-4 my-2 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="totalUsers" 
            stroke={MOBILE_COLORS[0]} 
            strokeWidth={3}
            name={t('analytics.charts.totalUsers', 'Total Users')}
          />
          <Line 
            type="monotone" 
            dataKey="activeUsers" 
            stroke={MOBILE_COLORS[1]} 
            strokeWidth={3}
            name={t('analytics.charts.activeUsers', 'Active Users')}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mobile-optimized Area Chart
export const MobileAreaChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-4 my-2 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="clientManagement" 
            stackId="1" 
            stroke={MOBILE_COLORS[0]} 
            fill={MOBILE_COLORS[0]} 
            name={t('analytics.charts.clientManagement', 'Client Management')}
          />
          <Area 
            type="monotone" 
            dataKey="jobManagement" 
            stackId="1" 
            stroke={MOBILE_COLORS[1]} 
            fill={MOBILE_COLORS[1]} 
            name={t('analytics.charts.jobManagement', 'Job Management')}
          />
          <Area 
            type="monotone" 
            dataKey="collaboratorManagement" 
            stackId="1" 
            stroke={MOBILE_COLORS[2]} 
            fill={MOBILE_COLORS[2]} 
            name={t('analytics.charts.collaboratorManagement', 'Collaborator Management')}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mobile-optimized Radar Chart
export const MobileRadarChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl p-4 my-2 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-center">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar 
            name={t('analytics.charts.adoptionRate', 'Adoption Rate')} 
            dataKey="adoptionRate" 
            stroke={MOBILE_COLORS[0]} 
            fill={MOBILE_COLORS[0]} 
            fillOpacity={0.6} 
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mobile Metrics Cards
export const MobileMetricsCards: React.FC<{ metrics: any }> = ({ metrics }) => {
  const { t } = useTranslation();

  const metricCards = [
    {
      title: t('analytics.metrics.totalRevenue', 'Total Revenue'),
      value: `$${metrics.totalRevenue?.toFixed(2) || '0.00'}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: '💰'
    },
    {
      title: t('analytics.metrics.activeUsers', 'Active Users'),
      value: metrics.activeUsers || 0,
      change: '+8.2%',
      changeType: 'positive',
      icon: '👥'
    },
    {
      title: t('analytics.metrics.systemUptime', 'System Uptime'),
      value: `${metrics.systemUptime || 99.9}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: '⚡'
    },
    {
      title: t('analytics.metrics.avgResponseTime', 'Avg Response Time'),
      value: `${metrics.avgResponseTime || 150}ms`,
      change: '-5.2%',
      changeType: 'positive',
      icon: '⏱️'
    }
  ];

  return (
    <div className="flex overflow-x-scroll no-scrollbar my-2">
      {metricCards.map((card, index) => (
        <div 
          key={index} 
          className="bg-white rounded-xl p-4 m-2 min-w-[150px] shadow-md"
        >
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                {card.title}
              </p>
              <p className="text-2xl font-bold mb-2">
                {card.value}
              </p>
              <div className="flex items-center">
                <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                  <p>
                    {card.change}
                  </p>
                </div>
                <p className="text-xs text-gray-600 ml-2">
                  {t('analytics.metrics.fromLastMonth', 'from last month')}
                </p>
              </div>
            </div>
            <p className="text-4xl">{card.icon}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Mobile Charts Component
export const MobileCharts: React.FC<MobileChartsProps> = ({
  planDistribution,
  revenueData,
  userGrowthData,
  featureUsageData,
  systemPerformanceData
}) => {
  const { t } = useTranslation();
  const [activeChart, setActiveChart] = useState('overview');

  const chartTabs = [
    { id: 'overview', title: t('analytics.tabs.overview', 'Overview') },
    { id: 'revenue', title: t('analytics.tabs.revenue', 'Revenue') },
    { id: 'users', title: t('analytics.tabs.users', 'Users') },
    { id: 'features', title: t('analytics.tabs.features', 'Features') },
    { id: 'performance', title: t('analytics.tabs.performance', 'Performance') }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white p-4 shadow-md">
        <h2 className="text-2xl font-bold mb-2">
          {t('analytics.charts.title', 'Advanced Analytics')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('analytics.charts.subtitle', 'Interactive charts and visualizations for deeper insights')}
        </p>
      </div>

      {/* Metrics Cards */}
      <MobileMetricsCards metrics={{
        totalRevenue: revenueData.reduce((sum, item) => sum + (item.monthlyRevenue || 0) + (item.yearlyRevenue || 0), 0),
        activeUsers: userGrowthData[userGrowthData.length - 1]?.activeUsers || 0,
        systemUptime: 99.9,
        avgResponseTime: 150
      }} />

      {/* Chart Tabs */}
      <div className="bg-white p-2">
        <div className="flex overflow-x-scroll no-scrollbar">
          {chartTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`px-4 py-2 mx-1 rounded-full text-sm font-medium transition-colors ${
                activeChart === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeChart === 'overview' && (
          <MobilePieChart 
            data={planDistribution} 
            title={t('analytics.charts.planDistribution', 'Plan Distribution')} 
          />
        )}
        
        {activeChart === 'revenue' && (
          <MobileBarChart 
            data={revenueData} 
            title={t('analytics.charts.revenueBreakdown', 'Revenue Breakdown')} 
          />
        )}
        
        {activeChart === 'users' && (
          <MobileLineChart 
            data={userGrowthData} 
            title={t('analytics.charts.userGrowth', 'User Growth Trend')} 
          />
        )}
        
        {activeChart === 'features' && (
          <MobileAreaChart 
            data={featureUsageData} 
            title={t('analytics.charts.featureUsage', 'Feature Usage Trends')} 
          />
        )}
        
        {activeChart === 'performance' && (
          <MobileRadarChart 
            data={featureUsageData.map(item => ({
              name: item.name,
              adoptionRate: item.value
            }))} 
            title={t('analytics.charts.featureAdoption', 'Feature Adoption Radar')} 
          />
        )}
      </div>
    </div>
  );
};

export default MobileCharts; 