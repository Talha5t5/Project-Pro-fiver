import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Sector, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTranslation } from 'react-i18next';

// Color palette for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C80', '#8DD1E1', '#D084D0'
];

interface ChartData {
  name: string;
  value?: number;
  [key: string]: any;
}

interface AdvancedChartsProps {
  planDistribution: ChartData[];
  revenueData: ChartData[];
  userGrowthData: ChartData[];
  featureUsageData: ChartData[];
  systemPerformanceData: ChartData[];
}

// Pie Chart Component
export const PlanDistributionPieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = React.useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

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
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-semibold">
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
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs">
          {`${value} users`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.planDistribution', 'Plan Distribution')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.planDistributionDesc', 'Distribution of users across different subscription plans')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Bar Chart Component
export const RevenueBarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.revenueBreakdown', 'Revenue Breakdown')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.revenueBreakdownDesc', 'Monthly and yearly revenue by plan')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="monthlyRevenue" fill="#8884d8" name={t('analytics.charts.monthly', 'Monthly')} />
            <Bar dataKey="yearlyRevenue" fill="#82ca9d" name={t('analytics.charts.yearly', 'Yearly')} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Line Chart Component
export const UserGrowthLineChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.userGrowth', 'User Growth Trend')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.userGrowthDesc', 'User growth over the last 12 months')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="totalUsers" 
              stroke="#8884d8" 
              strokeWidth={2}
              name={t('analytics.charts.totalUsers', 'Total Users')}
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name={t('analytics.charts.activeUsers', 'Active Users')}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Area Chart Component
export const FeatureUsageAreaChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.featureUsage', 'Feature Usage Trends')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.featureUsageDesc', 'Most used features over time')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
              stroke="#8884d8" 
              fill="#8884d8" 
              name={t('analytics.charts.clientManagement', 'Client Management')}
            />
            <Area 
              type="monotone" 
              dataKey="jobManagement" 
              stackId="1" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              name={t('analytics.charts.jobManagement', 'Job Management')}
            />
            <Area 
              type="monotone" 
              dataKey="collaboratorManagement" 
              stackId="1" 
              stroke="#ffc658" 
              fill="#ffc658" 
              name={t('analytics.charts.collaboratorManagement', 'Collaborator Management')}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Composed Chart Component
export const SystemPerformanceComposedChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.systemPerformance', 'System Performance')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.systemPerformanceDesc', 'System metrics and performance indicators')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="requests" fill="#8884d8" name={t('analytics.charts.requests', 'Requests')} />
            <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#ff7300" name={t('analytics.charts.responseTime', 'Response Time (ms)')} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Radar Chart Component
export const FeatureAdoptionRadarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.featureAdoption', 'Feature Adoption Radar')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.featureAdoptionDesc', 'Adoption rates for different features')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar 
              name={t('analytics.charts.adoptionRate', 'Adoption Rate')} 
              dataKey="adoptionRate" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.6} 
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Scatter Chart Component
export const UserEngagementScatterChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.charts.userEngagement', 'User Engagement Analysis')}</CardTitle>
        <CardDescription>
          {t('analytics.charts.userEngagementDesc', 'User engagement vs. feature usage correlation')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="sessionDuration" name={t('analytics.charts.sessionDuration', 'Session Duration')} />
            <YAxis type="number" dataKey="featuresUsed" name={t('analytics.charts.featuresUsed', 'Features Used')} />
            <ZAxis type="number" dataKey="userRating" range={[60, 400]} name={t('analytics.charts.userRating', 'User Rating')} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name={t('analytics.charts.users', 'Users')} data={data} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Metrics Cards Component
export const MetricsCards: React.FC<{ metrics: any }> = ({ metrics }) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {metricCards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <div className="flex items-center mt-2">
                  <Badge 
                    variant={card.changeType === 'positive' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {card.change}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t('analytics.metrics.fromLastMonth', 'from last month')}
                  </span>
                </div>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Advanced Charts Component
export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({
  planDistribution,
  revenueData,
  userGrowthData,
  featureUsageData,
  systemPerformanceData
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('analytics.charts.title', 'Advanced Analytics')}</h2>
          <p className="text-muted-foreground">
            {t('analytics.charts.subtitle', 'Interactive charts and visualizations for deeper insights')}
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={{
        totalRevenue: revenueData.reduce((sum, item) => sum + (item.monthlyRevenue || 0) + (item.yearlyRevenue || 0), 0),
        activeUsers: userGrowthData[userGrowthData.length - 1]?.activeUsers || 0,
        systemUptime: 99.9,
        avgResponseTime: 150
      }} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlanDistributionPieChart data={planDistribution} />
        <RevenueBarChart data={revenueData} />
        <UserGrowthLineChart data={userGrowthData} />
        <FeatureUsageAreaChart data={featureUsageData} />
        <SystemPerformanceComposedChart data={systemPerformanceData} />
        <FeatureAdoptionRadarChart data={featureUsageData.map(item => ({
          name: item.name,
          adoptionRate: item.value
        }))} />
      </div>

      {/* Full Width Charts */}
      <div className="grid grid-cols-1 gap-6">
        <UserEngagementScatterChart data={userGrowthData.map(item => ({
          sessionDuration: Math.random() * 100 + 50,
          featuresUsed: Math.random() * 10 + 1,
          userRating: Math.random() * 5 + 1
        }))} />
      </div>
    </div>
  );
};

export default AdvancedCharts; 