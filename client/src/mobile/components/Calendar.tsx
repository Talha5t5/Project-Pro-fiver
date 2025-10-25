import React, { useState } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import MobileLayout from './MobileLayout';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Button } from '../../components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';

interface Job {
  id: number;
  title: string;
  clientId: number;
  type: string;
  status: string;
  startDate: string;
  client?: {
    name: string;
  };
  location: string;
  duration: number;
}

export default function MobileCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  // Calcola gli estremi della data in base alla modalità di visualizzazione
  const getDateRange = () => {
    if (viewMode === 'day') {
      const start = format(selectedDate, 'yyyy-MM-dd');
      const end = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      return { start, end };
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd')
      };
    } else {
      // Mese (Da implementare se necessario)
      return {
        start: format(selectedDate, 'yyyy-MM-01'),
        end: format(addDays(selectedDate, 31), 'yyyy-MM-dd')
      };
    }
  };
  
  const { start, end } = getDateRange();
  
  // Query per ottenere i lavori nel range di date
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs/range', { start, end }],
    queryFn: async ({ queryKey }) => {
      const [_, { start, end }] = queryKey as [string, { start: string, end: string }];
      const response = await fetch(`/api/jobs/range?start=${start}&end=${end}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    }
  });
  
  // Query per clienti (per associare nomi ai job)
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: jobs.length > 0
  });
  
  // Combina job con nomi clienti
  const jobsWithClients = jobs.map(job => {
    const client = (clients as any[]).find(c => c.id === job.clientId);
    return {
      ...job,
      client: {
        name: client ? client.name : 'Cliente sconosciuto'
      }
    };
  });
  
  // Gestione della navigazione tra le date
  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7));
    } else {
      // Mese (Da implementare se necessario)
    }
  };
  
  // Formattazione della data visualizzata
  const getFormattedDateDisplay = () => {
    if (viewMode === 'day') {
      return format(selectedDate, 'EEEE d MMMM yyyy', { locale: it });
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd')} - ${format(weekEnd, 'd')} ${format(weekEnd, 'MMMM yyyy', { locale: it })}`;
    } else {
      return format(selectedDate, 'MMMM yyyy', { locale: it });
    }
  };
  
  // Helper per colori in base al tipo di lavoro
  const getJobColor = (type: string) => {
    switch (type) {
      case 'repair': return 'border-blue-600';
      case 'installation': return 'border-yellow-500';
      case 'maintenance': return 'border-green-500';
      case 'quote': return 'border-purple-500';
      case 'emergency': return 'border-red-500';
      default: return 'border-neutral-500';
    }
  };
  
  // Helper per ottenere orario
  const getJobTime = (job: Job) => {
    const startTime = new Date(job.startDate);
    const endTime = new Date(startTime.getTime() + job.duration * 60 * 60 * 1000);
    
    return {
      start: format(startTime, 'HH:mm'),
      end: format(endTime, 'HH:mm')
    };
  };
  
  return (
    <MobileLayout title="Calendario">
      <div className="p-4">
        {/* Controlli di navigazione e vista */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium">{getFormattedDateDisplay()}</span>
              <Button variant="ghost" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nuovo
            </Button>
          </div>
          
          <div className="flex rounded-lg overflow-hidden border divide-x">
            <button 
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'day' ? "bg-blue-600 text-white" : "bg-white"
              )}
              onClick={() => setViewMode('day')}
            >
              Giorno
            </button>
            <button 
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'week' ? "bg-blue-600 text-white" : "bg-white"
              )}
              onClick={() => setViewMode('week')}
            >
              Settimana
            </button>
            <button 
              className={cn(
                "flex-1 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'month' ? "bg-blue-600 text-white" : "bg-white"
              )}
              onClick={() => setViewMode('month')}
            >
              Mese
            </button>
          </div>
        </div>
        
        {/* Visualizzazione dei lavori del giorno/settimana */}
        <ScrollArea className="h-[calc(100vh-210px)]">
          {isLoading ? (
            <div className="p-4 text-center">Caricamento...</div>
          ) : viewMode === 'day' && jobsWithClients.length === 0 ? (
            <div className="mt-8 text-center p-4">
              <p className="text-gray-500 mb-2">Nessun impegno in questo giorno</p>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi impegno
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'day' && (
                jobsWithClients
                  .filter(job => format(new Date(job.startDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(job => {
                    const time = getJobTime(job);
                    return (
                      <div 
                        key={job.id}
                        className="bg-white rounded-lg shadow overflow-hidden"
                      >
                        <div className="p-3 flex justify-between items-center bg-gray-50 border-b">
                          <span className="font-medium">{time.start} - {time.end}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600/10 text-primary`}>
                            {job.duration} {job.duration === 1 ? 'ora' : 'ore'}
                          </span>
                        </div>
                        
                        <div className="p-3">
                          <div className={`pl-3 border-l-4 ${getJobColor(job.type)}`}>
                            <h3 className="font-medium line-clamp-1">{job.title}</h3>
                            <div className="flex flex-col text-sm text-neutral-600 mt-2 space-y-1">
                              <div className="flex items-center">
                                <span className="material-icons text-sm mr-2">person</span>
                                <span className="line-clamp-1">{job.client?.name}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="material-icons text-sm mr-2">location_on</span>
                                <span className="line-clamp-1">{job.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i);
                    const dayJobs = jobsWithClients.filter(job => 
                      format(new Date(job.startDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    );
                    
                    return (
                      <div key={i} className="border rounded min-h-[100px]">
                        <div className="p-1 text-center text-sm font-medium border-b bg-gray-50">
                          {format(day, 'EEE d', { locale: it })}
                        </div>
                        <div className="p-1">
                          {dayJobs.length > 0 ? (
                            dayJobs
                              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                              .map(job => {
                                const time = getJobTime(job);
                                return (
                                  <div 
                                    key={job.id} 
                                    className={`text-xs p-1 mb-1 rounded border-l-2 ${getJobColor(job.type)} bg-gray-50`}
                                  >
                                    <div className="font-medium line-clamp-1">{job.title}</div>
                                    <div className="text-neutral-500">{time.start}</div>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-xs text-neutral-400">Nessun impegno</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </MobileLayout>
  );
}