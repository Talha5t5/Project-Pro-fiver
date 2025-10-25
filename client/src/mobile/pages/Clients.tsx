import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import MobileLayout from "../components/MobileLayout";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { mobileGet, mobileDelete } from "../utils/mobileApi";

// Definire l'interfaccia per il cliente
interface Client {
  id: number;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function ClientsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { getLimit, hasFeature } = usePlanFeatures();
  const canManageClients = hasFeature('client_management', true);

  // Carica i clienti
  const { data: clients = [], isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/mobile/all-clients'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/all-clients');
        if (!response.ok) {
          throw new Error('Errore nel recuperare i clienti');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return [];
      }
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Filtra i clienti in base alla ricerca
  const filteredClients = clients.filter((client) => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mutation per eliminare un cliente
  const deleteClient = useMutation({
    mutationFn: async (id: number) => {
      const response = await mobileDelete(`/clients/${id}`);

      if (!response.ok) {
        // Try to parse JSON error; if it fails, throw generic
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Errore durante l\'eliminazione del cliente');
        } catch {
          throw new Error('Errore durante l\'eliminazione del cliente');
        }
      }

      // Some backends may return empty body; avoid JSON parsing errors
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-clients'] });
      // Optimistic remove from local list to avoid any caching artifact
      queryClient.setQueryData<Client[]>(['/api/mobile/all-clients'], (old) =>
        (old || []).filter((c) => c.id !== (deleteClient.variables as number))
      );
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'residential':
        return 'bg-blue-100 text-blue-800';
      case 'commercial':
        return 'bg-green-100 text-green-800';
      case 'industrial':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientTypeName = (type: string) => {
    switch (type) {
      case 'residential':
        return 'Residenziale';
      case 'commercial':
        return 'Commerciale';
      case 'industrial':
        return 'Industriale';
      default:
        return 'Altro';
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il cliente "${name}"?`)) {
      deleteClient.mutate(id);
    }
  };

  const rightAction = (
    <Button 
      size="sm"
      onClick={() => setLocation("/mobile/settings/clients/new")}
      disabled={!canManageClients || clients.length >= (getLimit('max_clients', -1) === -1 ? Infinity : getLimit('max_clients', 0))}
      title={!canManageClients ? 'Funzionalità non disponibile nel piano' : undefined}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuovo
    </Button>
  );

  return (
    <MobileLayout 
      title="Clienti" 
      rightAction={rightAction}
      showNavButtons={true}
      prevPage="/mobile/settings"
      nextPage="/mobile/settings/jobtypes">
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci la rubrica dei tuoi clienti
          </p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca cliente..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {(!canManageClients) && (
          <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            Questa funzionalità non è inclusa nel tuo piano.
          </div>
        )}
        {isClientsLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento clienti...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{client.name}</h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge className={getBadgeColor(client.type)}>
                        {getClientTypeName(client.type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setLocation(`/mobile/settings/clients/${client.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(client.id, client.name)}
                    >
                      <Trash className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  {client.email && (
                    <p className="flex items-center">
                      Email: {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="flex items-center">
                      Telefono: {client.phone}
                    </p>
                  )}
                  {client.address && (
                    <p className="flex items-center">
                      Indirizzo: {client.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessun cliente trovato</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation("/mobile/settings/clients/new")}
              disabled={!canManageClients || clients.length >= (getLimit('max_clients', -1) === -1 ? Infinity : getLimit('max_clients', 0))}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi cliente
            </Button>
            {clients.length >= (getLimit('max_clients', -1) === -1 ? Infinity : getLimit('max_clients', 0)) && (
              <div className="mt-2 text-xs text-amber-700">Hai raggiunto il limite massimo di clienti del tuo piano.</div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}