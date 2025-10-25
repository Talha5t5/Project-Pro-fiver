import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'project' | 'client' | 'payment' | 'task';
  title: string;
  description: string;
  time: string;
  status: 'completed' | 'pending' | 'overdue';
}

interface DashboardOverviewProps {
  stats?: StatCard[];
  recentActivities?: RecentActivity[];
  onViewAll?: () => void;
}

const defaultStats: StatCard[] = [
  {
    title: 'Progetti Attivi',
    value: '24',
    change: 12.5,
    changeType: 'increase',
    icon: <Target className="w-5 h-5" />,
    color: 'blue'
  },
  {
    title: 'Clienti Totali',
    value: '156',
    change: 8.2,
    changeType: 'increase',
    icon: <Users className="w-5 h-5" />,
    color: 'green'
  },
  {
    title: 'Fatturato Mensile',
    value: '€12,450',
    change: 15.3,
    changeType: 'increase',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'purple'
  },
  {
    title: 'Ore Lavorate',
    value: '1,247',
    change: 3.1,
    changeType: 'decrease',
    icon: <Clock className="w-5 h-5" />,
    color: 'orange'
  }
];

const defaultActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'project',
    title: 'Progetto Website Aziendale',
    description: 'Completato il design della homepage',
    time: '2 ore fa',
    status: 'completed'
  },
  {
    id: '2',
    type: 'client',
    title: 'Nuovo Cliente: TechCorp',
    description: 'Registrato nuovo cliente enterprise',
    time: '4 ore fa',
    status: 'completed'
  },
  {
    id: '3',
    type: 'payment',
    title: 'Pagamento Ricevuto',
    description: '€2,500 da Client ABC',
    time: '6 ore fa',
    status: 'completed'
  },
  {
    id: '4',
    type: 'task',
    title: 'Revisione Database',
    description: 'Scadenza tra 2 giorni',
    time: '1 giorno fa',
    status: 'pending'
  },
  {
    id: '5',
    type: 'project',
    title: 'App Mobile iOS',
    description: 'Test di integrazione in corso',
    time: '2 giorni fa',
    status: 'pending'
  }
];

export default function DashboardOverview({ 
  stats = defaultStats, 
  recentActivities = defaultActivities,
  onViewAll 
}: DashboardOverviewProps) {
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Target className="w-4 h-4" />;
      case 'client':
        return <Users className="w-4 h-4" />;
      case 'payment':
        return <DollarSign className="w-4 h-4" />;
      case 'task':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === 'increase' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs mese scorso</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Azioni Rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Nuovo Progetto
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Aggiungi Cliente
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Target className="w-4 h-4 mr-2" />
              Crea Attività
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="w-4 h-4 mr-2" />
              Nuova Fattura
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attività Recenti</CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Vedi Tutte
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                        {activity.status === 'completed' && 'Completato'}
                        {activity.status === 'pending' && 'In Corso'}
                        {activity.status === 'overdue' && 'In Ritardo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <div className="flex items-center mt-2">
                      {getStatusIcon(activity.status)}
                      <span className="text-xs text-gray-500 ml-1">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance del Mese</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Obiettivo Progetti</span>
                <span className="text-sm font-medium">24/30</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Obiettivo Fatturato</span>
                <span className="text-sm font-medium">€12,450/€15,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '83%' }}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Soddisfazione Clienti</span>
                <span className="text-sm font-medium">4.8/5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '96%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossime Scadenze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Revisione Database</p>
                  <p className="text-xs text-gray-600">Scadenza: 2 giorni</p>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Urgente
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Presentazione Progetto</p>
                  <p className="text-xs text-gray-600">Scadenza: 5 giorni</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  In Corso
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Fattura Client ABC</p>
                  <p className="text-xs text-gray-600">Scadenza: 1 settimana</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Pianificato
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 