import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import MobileLayout from "../components/MobileLayout";
import { mobileGet, mobileDelete } from "../utils/mobileApi";

// Definisci l'interfaccia per il tipo di lavoro
interface JobType {
  id: number;
  name: string;
  sector?: string;
  description?: string;
  defaultPrice?: number;
  estimatedHours?: number;
}

export default function JobTypesSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Carica i tipi di lavoro
  const { data: jobTypes = [], isLoading: isJobTypesLoading } = useQuery<JobType[]>({
    queryKey: ['/api/mobile/jobtypes'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/jobtypes');
        if (!response.ok) {
          throw new Error('Errore nel recuperare i tipi di lavoro');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return [];
      }
    }
  });

  // Filtra i tipi di lavoro in base alla ricerca
  const filteredJobTypes = jobTypes.filter(jobType => 
    jobType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (jobType.description && jobType.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mutation per eliminare un tipo di lavoro
  const deleteJobType = useMutation({
    mutationFn: async (id: number) => {
      const response = await mobileDelete(`/jobtypes/${id}`);

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione del tipo di lavoro');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tipo di lavoro eliminato",
        description: "Il tipo di lavoro è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/jobtypes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const getSectorColor = (sector: string) => {
    switch (sector.toLowerCase()) {
      case 'idraulica':
        return 'bg-blue-100 text-blue-800';
      case 'elettricità':
      case 'elettricita':
        return 'bg-yellow-100 text-yellow-800';
      case 'falegnameria':
        return 'bg-amber-100 text-amber-800';
      case 'edilizia':
        return 'bg-red-100 text-red-800';
      case 'climatizzazione':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il tipo di lavoro "${name}"?`)) {
      deleteJobType.mutate(id);
    }
  };

  const rightAction = (
    <Button 
      size="sm"
      onClick={() => setLocation("/mobile/settings/jobtypes/new")}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo
    </Button>
  );

  return (
    <MobileLayout 
      title="Tipi di Lavoro" 
      rightAction={rightAction}
      showNavButtons={true}
      prevPage="/mobile/settings/clients"
      nextPage="/mobile/settings/activities">
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci i tipi di lavoro che la tua azienda offre
          </p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca tipo di lavoro..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isJobTypesLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento tipi di lavoro...</p>
          </div>
        ) : filteredJobTypes.length > 0 ? (
          <div className="space-y-4">
            {filteredJobTypes.map((jobType) => (
              <div key={jobType.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{jobType.name}</h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge className={getSectorColor(jobType.sector || 'altro')}>
                        {jobType.sector || 'Altro'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setLocation(`/mobile/settings/jobtypes/${jobType.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(jobType.id, jobType.name)}
                    >
                      <Trash className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                {jobType.description && (
                  <div className="mt-2 text-sm text-gray-500">
                    <p>{jobType.description}</p>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-400">
                  {jobType.defaultPrice && (
                    <span className="mr-3">Prezzo base: €{jobType.defaultPrice.toFixed(2)}</span>
                  )}
                  {jobType.estimatedHours && (
                    <span>Ore stimate: {jobType.estimatedHours}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessun tipo di lavoro trovato</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/mobile/settings/jobtypes/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi tipo di lavoro
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}