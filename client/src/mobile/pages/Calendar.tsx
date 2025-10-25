import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday, addDays, startOfWeek, isSameDay,
  addWeeks, subWeeks,
  endOfWeek, isWithinInterval
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import MobileLayout from "../components/MobileLayout";

import { JobRegistrationDialog } from "../components/JobRegistrationDialog";

interface Job {
  id: number;
  title: string;
  startDate: Date | string;
  endDate?: Date | string;
  client?: {
    id: number;
    name: string;
  };
  clientId: number;
  location: string;
  type: string;
  status: string;
  duration: number;
  hourlyRate?: number;
  materialsCost?: number;
  notes?: string;
  photos?: string[];
  createdAt: string;
  progressPercentage?: number;
  color?: string;
  pattern?: string;
  isActivity?: boolean;
}

export default function Calendar() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("month");
  
  // Gestione dei dialoghi
  const [isJobRegistrationOpen, setIsJobRegistrationOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);

  // Formattazione del mese/settimana/giorno
  const getFormattedPeriod = () => {
    switch (view) {
      case "month":
        const formattedMonth = format(currentDate, "MMMM yyyy", { locale: it });
        return formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunedì
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Domenica
        if (format(weekStart, "MMMM", { locale: it }) === format(weekEnd, "MMMM", { locale: it })) {
          // Stessa settimana, stesso mese
          return `${format(weekStart, "d", { locale: it })} - ${format(weekEnd, "d", { locale: it })} ${format(weekEnd, "MMMM yyyy", { locale: it })}`;
        } else if (format(weekStart, "yyyy") === format(weekEnd, "yyyy")) {
          // Stessa settimana, mesi diversi, stesso anno
          return `${format(weekStart, "d MMM", { locale: it })} - ${format(weekEnd, "d MMM yyyy", { locale: it })}`;
        } else {
          // Stessa settimana, anni diversi
          return `${format(weekStart, "d MMM yyyy", { locale: it })} - ${format(weekEnd, "d MMM yyyy", { locale: it })}`;
        }
      }
      case "day":
        return format(currentDate, "EEEE d MMMM yyyy", { locale: it })
          .charAt(0).toUpperCase() + format(currentDate, "EEEE d MMMM yyyy", { locale: it }).slice(1);
      default:
        return "";
    }
  };

  // Navigazione tra periodi (mese, settimana, giorno)
  const navigatePrevious = () => {
    switch (view) {
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "day":
        setCurrentDate(addDays(currentDate, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };


  // Query per ottenere TUTTI i lavori (per garantire coerenza con il resto dell'app)
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/mobile/all-jobs"],
    queryFn: async () => {
      try {
        // Carica TUTTI i lavori invece di filtrarli per data nel backend
        const response = await mobileApiCall('GET', '/all-jobs');
        if (!response.ok) throw new Error("Errore nel recuperare i lavori");
        const allJobs = await response.json();
        console.log(`Calendario: caricati ${allJobs.length} lavori totali`);
        return allJobs;
      } catch (error) {
        console.error("Errore:", error);
        return [];
      }
    }
  });
  console.log("jobs", jobs);
  // Query per ottenere i clienti
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/mobile/all-clients"],
    queryFn: async () => {
      try {
        const response = await mobileApiCall('GET', '/all-clients');
        if (!response.ok) throw new Error("Errore nel recuperare i clienti");
        return response.json();
      } catch (error) {
        console.error("Errore:", error);
        return [];
      }
    },
    enabled: jobs.length > 0
  });


  // Aggiunge i dettagli ai lavori (nome cliente e colori)
  const jobsWithDetails = jobs.map(job => {
    const client = (clients as any[]).find(c => c.id === job.clientId);
    let color = "";
    let pattern = "";
    
    // Determine color based on status
    switch (job.status) {
      case "scheduled": color = "bg-blue-600"; break; // Blu più scuro per miglior contrasto
      case "planned": color = "bg-blue-600"; break; // Compatibilità con vecchio stato
      case "in_progress": color = "bg-amber-500"; break; // Giallo ambra per miglior visibilità
      case "completed": color = "bg-green-600"; break; // Verde più scuro per miglior contrasto
      case "cancelled": color = "bg-red-600"; break; // Rosso più scuro per miglior contrasto
      default: color = "bg-blue-600"; // Default a blu per sicurezza
    }
    
    // Add pattern class for activities (jobs with an activity property)
    // Solid background for regular jobs, striped pattern for activities
    const isActivity = job.hasOwnProperty('activityId') || job.hasOwnProperty('isActivity');
    
    // Utilizziamo una striscia più evidente per le attività
    pattern = isActivity ? "bg-stripe-pattern" : "";
    
    // Se è un'attività, rendiamo leggermente più scuro il colore per aumentare il contrasto
    if (isActivity) {
      color = color.replace("-600", "-700").replace("-500", "-600");
    }
    
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
      client: { name: client ? client.name : t('mobile.jobs.unknownClient') },
      color,
      pattern,
      isActivity,
      progressPercentage: Math.round(progressPercentage)
    };
  });

  // Funzione per gestire il cambio di visualizzazione
  const handleViewChange = (newView: "day" | "week" | "month") => {
    setView(newView);
  };

  
  // Funzione per aprire il dialog di nuovo lavoro
  const openNewJobDialog = (date: Date | null) => {
    if (!date) return; // Se la data è null, non fare nulla
    
    // Imposta la data nel form
    const formattedDate = format(date, "yyyy-MM-dd");
    
    // Crea un nuovo evento per aprire il modale di nuovo lavoro
    const event = new CustomEvent('openModal', { 
      detail: 'new-job-modal'
    });
    document.dispatchEvent(event);
    
    // Imposta un timeout per consentire al modal di aprirsi
    setTimeout(() => {
      // Trova l'elemento input della data e imposta il valore
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      if (dateInput) {
        dateInput.value = formattedDate;
      }
    }, 100);
  };
  
  // Funzione per aprire il dialog di registrazione lavoro
  const openJobRegistrationDialog = (jobId?: number) => {
    setSelectedJobId(jobId);
    setIsJobRegistrationOpen(true);
  };
  

  // Generazione della vista mensile
  const renderMonthView = () => {
    // Primo giorno del mese
    const firstDay = startOfMonth(currentDate);
    
    // Inizio del calendario (potrebbe essere nel mese precedente)
    const calendarStart = startOfWeek(firstDay, { weekStartsOn: 1 });
    
    // Estendi il calendario per includere più giorni del mese precedente
    // per catturare lavori che iniziano prima del mese corrente
    const extendedStart = addDays(calendarStart, -3); // Aggiungi solo 3 giorni prima per ridurre il clutter
    
    // Tutti i giorni che mostreremo (inclusi quelli del mese precedente, ma NON quelli del mese successivo)
    const calendarDays = eachDayOfInterval({
      start: extendedStart,
      end: endOfMonth(currentDate)
    });
    
    
    // Raggruppo i giorni in settimane e gestisco i giorni incompleti per l'ultima settimana
    // Definiamo un tipo che includa esplicitamente una data o null per TypeScript
    type CalendarDay = Date | null;
    const weeks: CalendarDay[][] = [];
    
    // Calcola quanti giorni abbiamo
    const totalDays = calendarDays.length;
    
    // Calcola quante settimane complete abbiamo
    const completeWeeks = Math.floor(totalDays / 7);
    
    // Aggiungi le settimane complete
    for (let i = 0; i < completeWeeks * 7; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    // Gestisci l'ultima settimana incompleta (se presente)
    const remainingDays = totalDays % 7;
    if (remainingDays > 0) {
      const lastWeekDays = calendarDays.slice(completeWeeks * 7);
      
      // Riempi il resto della settimana con null per mantenere la struttura a griglia
      const filledLastWeek: CalendarDay[] = [...lastWeekDays];
      for (let i = remainingDays; i < 7; i++) {
        // Aggiungiamo esplicitamente null come CalendarDay 
        filledLastWeek.push(null);
      }
      
      weeks.push(filledLastWeek);
    }
    
  // Funzione per ottenere i lavori di un determinato giorno (considerando l'intera durata)
  const getJobsForDay = (date: Date | null) => {
    if (!date) return []; // Restituisce array vuoto se la data è null
    
    // Considera tutti i lavori per maggior sicurezza
    const filteredJobs = jobsWithDetails.filter(job => {
      const jobStartDate = new Date(job.startDate);
      let jobEndDate;
      
      if (job.endDate) {
        jobEndDate = new Date(job.endDate);
      } else if (job.duration) {
        // Calcola la data di fine in base alla durata (sia che sia < 24 o > 24)
        jobEndDate = new Date(jobStartDate.getTime());
        jobEndDate.setHours(jobEndDate.getHours() + job.duration);
      } else {
        // Se non c'è né endDate né duration, il lavoro dura fino a fine giornata
        jobEndDate = new Date(jobStartDate.getTime());
        jobEndDate.setHours(23, 59, 59);
      }
      
      // Normalize dates to compare only the date part (ignore time)
      const jobStartDateOnly = new Date(jobStartDate.getFullYear(), jobStartDate.getMonth(), jobStartDate.getDate());
      const jobEndDateOnly = new Date(jobEndDate.getFullYear(), jobEndDate.getMonth(), jobEndDate.getDate());
      const dayDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Verifica se la data corrente è all'interno dell'intervallo del lavoro (solo date, non ore)
      const isInRange = dayDateOnly >= jobStartDateOnly && dayDateOnly <= jobEndDateOnly;
      
      return isInRange;
    });
    
    return filteredJobs;
  };
    
    return (
      <div>
        {/* Intestazione giorni della settimana */}
        <div className="grid grid-cols-7 text-center border-b py-3 bg-gray-50">
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.monday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.tuesday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.wednesday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.thursday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.friday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.saturday')}</div>
          <div className="text-sm font-semibold text-gray-700">{t('mobile.calendar.daysOfWeek.sunday')}</div>
        </div>
        
        {/* Griglia del calendario */}
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                // Se il giorno è null (casella vuota alla fine del mese), mostra una cella vuota
                if (day === null) {
                  return (
                    <div 
                      key={dayIndex} 
                      className={cn(
                        "min-h-[100px] border-b p-1 relative bg-gray-50"
                      )}
                    >
                      {/* Cella vuota */}
                    </div>
                  );
                }
                
                // Altrimenti procediamo normalmente con la cella che contiene una data
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isPreviousMonth = day < startOfMonth(currentDate);
                const dayJobs = getJobsForDay(day);
                
                // Debug: Log what's happening for September 5th
                if (day.toISOString().split('T')[0] === '2025-09-05') {
                  console.log('🔍 SEPTEMBER 5TH DEBUG:', {
                    day: day.toISOString().split('T')[0],
                    dayJobs: dayJobs.length,
                    jobs: dayJobs.map(job => ({
                      title: job.title,
                      startDate: job.startDate,
                      isStartDate: isSameDay(new Date(job.startDate), day)
                    }))
                  });
                }
                
                
                return (
                  <div 
                    key={dayIndex} 
                    className={cn(
                      "min-h-[120px] border-b p-2 relative hover:bg-gray-50 transition-colors",
                      !isCurrentMonth && "bg-gray-50 text-gray-400",
                      isPreviousMonth && "bg-gray-100 text-gray-500", // Different styling for previous month days
                      isToday(day) && "bg-blue-50 border-blue-200"
                    )}
                  >
                    {/* Numero del giorno */}
                    <div className="text-left mb-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday(day) && "font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center"
                      )}>
                        {isToday(day) ? (
                          <span className="text-xs">{format(day, "d")}</span>
                        ) : (
                          format(day, "d")
                        )}
                      </span>
                    </div>
                    
                    {/* Eventi del giorno */}
                    <div className="space-y-1">
                      {dayJobs.map((job, idx) => {
                        if (idx > 2) return null; // Mostra massimo 3 eventi
                        
                        const jobTime = format(new Date(job.startDate), "HH:mm");
                        const shortTitle = job.title.length > 25 
                          ? `${job.title.substring(0, 25)}...` 
                          : job.title;
                        
                        // Verifica se questa è la data di inizio del lavoro
                        const jobStartDate = new Date(job.startDate);
                        // Normalize both dates to compare only the date part (ignore time)
                        const jobStartDateOnly = new Date(jobStartDate.getFullYear(), jobStartDate.getMonth(), jobStartDate.getDate());
                        const dayDateOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                        const isStartDate = jobStartDateOnly.getTime() === dayDateOnly.getTime();
                        
                        // Calcola se è l'ultimo giorno del lavoro
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
                        
                        // Normalize end date to compare only the date part
                        const jobEndDateOnly = new Date(jobEndDate.getFullYear(), jobEndDate.getMonth(), jobEndDate.getDate());
                        const isEndDate = jobEndDateOnly.getTime() === dayDateOnly.getTime();
                        
                        // Check if this is a middle day (not start or end)
                        const isMiddleDay = !isStartDate && !isEndDate;
                        
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "text-xs text-white cursor-pointer relative group hover:opacity-90 transition-opacity",
                              job.color,
                              job.pattern
                            )}
                            style={{
                              height: "28px",
                              padding: "4px 8px",
                              marginBottom: "2px",
                              borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                              border: "none",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                              // Force text color to be visible with high contrast
                              color: "#FFFFFF",
                              backgroundColor: job.color.includes("blue") ? "#1d4ed8" : 
                                            job.color.includes("green") ? "#15803d" : 
                                            job.color.includes("red") ? "#dc2626" : 
                                            job.color.includes("amber") ? "#d97706" : "#1d4ed8",
                              // Make text much bigger and more visible
                              fontSize: "12px",
                              fontWeight: "700",
                              lineHeight: "1.4",
                              textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                              // Make the bar truly continuous by removing all margins
                              marginLeft: isStartDate ? "0" : "-1px",
                              marginRight: isEndDate ? "0" : "-1px",
                              zIndex: isStartDate ? 10 : isMiddleDay ? 8 : 5,
                              // Add subtle border for better definition
                              borderLeft: isStartDate ? "4px solid rgba(255, 255, 255, 0.5)" : "none",
                              // Ensure seamless connection
                              position: "relative"
                            }}
                            onClick={() => openJobRegistrationDialog(job.id)}
                            title={`${job.title} - ${job.client?.name || 'Unknown Client'} (${job.progressPercentage}%)`}
                          >
                            {/* Progress bar background */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                                // Extend beyond boundaries for true continuity
                                left: isStartDate ? "0" : "-1px",
                                right: isEndDate ? "0" : "-1px"
                              }}
                            />
                            
                            {/* Progress bar fill */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                width: `${job.progressPercentage}%`,
                                backgroundColor: job.color.includes("blue") ? "#1d4ed8" : 
                                              job.color.includes("green") ? "#15803d" : 
                                              job.color.includes("red") ? "#dc2626" : 
                                              job.color.includes("amber") ? "#d97706" : "#1d4ed8",
                                borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                                transition: "width 0.3s ease-in-out",
                                // Extend beyond boundaries for true continuity
                                left: isStartDate ? "0" : "-1px",
                                right: isEndDate ? "0" : "-1px"
                              }}
                            />
                            
                            {/* Show job title and time only in the first box */}
                            {isStartDate && (
                              <div className="truncate font-bold relative z-10" style={{ 
                                color: "#FFFFFF", 
                                fontSize: "12px",
                                fontWeight: "700",
                                textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
                              }}>
                                {`${jobTime} - ${shortTitle}`}
                              </div>
                            )}
                            
                            {/* Progress percentage indicator (only show in start box) */}
                            {isStartDate && job.progressPercentage > 0 && (
                              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs font-bold" style={{
                                color: "#FFFFFF",
                                textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                                fontSize: "10px"
                              }}>
                                {job.progressPercentage}%
                              </div>
                            )}
                            
                            {/* Add vertical line for start box */}
                            {isStartDate && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-0.5 bg-white opacity-80"
                                style={{ zIndex: 15 }}
                              />
                            )}
                            
                            {/* Add hover effect */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded transition-opacity" />
                          </div>
                        );
                      })}
                      
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-center text-gray-500">
                          +{dayJobs.length - 3} {t('mobile.calendar.actions.moreJobs')}
                        </div>
                      )}
                    </div>
                    
                    {/* Pulsanti azioni nella cella */}
                    <div className="absolute bottom-1 right-1 flex space-x-1">
                      {/* Pulsante "Nuovo lavoro" sempre visibile in tutte le celle */}
                      <button 
                        className="w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-600/90"
                        onClick={() => openNewJobDialog(day)}
                        title={t('mobile.calendar.actions.newJob')}
                      >
                        <Plus size={6} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generazione della vista settimanale
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: weekEnd
    });
    
    // Ore di lavoro (8:00 - 19:00)
    const workHours = Array.from({ length: 12 }, (_, i) => i + 8);
    
    // Raggruppa eventi per ora (considerando l'intera durata)
    const getJobsForHour = (date: Date, hour: number) => {
      return jobsWithDetails.filter(job => {
        const jobStartDate = new Date(job.startDate);
        
        // Calcoliamo la data e ora di inizio e fine del lavoro
        let jobEndDate;
        
        if (job.endDate) {
          jobEndDate = new Date(job.endDate);
        } else if (job.duration) {
          // Calcola la data di fine in base alla durata
          jobEndDate = new Date(jobStartDate.getTime());
          jobEndDate.setHours(jobEndDate.getHours() + job.duration);
        } else {
          // Se non c'è né endDate né duration, il lavoro dura un'ora
          jobEndDate = new Date(jobStartDate.getTime());
          jobEndDate.setHours(jobEndDate.getHours() + 1);
        }
        
        // Crea data-ora per la cella corrente
        const cellDate = new Date(date);
        cellDate.setHours(hour);
        
        // Verifica se la cella corrente è all'interno dell'intervallo del lavoro
        return isWithinInterval(cellDate, { start: jobStartDate, end: jobEndDate });
      });
    };
    
    return (
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[700px]">
          {/* Intestazione giorni della settimana */}
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="py-3 px-2 bg-gray-100"></div> {/* Celle vuota per le ore */}
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className={cn(
                  "py-3 px-2 text-center relative",
                  isToday(day) && "bg-blue-50 font-bold border-blue-200"
                )}
              >
                <div className="text-sm font-semibold text-gray-700">{format(day, "EEE", { locale: it })}</div>
                <div className="text-xs text-gray-600">{format(day, "d MMMM", { locale: it })}</div>
                
                {/* Pulsanti azioni nella cella di intestazione */}
                <div className="absolute bottom-1 right-1 flex space-x-1">
                  <button 
                    className="w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-600/90"
                    onClick={() => openNewJobDialog(day)}
                    title={t('mobile.calendar.actions.newJob')}
                  >
                    <Plus size={6} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Griglia oraria */}
          <div>
            {workHours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b">
                {/* Colonna delle ore */}
                <div className="py-2 px-2 text-xs text-gray-600 bg-gray-100 font-medium">
                  {`${hour}:00`}
                </div>
                
                {/* Una colonna per ogni giorno della settimana */}
                {weekDays.map((day, index) => {
                  const jobsForHour = getJobsForHour(day, hour);
                  
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "p-2 min-h-[70px] relative hover:bg-gray-50 transition-colors",
                        isToday(day) && "bg-blue-50 border-blue-200"
                      )}
                    >
                      {jobsForHour.map((job, idx) => {
                        const jobTime = format(new Date(job.startDate), "HH:mm");
                        const shortTitle = job.title.length > 30 
                          ? `${job.title.substring(0, 30)}...` 
                          : job.title;
                        
                        // Verifica se questa è la data di inizio del lavoro
                        const jobStartDate = new Date(job.startDate);
                        // Normalize both dates to compare only the date part (ignore time)
                        const jobStartDateOnly = new Date(jobStartDate.getFullYear(), jobStartDate.getMonth(), jobStartDate.getDate());
                        const dayDateOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                        const isStartDate = jobStartDateOnly.getTime() === dayDateOnly.getTime();
                        
                        // Calcola se è l'ultimo giorno del lavoro
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
                        const isEndDate = isSameDay(jobEndDate, day);
                        
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "text-xs text-white cursor-pointer relative group hover:opacity-90 transition-opacity",
                              job.color,
                              job.pattern
                            )}
                            style={{
                              height: "24px",
                              padding: "3px 6px",
                              marginBottom: "2px",
                              borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                              border: "none",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                              // Force text color to be visible with high contrast
                              color: "#FFFFFF",
                              backgroundColor: job.color.includes("blue") ? "#1d4ed8" : 
                                            job.color.includes("green") ? "#15803d" : 
                                            job.color.includes("red") ? "#dc2626" : 
                                            job.color.includes("amber") ? "#d97706" : "#1d4ed8",
                              // Make text bigger and more visible
                              fontSize: "10px",
                              fontWeight: "700",
                              lineHeight: "1.3",
                              textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                              // Make the bar truly continuous by removing all margins
                              marginLeft: isStartDate ? "0" : "-1px",
                              marginRight: isEndDate ? "0" : "-1px",
                              zIndex: isStartDate ? 10 : 5,
                              // Add subtle border for better definition
                              borderLeft: isStartDate ? "4px solid rgba(255, 255, 255, 0.5)" : "none"
                            }}
                            onClick={() => openJobRegistrationDialog(job.id)}
                            title={`${job.title} - ${job.client?.name || 'Unknown Client'} (${job.progressPercentage}%)`}
                          >
                            {/* Progress bar background */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                                // Extend beyond boundaries for true continuity
                                left: isStartDate ? "0" : "-1px",
                                right: isEndDate ? "0" : "-1px"
                              }}
                            />
                            
                            {/* Progress bar fill */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                width: `${job.progressPercentage}%`,
                                backgroundColor: job.color.includes("blue") ? "#1d4ed8" : 
                                              job.color.includes("green") ? "#15803d" : 
                                              job.color.includes("red") ? "#dc2626" : 
                                              job.color.includes("amber") ? "#d97706" : "#1d4ed8",
                                borderRadius: isStartDate ? "4px 0 0 4px" : isEndDate ? "0 4px 4px 0" : "0",
                                transition: "width 0.3s ease-in-out",
                                // Extend beyond boundaries for true continuity
                                left: isStartDate ? "0" : "-1px",
                                right: isEndDate ? "0" : "-1px"
                              }}
                            />
                            
                            {/* Show job title and time only in the first box */}
                            {isStartDate && (
                              <div className="truncate font-bold relative z-10" style={{ 
                                color: "#FFFFFF", 
                                fontSize: "10px",
                                fontWeight: "700",
                                textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
                              }}>
                                {`${jobTime} - ${shortTitle}`}
                              </div>
                            )}
                            
                            {/* Progress percentage indicator (only show in start box) */}
                            {isStartDate && job.progressPercentage > 0 && (
                              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs font-bold" style={{
                                color: "#FFFFFF",
                                textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                                fontSize: "8px"
                              }}>
                                {job.progressPercentage}%
                              </div>
                            )}
                            
                            {/* Add vertical line for start box */}
                            {isStartDate && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-0.5 bg-white opacity-80"
                                style={{ zIndex: 15 }}
                              />
                            )}
                            
                            {/* Add hover effect */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded transition-opacity" />
                          </div>
                        );
                      })}
                      
                      {/* Pulsanti azioni nella cella */}
                      <div className="absolute bottom-1 right-1 flex space-x-1">
                        {/* Pulsante "Nuovo lavoro" sempre visibile in tutte le celle */}
                        <button 
                          className="w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-600/90"
                          onClick={() => {
                            const dateWithHour = new Date(day);
                            dateWithHour.setHours(hour);
                            openNewJobDialog(dateWithHour);
                          }}
                          title={t('mobile.calendar.actions.newJob')}
                        >
                          <Plus size={6} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Generazione della vista giornaliera
  const renderDayView = () => {
    // Ore di lavoro (8:00 - 19:00)
    const workHours = Array.from({ length: 12 }, (_, i) => i + 8);
    
    // Ottieni eventi per ora (considerando l'intera durata)
    const getJobsForHour = (hour: number) => {
      return jobsWithDetails.filter(job => {
        const jobStartDate = new Date(job.startDate);
        
        // Calcoliamo la data e ora di inizio e fine del lavoro
        let jobEndDate;
        
        if (job.endDate) {
          jobEndDate = new Date(job.endDate);
        } else if (job.duration) {
          // Calcola la data di fine in base alla durata
          jobEndDate = new Date(jobStartDate.getTime());
          jobEndDate.setHours(jobEndDate.getHours() + job.duration);
        } else {
          // Se non c'è né endDate né duration, il lavoro dura un'ora
          jobEndDate = new Date(jobStartDate.getTime());
          jobEndDate.setHours(jobEndDate.getHours() + 1);
        }
        
        // Crea data-ora per la cella corrente
        const cellDate = new Date(currentDate);
        cellDate.setHours(hour);
        
        // Verifica se la cella corrente è all'interno dell'intervallo del lavoro
        return isWithinInterval(cellDate, { start: jobStartDate, end: jobEndDate });
      });
    };
    
    return (
      <div>
        <div className="border rounded-md">
          {workHours.map(hour => {
            const jobsForHour = getJobsForHour(hour);
            
            return (
              <div key={hour} className="border-b last:border-b-0">
                {/* Intestazione dell'ora */}
                <div className="bg-gray-100 px-3 py-2 text-sm flex justify-between items-center border-b">
                  <span className="font-semibold text-gray-700">{`${hour}:00`}</span>
                  
                  {/* Pulsante nuovo lavoro */}
                  <button 
                    className="w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-600/90"
                    onClick={() => {
                      const dateWithHour = new Date(currentDate);
                      dateWithHour.setHours(hour);
                      openNewJobDialog(dateWithHour);
                    }}
                    title={t('mobile.calendar.actions.newJob')}
                  >
                    <Plus size={6} />
                  </button>
                </div>
                
                {/* Eventi dell'ora */}
                <div className="p-3 min-h-[70px] hover:bg-gray-50 transition-colors">
                  {jobsForHour.map((job, idx) => {
                    const jobTime = format(new Date(job.startDate), "HH:mm");
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "text-sm text-white p-3 relative cursor-pointer group hover:opacity-90 transition-opacity rounded-lg",
                          job.color,
                          job.pattern
                        )}
                        style={{
                          borderLeft: "4px solid rgba(255, 255, 255, 0.4)", // Linea verticale per indicare l'inizio dell'attività
                          borderRadius: "8px",
                          border: "none",
                          marginBottom: "8px",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          backgroundColor: job.color.includes("blue") ? "#2563eb" : 
                                        job.color.includes("green") ? "#16a34a" : 
                                        job.color.includes("red") ? "#dc2626" : 
                                        job.color.includes("amber") ? "#f59e0b" : "#2563eb"
                        }}
                        onClick={() => openJobRegistrationDialog(job.id)}
                        title={`${job.title} - ${job.client?.name || 'Unknown Client'} (${job.progressPercentage}%)`}
                      >
                        {/* Progress bar background */}
                        <div 
                          className="absolute inset-0 rounded-lg"
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 0.2)",
                            borderRadius: "8px"
                          }}
                        />
                        
                        {/* Progress bar fill */}
                        <div 
                          className="absolute inset-0 rounded-lg"
                          style={{
                            width: `${job.progressPercentage}%`,
                            backgroundColor: job.color.includes("blue") ? "#2563eb" : 
                                          job.color.includes("green") ? "#16a34a" : 
                                          job.color.includes("red") ? "#dc2626" : 
                                          job.color.includes("amber") ? "#f59e0b" : "#2563eb",
                            borderRadius: "8px",
                            transition: "width 0.3s ease-in-out"
                          }}
                        />
                        
                        <div className="flex justify-between items-center mb-1 relative z-10">
                          <span className="font-semibold text-sm">{jobTime}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">{job.duration} {job.duration > 60 ? t('mobile.jobs.duration.hours') : t('mobile.jobs.duration.minutes')}</span>
                            <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded-full font-bold">
                              {job.progressPercentage}%
                            </span>
                          </div>
                        </div>
                        <div className="font-semibold text-base mb-1 relative z-10">{job.title}</div>
                        <div className="text-sm opacity-90 relative z-10">{job.client?.name}</div>
                        
                        {/* Add hover effect */}
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <MobileLayout title={t('mobile.calendar.title')}>
      <div className="p-4 pb-20">
        <div className="flex flex-col space-y-4">
          {/* Intestazione calendario */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <button 
                className="flex items-center justify-center"
                onClick={navigatePrevious}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium">{getFormattedPeriod()}</span>
              <button 
                className="flex items-center justify-center"
                onClick={navigateNext}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
          {/* Selettori visualizzazione */}
          <div className="grid grid-cols-3 border rounded-md overflow-hidden">
            <button 
              className={cn(
                "py-2 px-4 text-sm font-medium border-r",
                view === "day" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-gray-700"
              )}
              onClick={() => handleViewChange("day")}
            >
              {t('mobile.calendar.today')}
            </button>
            <button 
              className={cn(
                "py-2 px-4 text-sm font-medium border-r",
                view === "week" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-gray-700"
              )}
              onClick={() => handleViewChange("week")}
            >
              {t('mobile.calendar.week')}
            </button>
            <button 
              className={cn(
                "py-2 px-4 text-sm font-medium",
                view === "month" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-gray-700"
              )}
              onClick={() => handleViewChange("month")}
            >
              {t('mobile.calendar.month')}
            </button>
          </div>
          
          {/* Legenda dei colori */}
          <div className="border rounded-md p-2 bg-white">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <div className="font-medium flex-1">{t('mobile.navigation.jobs')}:</div>
              <div className="font-medium flex-1">{t('mobile.common.activities')}:</div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.scheduled')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.in_progress')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.completed')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.cancelled')}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-700 bg-stripe-pattern rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.scheduled')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-amber-600 bg-stripe-pattern rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.in_progress')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-700 bg-stripe-pattern rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.completed')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-700 bg-stripe-pattern rounded-sm mr-1"></div>
                  <span>{t('mobile.jobs.status.cancelled')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenuto principale */}
          {isLoading ? (
            <div className="py-12 text-center">
              <p>{t('mobile.common.loading')}</p>
            </div>
          ) : (
            <div className="mt-2">
              {view === "month" && renderMonthView()}
              {view === "week" && renderWeekView()}
              {view === "day" && renderDayView()}
            </div>
          )}
          

          
          {/* Dialog per registrazione lavoro */}
          <JobRegistrationDialog
            isOpen={isJobRegistrationOpen}
            onClose={() => setIsJobRegistrationOpen(false)}
            jobId={selectedJobId}
          />
        </div>
      </div>
    </MobileLayout>
  );
}
// "use client";

// import React, { useMemo } from "react";
// import { Calendar, DateCellWrapperProps, momentLocalizer, Event as RBCEvent } from "react-big-calendar";
// import moment from "moment";
// import "react-big-calendar/lib/css/react-big-calendar.css";
// import { useQuery } from "@tanstack/react-query";
// import { Plus } from "lucide-react";

// moment.locale("en"); // change if needed
// const localizer = momentLocalizer(moment);

// interface Client {
//   id: number;
//   name: string;
// }

// interface JobEvent {
//   id: number;
//   title: string;
//   clientId: number;
//   type: string;
//   status: string;
//   startDate: string;
//   endDate: string;
//   client: Client;
// }

// type CalendarEvent = RBCEvent & {
//   id: number;
//   status: string;
//   client: Client;
// };

// const CustomDateCellWrapper: React.FC<
//   DateCellWrapperProps & { onAddJob: (date: Date) => void }
// > = ({ value, children, onAddJob }) => {
//   return (
//     <div className="relative h-full w-full">
//       {children}
//       <button
//         className="absolute top-1 right-1 text-gray-500 hover:text-purple-600"
//         onClick={(e) => {
//           e.stopPropagation();
//           onAddJob(value);
//         }}
//       >
//         <Plus size={14} />
//       </button>
//     </div>
//   );
// };

// const JobCalendar: React.FC = () => {
//   const { data: jobs = [], isLoading } = useQuery<any[]>({
//     queryKey: ["/api/jobs"],
//     queryFn: async () => {
//       const response = await fetch(`/api/jobs`);
//       if (!response.ok) throw new Error("Failed to fetch jobs");
//       return response.json();
//     }
//   });
//   // Transform API jobs into react-big-calendar events
//   const events: CalendarEvent[] = useMemo(
//     () =>
//       jobs?.map((job) => ({
//         id: job.id,
//         title: `${job.title} – ${job.client?.name}`,
//         start: new Date(job.startDate),
//         end: new Date(job.endDate),
//         status: job.status,
//         client: job.client,
//       })),
//     [jobs]
//   );

//   return (
//     <div className="h-[700px] p-4">
//       <Calendar
//         localizer={localizer}
//         events={events}
//         startAccessor="start"
//         endAccessor="end"
//         defaultView="month"
//         views={["month", "week", "day"]}
//         style={{ height: "100%" }}
//         components={{
//           dateCellWrapper: (props) => (
//             <CustomDateCellWrapper {...props} onAddJob={() => {}} />
//           ),
//         }}
//         eventPropGetter={(event) => {
//           let bg = "#6b46c1"; // default purple
//           if (event.status === "completed") bg = "#38a169"; // green
//           if (event.status === "emergency") bg = "#e53e3e"; // red
//           return { style: { backgroundColor: bg, borderRadius: "6px" } };
//         }}
//       />
//     </div>
//   );
// };

// export default JobCalendar;