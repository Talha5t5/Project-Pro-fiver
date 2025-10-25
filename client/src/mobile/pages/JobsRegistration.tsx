import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Search, Plus, Calendar, Clock, MapPin, Tag, MoreVertical, Filter, SortDesc, Check, X, Bell } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { JobRegistrationDialog } from "../components/JobRegistrationDialog";
import { NewJobModal } from "../components/NewJobModal";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

// Tipi di lavoro e stati
const jobTypes = [
  { value: "repair", label: "Riparazione" },
  { value: "installation", label: "Installazione" },
  { value: "maintenance", label: "Manutenzione" },
  { value: "quote", label: "Preventivo" },
  { value: "emergency", label: "Emergenza" },
];

const jobStatuses = [
  { value: "scheduled", label: "Programmato" },
  { value: "in_progress", label: "In corso" },
  { value: "completed", label: "Completato" },
  { value: "cancelled", label: "Cancellato" },
];

// Opzioni di ordinamento
const sortOptions = [
  { value: "date_desc", label: "Data (più recente)" },
  { value: "date_asc", label: "Data (più vecchia)" },
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "status", label: "Stato" },
];

interface JobData {
  id: number;
  title: string;
  clientId: number;
  client?: {
    name: string;
  };
  type: string;
  status: string;
  startDate: string | Date;
  endDate?: string | Date;
  location: string;
  description?: string;
  notes?: string;
}

export default function JobsRegistration() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<{
    types: string[];
    statuses: string[];
  }>({
    types: [],
    statuses: [],
  });
  const [sortBy, setSortBy] = useState("date_desc");
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isJobRegistrationOpen, setIsJobRegistrationOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);

  // Fetch jobs e clienti
  const { data: jobs = [], isLoading: isJobsLoading } = useQuery<JobData[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Errore nel recuperare i lavori');
      return response.json();
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Errore nel recuperare i clienti');
      return response.json();
    },
    enabled: jobs.length > 0
  });

  // Arricchisci i dati dei lavori con le informazioni del cliente
  const enrichedJobs = jobs.map(job => ({
    ...job,
    client: (clients as any[]).find(c => c.id === job.clientId) || { name: "Cliente sconosciuto" }
  }));

  // Filtra i lavori in base a ricerca, tipo e stato
  const filteredJobs = enrichedJobs.filter(job => {
    // Filtra per termine di ricerca
    const matchesSearch = 
      searchTerm === "" || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtra per tipo di lavoro
    const matchesType = selectedFilters.types.length === 0 || 
      selectedFilters.types.includes(job.type);
    
    // Filtra per stato
    const matchesStatus = selectedFilters.statuses.length === 0 || 
      selectedFilters.statuses.includes(job.status);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Ordina i lavori in base all'opzione selezionata
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "date_asc":
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      case "date_desc":
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      case "name_asc":
        return a.title.localeCompare(b.title);
      case "name_desc":
        return b.title.localeCompare(a.title);
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
  });

  // Gestisci il cambio dei filtri per tipo di lavoro
  const handleTypeFilterChange = (type: string) => {
    setSelectedFilters(prev => {
      const types = prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type];
      return { ...prev, types };
    });
  };

  // Gestisci il cambio dei filtri per stato
  const handleStatusFilterChange = (status: string) => {
    setSelectedFilters(prev => {
      const statuses = prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status];
      return { ...prev, statuses };
    });
  };

  // Resetta tutti i filtri
  const resetFilters = () => {
    setSelectedFilters({ types: [], statuses: [] });
    setSortBy("date_desc");
    setSearchTerm("");
  };

  // Ottieni il colore per il tipo di lavoro
  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "repair": return "bg-blue-500";
      case "installation": return "bg-yellow-500";
      case "maintenance": return "bg-green-500";
      case "quote": return "bg-purple-500";
      case "emergency": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Ottieni l'etichetta per il tipo di lavoro
  const getJobTypeLabel = (type: string) => {
    const jobType = jobTypes.find(t => t.value === type);
    return jobType ? jobType.label : type;
  };

  // Ottieni l'etichetta per lo stato del lavoro
  const getJobStatusLabel = (status: string) => {
    const jobStatus = jobStatuses.find(s => s.value === status);
    return jobStatus ? jobStatus.label : status;
  };

  // Ottieni lo stile per lo stato del lavoro
  const getJobStatusStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const queryClient = useQueryClient();

  // Gestisci la creazione di un nuovo lavoro
  const handleNewJobSubmit = async (formData: FormData) => {
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Errore durante la creazione del lavoro");
      }

      // Invalida la query dei lavori per aggiornare la lista
      await queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      setIsNewJobOpen(false);
    } catch (error) {
      console.error("Errore:", error);
      // Gestisci l'errore (ad esempio con un toast)
    }
  };

  // Renderizza ogni scheda del lavoro
  const renderJobCard = (job: JobData) => {
    const jobDate = new Date(job.startDate);
    const formattedDate = format(jobDate, "dd MMM yyyy", { locale: it });
    const formattedTime = format(jobDate, "HH:mm");
    const jobTypeColor = getJobTypeColor(job.type);
    const jobStatusStyle = getJobStatusStyle(job.status);

    return (
      <div 
        key={job.id} 
        className="bg-white rounded-lg shadow-sm border p-4 mb-4"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-lg">{job.title}</h3>
            <p className="text-sm text-gray-500">{job.client?.name}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                setSelectedJobId(job.id);
                setIsJobRegistrationOpen(true);
              }}>
                Registra attività
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation(`/mobile/job/${job.id}`)}>
                Vedi dettagli
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation(`/mobile/job/${job.id}/edit`)}>
                Modifica
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Calendar size={14} />
            <span>{formattedDate}</span>
            <Clock size={14} className="ml-2" />
            <span>{formattedTime}</span>
          </div>
          
          {job.location && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin size={14} />
              <span>{job.location}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className={`px-2 py-1 rounded-full text-xs ${jobTypeColor} text-white`}>
              {getJobTypeLabel(job.type)}
            </div>
            
            <div className={`px-2 py-1 rounded-full text-xs ${jobStatusStyle}`}>
              {getJobStatusLabel(job.status)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handler per l'apertura del modale di nuovo lavoro
  const handleAddNewJob = () => {
    // Utilizza lo stesso metodo usato in BottomNav
    const event = new CustomEvent('openModal', { detail: 'new-job-modal' });
    document.dispatchEvent(event);
  };

  return (
    <MobileLayout 
      title="Registrazioni" 
      rightAction={
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="relative mr-1">
            <Bell size={20} />
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            className="rounded-full bg-blue-600 shadow-md"
            onClick={handleAddNewJob}
          >
            <Plus size={18} />
          </Button>
        </div>
      }
    >
      <div className="p-4 pb-20">
        {/* Barra di ricerca e filtri */}
        <div className="mb-4 space-y-3">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Cerca registrazioni..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Filtri">
                  <Filter size={16} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filtri</SheetTitle>
                  <SheetDescription>
                    Filtra i lavori per tipo e stato
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Tipo di lavoro</h3>
                    <div className="space-y-2">
                      {jobTypes.map((type) => (
                        <div className="flex items-center space-x-2" key={type.value}>
                          <Checkbox 
                            id={`type-${type.value}`} 
                            checked={selectedFilters.types.includes(type.value)}
                            onCheckedChange={() => handleTypeFilterChange(type.value)}
                          />
                          <Label htmlFor={`type-${type.value}`}>{type.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Stato</h3>
                    <div className="space-y-2">
                      {jobStatuses.map((status) => (
                        <div className="flex items-center space-x-2" key={status.value}>
                          <Checkbox 
                            id={`status-${status.value}`} 
                            checked={selectedFilters.statuses.includes(status.value)}
                            onCheckedChange={() => handleStatusFilterChange(status.value)}
                          />
                          <Label htmlFor={`status-${status.value}`}>{status.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Ordina per</h3>
                    <RadioGroup value={sortBy} onValueChange={setSortBy}>
                      {sortOptions.map((option) => (
                        <div className="flex items-center space-x-2" key={option.value}>
                          <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                          <Label htmlFor={`sort-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                
                <SheetFooter>
                  <div className="flex space-x-2 w-full">
                    <Button variant="outline" onClick={resetFilters} className="flex-1">
                      Reimposta
                    </Button>
                    <SheetClose asChild>
                      <Button className="flex-1">Applica</Button>
                    </SheetClose>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Ordina">
                  <SortDesc size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordina per</DropdownMenuLabel>
                {sortOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    className={cn(
                      sortBy === option.value && "font-medium bg-gray-100"
                    )}
                    onClick={() => setSortBy(option.value)}
                  >
                    {option.label}
                    {sortBy === option.value && <Check className="ml-2" size={14} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Indicatori dei filtri attivi */}
          {(selectedFilters.types.length > 0 || selectedFilters.statuses.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {selectedFilters.types.map(type => (
                <div 
                  key={`filter-${type}`}
                  className="bg-blue-600/10 text-primary rounded-full px-2 py-1 text-xs flex items-center"
                >
                  <span>{getJobTypeLabel(type)}</span>
                  <button 
                    className="ml-1" 
                    onClick={() => handleTypeFilterChange(type)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              {selectedFilters.statuses.map(status => (
                <div 
                  key={`filter-${status}`}
                  className="bg-blue-600/10 text-primary rounded-full px-2 py-1 text-xs flex items-center"
                >
                  <span>{getJobStatusLabel(status)}</span>
                  <button 
                    className="ml-1" 
                    onClick={() => handleStatusFilterChange(status)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              {(selectedFilters.types.length > 0 || selectedFilters.statuses.length > 0) && (
                <button 
                  className="text-xs text-gray-500 underline"
                  onClick={resetFilters}
                >
                  Cancella tutti
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista dei lavori */}
        <div>
          {isJobsLoading ? (
            <div className="py-8 text-center">
              <p>Caricamento registrazioni...</p>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Nessuna registrazione trovata</p>
              <Button 
                className="mt-4"
                onClick={handleAddNewJob}
              >
                <Plus size={16} className="mr-2" />
                Crea nuova registrazione
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-2">
                <p className="text-sm text-gray-500">
                  {sortedJobs.length} {sortedJobs.length === 1 ? 'registrazione trovata' : 'registrazioni trovate'}
                </p>
              </div>
              {sortedJobs.map(renderJobCard)}
            </>
          )}
        </div>

        {/* Aggiungiamo NewJobModal qui */}
        <NewJobModal />
        
        {/* Dialog per registrazione lavoro */}
        <JobRegistrationDialog
          isOpen={isJobRegistrationOpen}
          onClose={() => setIsJobRegistrationOpen(false)}
          jobId={selectedJobId}
        />
      </div>
    </MobileLayout>
  );
}