import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DashboardStats {
  activeJobs: number;
  totalClients: number;
  completedJobs: number;
  monthlyIncome: number;
}

interface TodayJob {
  id: number;
  title: string;
  clientId: number;
  startDate: string;
  duration: number;
  type: string;
  status: string;
  location: string;
  client: {
    name: string;
    id?: number;
  };
}

interface DashboardData {
  stats: DashboardStats;
  todayJobs: TodayJob[];
}

// Questo componente è obsoleto e verrà sostituito dalla versione mobile
export function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/stats']
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-neutral-200 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 h-24 animate-pulse"></div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow mb-6 h-96 animate-pulse"></div>
        <div className="bg-white rounded-lg shadow h-80 animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-4 text-red-500">Error loading dashboard data</div>;
  }

  const { stats, todayJobs } = data;

  function getJobBorderColor(type: string): string {
    switch (type) {
      case 'repair':
        return 'border-blue-600';
      case 'installation':
        return 'border-yellow-500';
      case 'maintenance':
        return 'border-green-500';
      case 'quote':
        return 'border-purple-500';
      case 'emergency':
        return 'border-red-500';
      default:
        return 'border-neutral-500';
    }
  }

  function getJobTime(job: TodayJob): string {
    const startTime = new Date(job.startDate);
    const endTime = new Date(startTime.getTime() + job.duration * 60 * 60 * 1000);
    
    const startFormatted = format(startTime, 'HH:mm');
    const endFormatted = format(endTime, 'HH:mm');
    
    return `${startFormatted} - ${endFormatted}`;
  }

  function getJobBgColor(type: string): string {
    switch (type) {
      case 'repair':
        return 'bg-blue-600';
      case 'installation':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-green-500';
      case 'quote':
        return 'bg-purple-500';
      case 'emergency':
        return 'bg-red-500';
      default:
        return 'bg-neutral-500';
    }
  }

  return (
    <div id="dashboard-tab" className="tab-content p-4">
      <h1 className="text-2xl font-semibold text-blue-800 mb-6">Benvenuto, Marco</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-neutral-500 text-sm">Lavori Attivi</p>
          <p className="text-2xl font-semibold">{stats.activeJobs}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-neutral-500 text-sm">Clienti Totali</p>
          <p className="text-2xl font-semibold">{stats.totalClients}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-neutral-500 text-sm">Lavori Completati</p>
          <p className="text-2xl font-semibold">{stats.completedJobs}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-neutral-500 text-sm">Incasso Mensile</p>
          <p className="text-2xl font-semibold">€{stats.monthlyIncome.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
      </div>
      
      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold">Impegni di oggi</h2>
        </div>
        <div className="p-4">
          {todayJobs.length === 0 ? (
            <p className="text-neutral-500">Non ci sono impegni per oggi</p>
          ) : (
            todayJobs.map(job => (
              <div key={job.id} className={`border-l-4 ${getJobBorderColor(job.type)} p-3 mb-3`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{job.title}</h3>
                  <span className={`text-sm ${getJobBgColor(job.type)} text-white px-2 py-1 rounded`}>
                    {getJobTime(job)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-neutral-600 mb-1">
                  <span className="material-icons text-sm mr-1">person</span>
                  <span>{job.client.name}</span>
                </div>
                <div className="flex items-center text-sm text-neutral-600">
                  <span className="material-icons text-sm mr-1">location_on</span>
                  <span>{job.location}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold">Attività recenti</h2>
        </div>
        <div className="divide-y divide-neutral-200">
          <div className="p-4 flex items-start">
            <span className="material-icons text-green-500 mr-3">check_circle</span>
            <div>
              <p className="font-medium">Lavoro completato: Sostituzione caldaia</p>
              <p className="text-sm text-neutral-500">Ieri alle 16:45 - Cliente: Famiglia Neri</p>
            </div>
          </div>
          <div className="p-4 flex items-start">
            <span className="material-icons text-blue-600 mr-3">person_add</span>
            <div>
              <p className="font-medium">Nuovo cliente aggiunto: Luca Bianchi</p>
              <p className="text-sm text-neutral-500">2 giorni fa - Contatto: 345 123 4567</p>
            </div>
          </div>
          <div className="p-4 flex items-start">
            <span className="material-icons text-yellow-500 mr-3">schedule</span>
            <div>
              <p className="font-medium">Appuntamento riprogrammato: Riparazione perdita</p>
              <p className="text-sm text-neutral-500">3 giorni fa - Cliente: Paolo Rossi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
