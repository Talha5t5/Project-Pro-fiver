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

// Definisci l'interfaccia per l'attività
interface Activity {
  id: number;
  name: string;
  description?: string;
  jobTypeId?: number;
  estimatedDuration?: number;
  hourlyRate?: number;
}

// Definisci l'interfaccia per il tipo di lavoro
interface JobType {
  id: number;
  name: string;
}

export default function ActivitiesSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Carica le attività
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/mobile/activities'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/activities');
        if (!response.ok) {
          throw new Error('Errore nel recuperare le attività');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return [];
      }
    }
  });

  // Carica i tipi di lavoro per associarli alle attività
  const { data: jobTypes = [] } = useQuery<JobType[]>({
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

  // Filtra le attività in base alla ricerca
  const filteredActivities = activities.filter(activity => 
    activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mutation per eliminare un'attività
  const deleteActivity = useMutation({
    mutationFn: async (id: number) => {
      const response = await mobileDelete(`/activities/${id}`);

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione dell\'attività');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attività eliminata",
        description: "L'attività è stata eliminata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/activities'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Funzione per ottenere il nome del tipo di lavoro
  const getJobTypeName = (jobTypeId: number) => {
    const jobType = jobTypes.find(jt => jt.id === jobTypeId);
    return jobType ? jobType.name : 'Tipo di lavoro sconosciuto';
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare l'attività "${name}"?`)) {
      deleteActivity.mutate(id);
    }
  };

  const rightAction = (
    <Button 
      size="sm"
      onClick={() => setLocation("/mobile/settings/activities/new")}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo
    </Button>
  );

  return (
    <MobileLayout 
      title="Attività" 
      rightAction={rightAction}
      showNavButtons={true}
      prevPage="/mobile/settings/jobtypes"
      nextPage="/mobile/settings/roles">
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci le attività associate ai tipi di lavoro
          </p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca attività..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isActivitiesLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento attività...</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{activity.name}</h3>
                    {activity.jobTypeId && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getJobTypeName(activity.jobTypeId)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setLocation(`/mobile/settings/activities/${activity.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(activity.id, activity.name)}
                    >
                      <Trash className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                {activity.description && (
                  <div className="mt-2 text-sm text-gray-500">
                    <p>{activity.description}</p>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-400">
                  {activity.estimatedDuration && (
                    <span className="mr-3">Durata stimata: {activity.estimatedDuration} minuti</span>
                  )}
                  {activity.hourlyRate && (
                    <span>Tariffa oraria: €{activity.hourlyRate.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessuna attività trovata</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/mobile/settings/activities/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi attività
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}