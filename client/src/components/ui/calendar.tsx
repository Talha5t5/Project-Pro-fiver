import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useCallback } from 'react';
import { useCalendar } from '../../hooks/use-calendar';
import { cn } from '../../lib/utils';
import { CalendarJobModal } from './calendar-job-modal';
import { JobCompletion } from './job-completion';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './dialog';

interface Job {
  id: number;
  title: string;
  clientId: number;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  duration: number;
  hourlyRate: number;
  materialsCost: number;
  location: string;
  notes: string;
  client?: {
    name: string;
  };
}

// Questo componente è obsoleto e verrà sostituito dalla versione mobile
export function Calendar() {
  const { calendarView, setCalendarView, currentDate, setCurrentDate } = useCalendar();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  
  const start = calendarView === 'month' 
    ? format(startOfMonth(currentDate), 'yyyy-MM-dd')
    : calendarView === 'week'
      ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(currentDate, 'yyyy-MM-dd');
  
  const end = calendarView === 'month'
    ? format(endOfMonth(currentDate), 'yyyy-MM-dd')
    : calendarView === 'week'
      ? format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(addDays(currentDate, 1), 'yyyy-MM-dd');
  
  const { data: jobs = [], isLoading, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs/range', { start, end }],
    queryFn: async ({ queryKey }) => {
      const [_, { start, end }] = queryKey as [string, { start: string, end: string }];
      const response = await fetch(`/api/jobs/range?start=${start}&end=${end}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    }
  });
  
  // Query for client data to associate with jobs
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: jobs.length > 0
  });
  
  // Combine jobs with their client names and calculate progress
  const jobsWithClients = jobs.map(job => {
    const client = clients.find((c: any) => c.id === job.clientId);
    
    // Calculate progress percentage
    const now = new Date();
    const jobStartDate = new Date(job.startDate);
    let jobEndDate;
    
    if (job.endDate) {
      jobEndDate = new Date(job.endDate);
    } else if (job.duration) {
      jobEndDate = new Date(jobStartDate.getTime());
      jobEndDate.setHours(jobEndDate.getHours() + job.duration);
    } else {
      jobEndDate = new Date(jobStartDate.getTime());
      jobEndDate.setHours(23, 59, 59);
    }
    
    let progressPercentage = 0;
    if (job.status === "completed") {
      progressPercentage = 100;
    } else if (job.status === "cancelled") {
      progressPercentage = 0;
    } else if (now >= jobStartDate && now <= jobEndDate) {
      // Job is in progress, calculate percentage based on time elapsed
      const totalDuration = jobEndDate.getTime() - jobStartDate.getTime();
      const elapsedTime = now.getTime() - jobStartDate.getTime();
      progressPercentage = Math.min(Math.max((elapsedTime / totalDuration) * 100, 0), 100);
    } else if (now > jobEndDate) {
      // Job should be completed but status is not updated
      progressPercentage = 100;
    }
    
    return {
      ...job,
      client: {
        name: client ? client.name : 'Cliente Sconosciuto'
      },
      progressPercentage: Math.round(progressPercentage)
    };
  });
  
  const handlePrevious = () => {
    if (calendarView === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };
  
  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };
  
  // Helper function to format date for display
  const formatDisplayDate = () => {
    if (calendarView === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: it });
    } else if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      if (isSameMonth(weekStart, weekEnd)) {
        return `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy', { locale: it })}`;
      } else {
        return `${format(weekStart, 'd MMMM', { locale: it })} - ${format(weekEnd, 'd MMMM yyyy', { locale: it })}`;
      }
    } else {
      return format(currentDate, 'EEEE, d MMMM', { locale: it });
    }
  };
  
  // Helper to get color based on job type
  const getJobColor = (type: string) => {
    switch (type) {
      case 'repair': return 'bg-blue-600';
      case 'installation': return 'bg-yellow-500';
      case 'maintenance': return 'bg-green-500';
      case 'quote': return 'bg-purple-500';
      case 'emergency': return 'bg-red-500';
      default: return 'bg-neutral-500';
    }
  };

  // Helper to get human-readable job type
  const getJobTypeName = (type: string) => {
    switch (type) {
      case 'repair': return 'Riparazione';
      case 'installation': return 'Installazione';
      case 'maintenance': return 'Manutenzione';
      case 'quote': return 'Preventivo';
      case 'emergency': return 'Emergenza';
      default: return type;
    }
  };

  // Helper to get status name
  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Pianificato';
      case 'in_progress': return 'In corso';
      case 'completed': return 'Completato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  // Open the add job modal with the selected date
  const handleAddJob = (date: Date) => {
    setSelectedDate(date);
    setIsAddJobModalOpen(true);
  };

  // Open the job details modal
  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setIsJobDetailsModalOpen(true);
  };

  // Formatters for time display
  const formatTime = (date: Date) => format(date, 'HH:mm', { locale: it });
  const formatFullDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', { locale: it });
  
  // Calculate total price
  const calculateTotal = (job: Job) => {
    const laborCost = job.hourlyRate * job.duration;
    return laborCost + job.materialsCost;
  };

  // Refresh jobs after adding or updating
  const handleJobsUpdated = useCallback(() => {
    refetchJobs();
  }, [refetchJobs]);

  return (
    <div id="calendar-tab" className="tab-content">
      {/* Calendar Job Modal */}
      <CalendarJobModal 
        isOpen={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
        selectedDate={selectedDate}
        onJobAdded={handleJobsUpdated}
      />
      
      {/* Job Details Modal */}
      <Dialog 
        open={isJobDetailsModalOpen} 
        onOpenChange={(open) => {
          if (!open) setIsJobDetailsModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                  <span>{selectedJob.title}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobColor(selectedJob.type)}`}>
                    {getJobTypeName(selectedJob.type)}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {formatFullDate(new Date(selectedJob.startDate))} alle {formatTime(new Date(selectedJob.startDate))}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Cliente</h4>
                    <p className="text-sm">{selectedJob.client?.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Stato</h4>
                    <p className="text-sm">{getStatusName(selectedJob.status)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Durata</h4>
                    <p className="text-sm">{selectedJob.duration} {selectedJob.duration === 1 ? 'ora' : 'ore'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Location</h4>
                    <p className="text-sm">{selectedJob.location}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Tariffa oraria</h4>
                    <p className="text-sm">{selectedJob.hourlyRate} €/ora</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Materiali</h4>
                    <p className="text-sm">{selectedJob.materialsCost} €</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Costo totale</h4>
                  <p className="text-sm font-bold">{calculateTotal(selectedJob)} €</p>
                </div>
                
                {selectedJob.notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Note</h4>
                    <p className="text-sm">{selectedJob.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-2">
                {selectedJob.status !== 'completed' && (
                  <JobCompletion job={selectedJob} onCompleted={handleJobsUpdated} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="p-4 bg-white border-b border-neutral-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-blue-800">Calendario</h1>
          <div className="flex space-x-2">
            <button 
              id="day-btn" 
              className={cn(
                "view-button border px-3 py-1 rounded text-sm font-medium",
                calendarView === 'day' 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white text-blue-800 border-blue-800"
              )}
              onClick={() => setCalendarView('day')}
            >
              Giorno
            </button>
            <button 
              id="week-btn" 
              className={cn(
                "view-button border px-3 py-1 rounded text-sm font-medium",
                calendarView === 'week' 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white text-blue-800 border-blue-800"
              )}
              onClick={() => setCalendarView('week')}
            >
              Settimana
            </button>
            <button 
              id="month-btn" 
              className={cn(
                "view-button border px-3 py-1 rounded text-sm font-medium",
                calendarView === 'month' 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white text-blue-800 border-blue-800"
              )}
              onClick={() => setCalendarView('month')}
            >
              Mese
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              className="p-1 rounded hover:bg-neutral-100" 
              onClick={handlePrevious}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <h2 className="text-lg font-medium">{formatDisplayDate()}</h2>
            <button 
              className="p-1 rounded hover:bg-neutral-100" 
              onClick={handleNext}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
          <button 
            className="flex items-center space-x-1 bg-blue-800 text-white px-3 py-2 rounded-lg"
            onClick={() => {
              setSelectedDate(new Date());
              setIsAddJobModalOpen(true);
            }}
          >
            <span className="material-icons text-sm">add</span>
            <span>Nuovo</span>
          </button>
        </div>
      </div>
      
      {/* Day View */}
      {calendarView === 'day' && (
        <div id="day-view" className="calendar-view">
          <div className="p-4">
            <div className="bg-white rounded-lg shadow">
              <div 
                className="p-3 border-b border-neutral-200 text-center font-medium cursor-pointer hover:bg-neutral-50"
                onClick={() => handleAddJob(currentDate)}
              >
                {format(currentDate, 'EEEE, d MMMM', { locale: it })}
                <span className="text-xs ml-2 text-blue-600">(Clicca per aggiungere)</span>
              </div>
              <div className="divide-y divide-neutral-200">
                {isLoading ? (
                  <div className="p-4 text-center">Caricamento...</div>
                ) : jobsWithClients.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500">Nessun impegno per questa giornata</div>
                ) : (
                  jobsWithClients
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(job => {
                      const startTime = new Date(job.startDate);
                      const endTime = new Date(startTime.getTime() + job.duration * 60 * 60 * 1000);
                      
                      return (
                        <div 
                          key={job.id} 
                          className="p-4 hover:bg-neutral-50 cursor-pointer relative rounded-lg"
                          onClick={() => handleViewJob(job)}
                        >
                          {/* Progress bar background */}
                          <div 
                            className="absolute inset-0 rounded-lg"
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.05)",
                              borderRadius: "8px"
                            }}
                          />
                          
                          {/* Progress bar fill */}
                          <div 
                            className="absolute inset-0 rounded-lg"
                            style={{
                              width: `${job.progressPercentage}%`,
                              backgroundColor: job.type === 'repair' ? 'rgba(37, 99, 235, 0.1)' : 
                                            job.type === 'installation' ? 'rgba(234, 179, 8, 0.1)' : 
                                            job.type === 'maintenance' ? 'rgba(34, 197, 94, 0.1)' : 
                                            job.type === 'quote' ? 'rgba(168, 85, 247, 0.1)' : 
                                            'rgba(239, 68, 68, 0.1)',
                              borderRadius: "8px",
                              transition: "width 0.3s ease-in-out"
                            }}
                          />
                          
                          <div className="relative z-10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-neutral-500">
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs ${getJobColor(job.type)} text-white px-2 py-1 rounded`}>
                                  {job.duration} {job.duration === 1 ? 'ora' : 'ore'}
                                </span>
                                <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded font-bold">
                                  {job.progressPercentage}%
                                </span>
                              </div>
                            </div>
                            <div className={`pl-3 border-l-4 ${job.type === 'repair' ? 'border-blue-600' : job.type === 'installation' ? 'border-yellow-500' : job.type === 'maintenance' ? 'border-green-500' : job.type === 'quote' ? 'border-purple-500' : 'border-red-500'}`}>
                              <h3 className="font-medium">{job.title}</h3>
                              <div className="flex items-center text-sm text-neutral-600 mt-1">
                                <span className="material-icons text-sm mr-1">person</span>
                                <span>{job.client?.name}</span>
                              </div>
                              <div className="flex items-center text-sm text-neutral-600 mt-1">
                                <span className="material-icons text-sm mr-1">location_on</span>
                                <span>{job.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Week View */}
      {calendarView === 'week' && (
        <div id="week-view" className="calendar-view">
          <div className="p-4 overflow-x-auto">
            <div className="bg-white rounded-lg shadow min-w-max">
              {/* Days of the week */}
              <div className="grid grid-cols-7 border-b border-neutral-200">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), dayIndex);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={cn(
                        "p-3 text-center font-medium border-r border-neutral-200 cursor-pointer hover:bg-neutral-50",
                        isCurrentDay ? "bg-blue-600 bg-opacity-10" : "",
                        dayIndex === 5 || dayIndex === 6 ? "text-neutral-400" : "",
                        dayIndex === 6 ? "border-r-0" : ""
                      )}
                      onClick={() => handleAddJob(day)}
                    >
                      {format(day, 'EEE d', { locale: it })}
                    </div>
                  );
                })}
              </div>
              
              {/* Events grid */}
              <div className="grid grid-cols-7 min-h-[500px]">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), dayIndex);
                  const isWeekend = dayIndex === 5 || dayIndex === 6;
                  const isCurrentDay = isToday(day);
                  
                  // Filter jobs for this day
                  const dayJobs = jobsWithClients.filter(job => {
                    const jobDate = new Date(job.startDate);
                    return jobDate.getDate() === day.getDate() && 
                           jobDate.getMonth() === day.getMonth() && 
                           jobDate.getFullYear() === day.getFullYear();
                  });
                  
                  return (
                    <div 
                      key={dayIndex}
                      className={cn(
                        "border-r border-neutral-200 p-2 space-y-2 cursor-pointer",
                        isWeekend ? "bg-neutral-50" : "",
                        isCurrentDay ? "bg-blue-600 bg-opacity-5" : "",
                        dayIndex === 6 ? "border-r-0" : ""
                      )}
                      onClick={() => handleAddJob(day)}
                    >
                      {dayJobs
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        .map(job => {
                          const startTime = new Date(job.startDate);
                          
                          return (
                            <div 
                              key={job.id} 
                              className={`${getJobColor(job.type)} text-white p-2 rounded text-sm`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewJob(job);
                              }}
                            >
                              <div className="font-medium">{job.title}</div>
                              <div className="text-xs mt-1">
                                {format(startTime, 'HH:mm')} - {format(new Date(startTime.getTime() + job.duration * 60 * 60 * 1000), 'HH:mm')}
                              </div>
                              <div className="text-xs">{job.client?.name}</div>
                            </div>
                          );
                        })
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Month View */}
      {calendarView === 'month' && (
        <div id="month-view" className="calendar-view">
          <div className="p-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Days of the week header */}
              <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <div className="p-2 text-center text-sm font-medium">Lun</div>
                <div className="p-2 text-center text-sm font-medium">Mar</div>
                <div className="p-2 text-center text-sm font-medium">Mer</div>
                <div className="p-2 text-center text-sm font-medium">Gio</div>
                <div className="p-2 text-center text-sm font-medium">Ven</div>
                <div className="p-2 text-center text-sm font-medium">Sab</div>
                <div className="p-2 text-center text-sm font-medium">Dom</div>
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {Array.from({ length: 42 }).map((_, dayIndex) => {
                  const startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
                  const day = addDays(startDate, dayIndex);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  
                  // Filter jobs for this day
                  const dayJobs = jobsWithClients.filter(job => {
                    const jobDate = new Date(job.startDate);
                    return jobDate.getDate() === day.getDate() && 
                           jobDate.getMonth() === day.getMonth() && 
                           jobDate.getFullYear() === day.getFullYear();
                  });
                  
                  return (
                    <div 
                      key={dayIndex}
                      className={cn(
                        "border-b border-r border-neutral-200 min-h-[100px] p-1 cursor-pointer hover:bg-neutral-50",
                        isCurrentMonth ? "" : "text-neutral-400",
                        isCurrentDay ? "bg-blue-600 bg-opacity-5" : "",
                        dayIndex >= 35 && !dayJobs.length && !isCurrentDay ? "border-b-0" : "",
                        dayIndex % 7 === 6 ? "border-r-0" : "",
                        dayIndex >= 35 && dayIndex < 42 && !isCurrentMonth ? "hidden" : ""
                      )}
                      onClick={() => handleAddJob(day)}
                    >
                      <div className={cn(
                        "text-right text-xs font-medium mb-1",
                        isCurrentDay ? "font-bold" : ""
                      )}>
                        {format(day, 'd')}
                      </div>
                      
                      {dayJobs
                        .slice(0, 3) // Limit to 3 events for space
                        .map(job => (
                          <div 
                            key={job.id} 
                            className={`${getJobColor(job.type)} text-white text-xs p-1 rounded truncate mb-1`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewJob(job);
                            }}
                          >
                            {format(new Date(job.startDate), 'HH:mm')} - {job.title}
                          </div>
                        ))
                      }
                      
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-neutral-500 text-center mt-1">
                          +{dayJobs.length - 3} altro/i
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
