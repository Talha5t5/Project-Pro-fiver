import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { JobCompletion } from '../components/ui/job-completion';
import { JobActivityRegistration } from '../components/ui/job-activity-registration';

interface Job {
  id: number;
  title: string;
  clientId: number;
  type: string;
  status: string;
  startDate: string;
  duration: number;
  hourlyRate: number;
  materialsCost: number;
  location: string;
  notes: string;
}

interface Client {
  id: number;
  name: string;
}

interface JobType {
  id: number;
  name: string;
  description: string | null;
}

interface JobsProps {
  isRegistrationMode?: boolean;
}

export function Jobs({ isRegistrationMode = false }: JobsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState(0); // 0 significa tutte le attività
  const [statusFilter, setStatusFilter] = useState(isRegistrationMode ? 'in_progress' : 'all'); // Mostriamo di default tutti i lavori
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs']
  });
  
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients']
  });
  
  const { data: jobTypes = [], isLoading: jobTypesLoading } = useQuery<JobType[]>({
    queryKey: ['/api/jobtypes']
  });
  
  // Query per ottenere le attività
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<any[]>({
    queryKey: ['/api/activities'],
    enabled: !!jobTypes.length,
    queryFn: async () => {
      const response = await fetch('/api/activities', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Errore nel recupero delle attività: ${response.statusText}`);
      }
      return await response.json();
    }
  });
  
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };
  
  const getJobTypeName = (type: string) => {
    // Se è un tipo standard predefinito
    switch(type) {
      case 'repair': return 'Riparazione';
      case 'installation': return 'Installazione';
      case 'maintenance': return 'Manutenzione';
      case 'quote': return 'Preventivo';
      case 'emergency': return 'Emergenza';
      default: {
        // Altrimenti potrebbe essere un ID di JobType personalizzato
        const numericId = parseInt(type);
        if (!isNaN(numericId)) {
          const jobType = jobTypes.find(jt => jt.id === numericId);
          return jobType ? jobType.name : type;
        }
        return type;
      }
    }
  };
  
  // Funzione per ottenere le attività associate ad un job
  const getJobActivities = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/activities`);
      if (!response.ok) throw new Error('Errore nel recupero delle attività');
      return await response.json();
    } catch (error) {
      console.error('Errore nel recupero delle attività:', error);
      return [];
    }
  };

  // Ordina i lavori per data
  const sortedJobs = [...jobs].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
  
  const filteredJobs = sortedJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClientName(job.clientId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    
    // Per ora non filtriamo per attività poiché richiederebbe query aggiuntive
    // In un'implementazione reale, si dovrebbe utilizzare un endpoint che restituisca
    // i lavori con le attività filtrate già pronte
    
    return matchesSearch && matchesType && matchesStatus;
  });
  
  const handleViewDetails = (job: Job) => {
    toast({
      title: "Dettagli lavoro",
      description: `Visualizzazione dettagli per ${job.title}`,
    });
  };
  
  const getJobStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-600';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-neutral-500';
    }
  };
  
  const getJobStatusName = (status: string) => {
    switch(status) {
      case 'scheduled': return 'Programmato';
      case 'in_progress': return 'In corso';
      case 'completed': return 'Completato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };
  
  const formatDateTime = (dateString: string, duration: number) => {
    const date = new Date(dateString);
    const endTime = new Date(date.getTime() + duration * 60 * 60 * 1000);
    
    return `${format(date, 'd MMMM, yyyy', { locale: it })} • ${format(date, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
  };
  
  const calculateTotalPrice = (job: Job) => {
    const laborCost = job.hourlyRate * job.duration;
    const totalCost = laborCost + job.materialsCost;
    return totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const isLoading = jobsLoading || clientsLoading || jobTypesLoading;

  return (
    <div id="jobs-tab" className="tab-content p-4">
      <div className="flex justify-between items-center mb-6">
        {!isRegistrationMode && (
          <button 
            className="flex items-center space-x-1 bg-blue-800 text-white px-3 py-2 rounded-lg ml-auto"
            onClick={() => document.dispatchEvent(new CustomEvent('openModal', { detail: 'new-job-modal' }))}
          >
            <span className="material-icons text-sm">add</span>
            <span>Nuovo Lavoro</span>
          </button>
        )}
      </div>
      
      {isRegistrationMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="material-icons text-blue-800 mr-3">info</span>
            <div>
              <h3 className="font-medium text-blue-800">Registrazione dei lavori in corso</h3>
              <p className="text-sm text-blue-700 mt-1">
                Seleziona un lavoro per registrare le attività completate, i materiali utilizzati, 
                e compilare i dettagli necessari per la fatturazione.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons text-neutral-400">search</span>
            </span>
            <input 
              type="text" 
              placeholder="Cerca lavori, clienti, luoghi..." 
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <select 
              className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setActivityFilter(0); // Resetta il filtro attività quando cambia il tipo
              }}
            >
              <option value="all">Tutti i tipi</option>
              <option value="repair">Riparazione</option>
              <option value="installation">Installazione</option>
              <option value="maintenance">Manutenzione</option>
              <option value="quote">Preventivo</option>
              <option value="emergency">Emergenza</option>
              {jobTypes.map(jobType => (
                <option key={jobType.id} value={jobType.id.toString()}>{jobType.name}</option>
              ))}
            </select>
            
            <select 
              className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={activityFilter}
              onChange={(e) => setActivityFilter(Number(e.target.value))}
            >
              <option value="0">Tutte le attività</option>
              {activities
                .filter(a => typeFilter === 'all' || a.jobTypeId.toString() === typeFilter || (a.jobTypeIds && a.jobTypeIds.includes(typeFilter)))
                .map(activity => (
                  <option key={activity.id} value={activity.id.toString()}>
                    {activity.name}
                  </option>
                ))
              }
            </select>
            
            <select 
              className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {!isRegistrationMode && <option value="all">Tutti gli stati</option>}
              <option value="scheduled">Programmato</option>
              <option value="in_progress">In corso</option>
              {!isRegistrationMode && <option value="completed">Completato</option>}
              {!isRegistrationMode && <option value="cancelled">Annullato</option>}
            </select>
          </div>
        </div>
      </div>
      
      {/* Job list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow h-48 animate-pulse"></div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-icons text-5xl text-neutral-300">work</span>
          <p className="mt-2 text-neutral-500">Nessun lavoro trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <span className={`${getJobStatusColor(job.status)} text-white text-xs px-2 py-1 rounded`}>
                    {getJobStatusName(job.status)}
                  </span>
                </div>
                <p className="text-neutral-600 text-sm mt-1">Cliente: {getClientName(job.clientId)}</p>
                <p className="text-neutral-600 text-sm">Tipo: {getJobTypeName(job.type)}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="material-icons text-neutral-500">calendar_today</span>
                  <span>{formatDateTime(job.startDate, job.duration)}</span>
                </div>
                {job.location && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="material-icons text-neutral-500">location_on</span>
                    <span>{job.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-neutral-500">attach_money</span>
                  <span>€{calculateTotalPrice(job)} • Materiali: €{job.materialsCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="bg-neutral-50 p-3 border-t border-neutral-200 flex justify-end space-x-2">
                <button 
                  className="bg-blue-800 text-white px-3 py-1 rounded text-sm"
                  onClick={() => handleViewDetails(job)}
                >
                  Dettagli
                </button>
                
                {isRegistrationMode ? (
                  <JobActivityRegistration
                    job={{...job, client: { name: getClientName(job.clientId) }}}
                    onCompleted={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
                    }}
                  />
                ) : (
                  <>
                    {job.status !== 'completed' && job.status !== 'cancelled' && (
                      <JobCompletion 
                        job={{...job, client: { name: getClientName(job.clientId) }}} 
                        onCompleted={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
                        }}
                      />
                    )}
                    {job.status === 'completed' && (
                      <button className="bg-neutral-200 text-neutral-600 px-3 py-1 rounded text-sm">
                        Fattura
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
