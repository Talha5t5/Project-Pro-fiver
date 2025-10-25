import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Calendar, MapPin, Clock } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { JobRegistrationDialog } from "../components/JobRegistrationDialog";

interface Job {
  id: number;
  title: string;
  clientId: number;
  client?: {
    name: string;
  };
  type: string;
  status: string;
  startDate: string | Date;
  location: string;
}

export default function MobileRegistration() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobType, setSelectedJobType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("in_corso");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [isJobRegistrationOpen, setIsJobRegistrationOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);
  
  // Fetch dei lavori
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Errore nel recuperare i lavori');
      return response.json();
    }
  });
  
  // Fetch dei tipi di lavoro per il filtro
  const { data: jobTypes = [] } = useQuery<{ id: number, name: string }[]>({
    queryKey: ['/api/jobtypes'],
    queryFn: async () => {
      const response = await fetch('/api/jobtypes');
      if (!response.ok) throw new Error('Errore nel recuperare i tipi di lavoro');
      return response.json();
    }
  });
  
  // Filtra i lavori in base allo stato, tipo e periodo
  const filteredJobs = jobs.filter(job => {
    // Filtra per termine di ricerca
    const jobTitle = job.title || "";
    const clientName = job.client?.name || "";
    const locationName = job.location || "";
    
    const matchesSearch = 
      searchTerm === "" || 
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtra per stato
    const matchesStatus = selectedStatus === "all" || job.status === selectedStatus;
    
    // Filtra per tipo di lavoro
    const matchesType = selectedJobType === "all" || job.type === selectedJobType;
    
    // Filtra per periodo
    let matchesPeriod = true;
    if (selectedPeriod !== "all") {
      const today = new Date();
      const jobDate = new Date(job.startDate);
      
      if (selectedPeriod === "today") {
        // Oggi
        matchesPeriod = 
          jobDate.getDate() === today.getDate() && 
          jobDate.getMonth() === today.getMonth() &&
          jobDate.getFullYear() === today.getFullYear();
      } else if (selectedPeriod === "week") {
        // Questa settimana
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + (6 - today.getDay()));
        weekEnd.setHours(23, 59, 59, 999);
        
        matchesPeriod = jobDate >= weekStart && jobDate <= weekEnd;
      } else if (selectedPeriod === "month") {
        // Questo mese
        matchesPeriod = 
          jobDate.getMonth() === today.getMonth() &&
          jobDate.getFullYear() === today.getFullYear();
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesPeriod;
  });
  
  // Ordina i lavori per data di inizio (più recenti prima)
  const sortedJobs = [...filteredJobs].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  // Gestione del colore del badge in base allo stato
  const getStatusColor = (status: string) => {
    switch (status) {
      case "to_start":
      case "da_iniziare":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
      case "in_corso":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
      case "completato":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Gestione delle etichette di stato
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      "to_start": "Da iniziare",
      "da_iniziare": "Da iniziare",
      "in_progress": "In corso",
      "in_corso": "In corso",
      "completed": "Completato",
      "completato": "Completato"
    };
    return statusMap[status] || status;
  };
  
  // Gestione della formattazione delle date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Apri il dialog di registrazione con il lavoro selezionato
  const handleRegisterActivity = (jobId: number) => {
    setSelectedJobId(jobId);
    setIsJobRegistrationOpen(true);
  };
  
  return (
    <MobileLayout title="Registrazioni">
      <div className="p-4 pb-20">
        {/* Filtri */}
        <div className="space-y-3 mb-6">
          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Cerca lavori..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filtro per tipo di lavoro */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <Select 
                value={selectedJobType} 
                onValueChange={setSelectedJobType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo di lavoro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {jobTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select 
                value={selectedStatus} 
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="da_iniziare">Da iniziare</SelectItem>
                  <SelectItem value="in_corso">In corso</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select 
                value={selectedPeriod} 
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualsiasi data</SelectItem>
                  <SelectItem value="today">Oggi</SelectItem>
                  <SelectItem value="week">Questa settimana</SelectItem>
                  <SelectItem value="month">Questo mese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Lista dei lavori */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Caricamento lavori...</p>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nessun lavoro trovato con i filtri selezionati</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">{sortedJobs.length} lavori trovati</h3>
              </div>
              
              {sortedJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold">{job.title}</CardTitle>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {job.client?.name}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="flex flex-col space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-2" />
                        <span>{formatDate(job.startDate)}</span>
                      </div>
                      
                      {job.location && (
                        <div className="flex items-center text-gray-600">
                          <MapPin size={14} className="mr-2" />
                          <span>{job.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => handleRegisterActivity(job.id)}
                    >
                      <Clock size={16} className="mr-2" />
                      Registra attività
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </>
          )}
        </div>
        
        {/* Bottone per aggiungere una nuova registrazione */}
        <Button
          className="fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-lg"
          onClick={() => setIsJobRegistrationOpen(true)}
        >
          <Plus size={24} />
        </Button>
        
        {/* Dialog per registrazione attività */}
        <JobRegistrationDialog
          isOpen={isJobRegistrationOpen}
          onClose={() => setIsJobRegistrationOpen(false)}
          jobId={selectedJobId}
        />
      </div>
    </MobileLayout>
  );
}