import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import MobileLayout from "../components/MobileLayout";
import FeatureGate from "../components/FeatureGate";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { mobileGet, mobileDelete } from "../utils/mobileApi";

// Definisci l'interfaccia per il ruolo
interface Role {
  id: number;
  name: string;
  description?: string;
  isAdmin?: boolean;
  permissions?: Record<string, boolean>;
}

export default function RolesSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { getLimit } = usePlanFeatures();

  // Carica i ruoli
  const { data: roles = [], isLoading: isRolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/mobile/roles'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/roles');
        if (!response.ok) {
          throw new Error('Errore nel recuperare i ruoli');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return [];
      }
    }
  });

  // Filtra i ruoli in base alla ricerca
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mutation per eliminare un ruolo
  const deleteRole = useMutation({
    mutationFn: async (id: number) => {
      const response = await mobileDelete(`/roles/${id}`);

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione del ruolo');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ruolo eliminato",
        description: "Il ruolo è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const getRoleBadgeColor = (isAdmin: boolean = false) => {
    return isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il ruolo "${name}"?`)) {
      deleteRole.mutate(id);
    }
  };

  const atLimit = false; // roles currently not limited; keep hook for future
  const rightAction = (
    <Button 
      size="sm"
      onClick={() => setLocation("/mobile/settings/roles/new")}
      disabled={atLimit}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo
    </Button>
  );

  const content = (
    <MobileLayout 
      title="Ruoli" 
      rightAction={rightAction}
      showNavButtons={true}
      prevPage="/mobile/settings/activities"
      nextPage="/mobile/settings/collaborators">
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci i ruoli del personale e le loro autorizzazioni
          </p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca ruolo..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isRolesLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento ruoli...</p>
          </div>
        ) : filteredRoles.length > 0 ? (
          <div className="space-y-4">
            {filteredRoles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{role.name}</h3>
                    <div className="mt-1">
                      <Badge className={getRoleBadgeColor(role.isAdmin)}>
                        {role.isAdmin ? 'Amministratore' : 'Collaboratore'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setLocation(`/mobile/settings/roles/${role.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(role.id, role.name)}
                    >
                      <Trash className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                {role.description && (
                  <div className="mt-2 text-sm text-gray-500">
                    <p>{role.description}</p>
                  </div>
                )}

                <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                  {role.permissions && Object.entries(role.permissions).map(([key, value]) => (
                    <div key={key} className={`flex items-center ${value ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-600' : 'bg-gray-300'} mr-1`}></div>
                      <span>
                        {key.replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .replace('Can ', '')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessun ruolo trovato</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/mobile/settings/roles/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi ruolo
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
  return (
    <FeatureGate feature="collaborator_management" fallback={<MobileLayout title="Ruoli"><div className="p-4 text-center text-gray-500">Funzionalità non inclusa nel tuo piano.</div></MobileLayout>}>
      {content}
    </FeatureGate>
  );
}