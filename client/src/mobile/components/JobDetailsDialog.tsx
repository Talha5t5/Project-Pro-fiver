import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Calendar, Clock, MapPin, Briefcase, Tag, FileText, User, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import ActivityTracker from './ActivityTracker';

interface JobDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: number;
}

export function JobDetailsDialog({ isOpen, onClose, jobId }: JobDetailsDialogProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere i dettagli del lavoro selezionato
  const { data: job = {}, isLoading: isJobLoading } = useQuery({
    queryKey: ['/api/mobile/jobs', jobId],
    queryFn: async () => {
      if (!jobId) return {};
      const response = await mobileApiCall('GET', `/jobs/${jobId}`);
      if (!response.ok) throw new Error('Errore nel recuperare il lavoro');
      return response.json();
    },
    enabled: !!jobId && isOpen
  });
  
  // Mutation per annullare un lavoro
  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      const response = await mobileApiCall('PATCH', `/jobs/${jobId}`, { status: 'cancelled' });
      
      if (!response.ok) {
        throw new Error('Errore durante l\'annullamento del lavoro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Aggiorna la cache delle query
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/jobs', jobId] });
      
      // Mostra notifica di successo
      toast({
        title: "Lavoro annullato",
        description: "Il lavoro è stato annullato con successo",
        variant: "default",
      });
      
      // Chiudi il dialog
      setConfirmCancel(false);
      onClose();
    },
    onError: (error) => {
      // Mostra notifica di errore
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
      setConfirmCancel(false);
    }
  });

  // Query per ottenere i dettagli del cliente
  const { data: client = {}, isLoading: isClientLoading } = useQuery({
    queryKey: ['/api/mobile/clients', job.clientId],
    queryFn: async () => {
      if (!job.clientId) return {};
      const response = await mobileApiCall('GET', `/clients/${job.clientId}`);
      if (!response.ok) throw new Error('Errore nel recuperare il cliente');
      return response.json();
    },
    enabled: !!job.clientId && isOpen
  });

  // Ottieni il tipo di lavoro
  const jobTypes = [
    { value: "repair", label: "Riparazione" },
    { value: "installation", label: "Installazione" },
    { value: "maintenance", label: "Manutenzione" },
    { value: "quote", label: "Preventivo" },
    { value: "emergency", label: "Emergenza" },
  ];

  // Ottieni lo stato del lavoro
  const jobStatuses = [
    { value: "scheduled", label: "Programmato" },
    { value: "in_progress", label: "In corso" },
    { value: "completed", label: "Completato" },
    { value: "cancelled", label: "Cancellato" },
  ];

  const getJobTypeLabel = (type: string) => {
    const jobType = jobTypes.find(t => t.value === type);
    return jobType ? jobType.label : type;
  };

  const getJobStatusLabel = (status: string) => {
    const jobStatus = jobStatuses.find(s => s.value === status);
    return jobStatus ? jobStatus.label : status;
  };

  // Quando si chiude il dialog
  const handleDialogClose = () => {
    onClose();
  };

  // Caricamento dei dati
  const isLoading = isJobLoading || isClientLoading;

  // Formatta le date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, "dd MMMM yyyy", { locale: it });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy, HH:mm", { locale: it });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettagli Lavoro</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center">
            <p>Caricamento in corso...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <h2 className="text-xl font-bold">{job.title}</h2>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <User size={16} className="mr-1" />
                <span>{client.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start">
                <Calendar size={16} className="mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-gray-600">{formatDate(job.startDate)}</p>
                  {job.endDate && (
                    <p className="text-sm text-gray-600">
                      fino a {formatDate(job.endDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <Clock size={16} className="mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Orario</p>
                  <p className="text-sm text-gray-600">{job.startDate ? format(new Date(job.startDate), "HH:mm") : ''}</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin size={16} className="mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Indirizzo</p>
                  <p className="text-sm text-gray-600">{job.location || 'Non specificato'}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Briefcase size={16} className="mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Tipo di lavoro</p>
                  <p className="text-sm text-gray-600">{getJobTypeLabel(job.type)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Tag size={16} className="mr-2 mt-1 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Stato</p>
                  <p className="text-sm text-gray-600">{getJobStatusLabel(job.status)}</p>
                </div>
              </div>

              {job.description && (
                <div className="flex items-start">
                  <FileText size={16} className="mr-2 mt-1 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Descrizione</p>
                    <p className="text-sm text-gray-600">{job.description}</p>
                  </div>
                </div>
              )}

              {job.notes && (
                <div className="flex items-start">
                  <FileText size={16} className="mr-2 mt-1 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Note</p>
                    <p className="text-sm text-gray-600">{job.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Tracker Section */}
            {job.status !== 'cancelled' && job.status !== 'completed' && (
              <div className="mt-6 border-t pt-4">
                <ActivityTracker 
                  jobId={jobId!} 
                  onActivityComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/jobs/range'] });
                  }}
                />
              </div>
            )}

            <DialogFooter className="mt-4 flex flex-col space-y-2 w-full">
              {!confirmCancel ? (
                <>
                  {/* Mostra il pulsante di annulla solo se il lavoro non è già annullato o completato */}
                  {job.status !== 'cancelled' && job.status !== 'completed' && (
                    <Button 
                      onClick={() => setConfirmCancel(true)} 
                      variant="destructive"
                      className="w-full"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Annulla lavoro
                    </Button>
                  )}
                  <Button onClick={handleDialogClose} className="w-full">
                    Chiudi
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-red-600 font-medium">
                    Sei sicuro di voler annullare questo lavoro?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => setConfirmCancel(false)} 
                      variant="outline"
                    >
                      No, mantieni
                    </Button>
                    <Button 
                      onClick={() => cancelJobMutation.mutate()} 
                      variant="destructive"
                      disabled={cancelJobMutation.isPending}
                    >
                      {cancelJobMutation.isPending ? 'Annullamento...' : 'Sì, annulla'}
                    </Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}