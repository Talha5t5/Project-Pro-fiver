import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash, Phone, Mail } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import MobileLayout from "../components/MobileLayout";
import FeatureGate from "../components/FeatureGate";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { mobileGet, mobileDelete } from "../utils/mobileApi";

// Definisci l'interfaccia per il collaboratore
interface Collaborator {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  roleId?: number;
  skills?: string[];
}

// Definisci l'interfaccia per il ruolo
interface Role {
  id: number;
  name: string;
}

export default function CollaboratorsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { getLimit } = usePlanFeatures();

  // Carica i collaboratori
  const { data: collaborators = [], isLoading: isCollaboratorsLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/mobile/collaborators'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/collaborators');
        if (!response.ok) {
          throw new Error('Errore nel recuperare i collaboratori');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return [];
      }
    }
  });

  // Carica i ruoli per associarli ai collaboratori
  const { data: roles = [] } = useQuery<Role[]>({
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

  // Filtra i collaboratori in base alla ricerca
  const filteredCollaborators = collaborators.filter(collaborator => 
    collaborator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (collaborator.email && collaborator.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (collaborator.phone && collaborator.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mutation per eliminare un collaboratore
  const deleteCollaborator = useMutation({
    mutationFn: async (id: number) => {
      const response = await mobileDelete(`/collaborators/${id}`);

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione del collaboratore');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore eliminato",
        description: "Il collaboratore è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/collaborators'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Funzione per ottenere il nome del ruolo
  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Ruolo sconosciuto';
  };

  // Funzione per ottenere le iniziali del nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il collaboratore "${name}"?`)) {
      deleteCollaborator.mutate(id);
    }
  };

  const maxCollaborators = getLimit('max_collaborators', -1);
  const atLimit = maxCollaborators !== -1 && collaborators.length >= maxCollaborators;
  const rightAction = (
    <Button 
      size="sm"
      onClick={() => setLocation("/mobile/settings/collaborators/new")}
      disabled={atLimit}
      title={atLimit ? 'Hai raggiunto il limite del tuo piano' : undefined}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo
    </Button>
  );

  const content = (
    <MobileLayout 
      title="Collaboratori" 
      rightAction={rightAction}
      showNavButtons={true}
      prevPage="/mobile/settings/roles"
      nextPage="/mobile/settings">
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci il team di lavoro e assegna i ruoli
          </p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca collaboratore..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {atLimit && (
          <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            Limite massimo di collaboratori raggiunto per il tuo piano.
          </div>
        )}
        {isCollaboratorsLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento collaboratori...</p>
          </div>
        ) : filteredCollaborators.length > 0 ? (
          <div className="space-y-4">
            {filteredCollaborators.map((collaborator) => (
              <div key={collaborator.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getInitials(collaborator.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{collaborator.name}</h3>
                      {collaborator.roleId && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {getRoleName(collaborator.roleId)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setLocation(`/mobile/settings/collaborators/${collaborator.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(collaborator.id, collaborator.name)}
                    >
                      <Trash className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  {collaborator.email && (
                    <p className="flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-gray-400" />
                      {collaborator.email}
                    </p>
                  )}
                  {collaborator.phone && (
                    <p className="flex items-center">
                      <Phone className="h-3 w-3 mr-1 text-gray-400" />
                      {collaborator.phone}
                    </p>
                  )}
                </div>

                {collaborator.skills && collaborator.skills.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {collaborator.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessun collaboratore trovato</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/mobile/settings/collaborators/new")}
              disabled={atLimit}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi collaboratore
            </Button>
            {atLimit && (
              <div className="mt-2 text-xs text-amber-700">Hai raggiunto il limite del tuo piano.</div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
  return (
    <FeatureGate feature="collaborator_management" fallback={<MobileLayout title="Collaboratori"><div className="p-4 text-center text-gray-500">Funzionalità non inclusa nel tuo piano.</div></MobileLayout>}>
      {content}
    </FeatureGate>
  );
}