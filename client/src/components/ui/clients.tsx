import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

interface Client {
  id: number;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients']
  });
  
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    
    return matchesSearch && matchesType;
  });
  
  const handleEditClient = (client: Client) => {
    // This would trigger opening the edit modal in a real implementation
    toast({
      title: "Edit client",
      description: `Editing ${client.name} (feature not implemented)`,
    });
  };
  
  const handleCallClient = (client: Client) => {
    // This would trigger a call action in a real implementation
    toast({
      title: "Call client",
      description: `Calling ${client.name} at ${client.phone}`,
    });
  };
  
  const handleViewJobs = (client: Client) => {
    // This would navigate to client's jobs in a real implementation
    toast({
      title: "View jobs",
      description: `Viewing jobs for ${client.name}`,
    });
  };
  
  const formatClientType = (type: string) => {
    switch(type) {
      case 'residential':
        return { label: 'Residenziale', bgColor: 'bg-blue-600' };
      case 'commercial':
        return { label: 'Commerciale', bgColor: 'bg-yellow-500' };
      case 'industrial':
        return { label: 'Industriale', bgColor: 'bg-green-500' };
      default:
        return { label: type, bgColor: 'bg-neutral-500' };
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('it-IT', { month: 'long' });
    const year = date.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  };

  return (
    <div id="clients-tab" className="tab-content p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-blue-800">Clienti</h1>
        <button 
          className="flex items-center space-x-1 bg-blue-800 text-white px-3 py-2 rounded-lg"
          onClick={() => document.dispatchEvent(new CustomEvent('openModal', { detail: 'new-client-modal' }))}
        >
          <span className="material-icons text-sm">add</span>
          <span>Nuovo Cliente</span>
        </button>
      </div>
      
      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons text-neutral-400">search</span>
            </span>
            <input 
              type="text" 
              placeholder="Cerca clienti..." 
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <select 
              className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tutti i tipi</option>
              <option value="residential">Residenziale</option>
              <option value="commercial">Commerciale</option>
              <option value="industrial">Industriale</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Client list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow h-48 animate-pulse"></div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-icons text-5xl text-neutral-300">people</span>
          <p className="mt-2 text-neutral-500">Nessun cliente trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const { label, bgColor } = formatClientType(client.type);
            
            return (
              <div key={client.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-neutral-200">
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                    <span className={`${bgColor} text-white text-xs px-2 py-1 rounded`}>{label}</span>
                  </div>
                  <p className="text-neutral-600 text-sm mt-1">Cliente dal: {formatDate(client.createdAt)}</p>
                </div>
                <div className="p-4">
                  {client.phone && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="material-icons text-neutral-500">phone</span>
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="material-icons text-neutral-500">email</span>
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center space-x-2">
                      <span className="material-icons text-neutral-500">location_on</span>
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
                <div className="bg-neutral-50 p-3 border-t border-neutral-200 flex justify-end space-x-2">
                  <button 
                    className="text-neutral-600 hover:text-blue-600 p-2 rounded-full"
                    onClick={() => handleEditClient(client)}
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button 
                    className="text-neutral-600 hover:text-blue-600 p-2 rounded-full"
                    onClick={() => handleCallClient(client)}
                  >
                    <span className="material-icons">phone</span>
                  </button>
                  <button 
                    className="text-neutral-600 hover:text-blue-600 p-2 rounded-full"
                    onClick={() => handleViewJobs(client)}
                  >
                    <span className="material-icons">work</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
