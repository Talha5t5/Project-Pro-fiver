import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addHours } from 'date-fns';
import { it } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';
import { Button } from './button';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { QuickClientModal } from './modals/quick-client-modal';
import { QuickJobTypeModal } from './modals/quick-jobtype-modal';

const jobSchema = z.object({
  title: z.string().min(1, 'Il titolo è richiesto'),
  clientId: z.number({
    required_error: 'Il cliente è richiesto',
    invalid_type_error: 'Seleziona un cliente valido'
  }),
  type: z.enum(['repair', 'installation', 'maintenance', 'quote', 'emergency'], {
    required_error: 'Il tipo di lavoro è richiesto'
  }),
  startDate: z.string().min(1, 'La data di inizio è richiesta'),
  duration: z.number({
    required_error: 'La durata è richiesta',
    invalid_type_error: 'La durata deve essere un numero'
  }).min(0.5, 'La durata minima è di 30 minuti'),
  hourlyRate: z.number({
    required_error: 'La tariffa oraria è richiesta',
    invalid_type_error: 'La tariffa deve essere un numero'
  }).min(0, 'La tariffa non può essere negativa'),
  materialsCost: z.number({
    invalid_type_error: 'Il costo deve essere un numero'
  }).default(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

type JobFormValues = z.infer<typeof jobSchema>;

interface CalendarJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onJobAdded?: () => void;
}

export function CalendarJobModal({ isOpen, onClose, selectedDate, onJobAdded }: CalendarJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showJobTypeModal, setShowJobTypeModal] = useState(false);

  // Queries per ottenere i clienti
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: isOpen
  });
  
  // Query per ottenere i tipi di lavoro personalizzati
  const { data: jobTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/jobtypes'],
    enabled: isOpen
  });

  // Inizializza il form con i valori predefiniti
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      clientId: 0,
      type: 'repair',
      startDate: selectedDate 
        ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") 
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration: 1,
      hourlyRate: 40,
      materialsCost: 0,
      location: '',
      notes: ''
    }
  });

  // Aggiorna il form quando cambia la data selezionata
  useEffect(() => {
    if (selectedDate) {
      form.setValue('startDate', format(selectedDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [selectedDate, form]);

  // Mutation per creare un nuovo lavoro
  const createJob = useMutation({
    mutationFn: (values: JobFormValues) => {
      return apiRequest('POST', '/api/jobs', values);
    },
    onSuccess: () => {
      toast({
        title: "Lavoro creato",
        description: "Il nuovo lavoro è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      form.reset();
      onClose();
      if (onJobAdded) onJobAdded();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del lavoro",
        variant: "destructive"
      });
      console.error("Error creating job:", error);
    }
  });

  // Handler per la sottomissione del form
  const onSubmit = (values: JobFormValues) => {
    createJob.mutate(values);
  };

  // Handler per l'auto-compilazione della posizione
  const handleClientChange = (clientId: number) => {
    const selectedClient = clients.find((c: any) => c.id === clientId);
    if (selectedClient && selectedClient.address) {
      form.setValue('location', selectedClient.address);
    }
  };

  // Handler per l'aggiunta di un nuovo cliente
  const handleClientAdded = (clientId: number) => {
    form.setValue('clientId', clientId);
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    setShowClientModal(false);
    
    // Cerchiamo il cliente appena aggiunto per ottenere l'indirizzo
    setTimeout(() => {
      const client = clients.find((c: any) => c.id === clientId);
      if (client && client.address) {
        form.setValue('location', client.address);
      }
    }, 300); // Piccolo ritardo per dare tempo alla query di aggiornarsi
  };
  
  // Handler per l'aggiunta di un nuovo tipo di lavoro personalizzato
  const handleJobTypeAdded = (jobTypeId: string) => {
    // In questo caso non facciamo nulla con il tipo di lavoro aggiunto perché
    // stiamo usando i tipi predefiniti (repair, installation, etc.) per il form del job
    queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
    setShowJobTypeModal(false);
    toast({
      title: "Tipo di lavoro aggiunto",
      description: "Il nuovo tipo di lavoro è stato aggiunto con successo",
    });
  };

  return (
    <>
      {/* Modal principale per l'aggiunta di un nuovo lavoro */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Aggiungi un nuovo lavoro</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli del nuovo lavoro da pianificare.
              </DialogDescription>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo*</FormLabel>
                    <FormControl>
                      <Input placeholder="Inserisci il titolo del lavoro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente*</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const clientId = parseInt(value);
                        field.onChange(clientId);
                        handleClientChange(clientId);
                      }}
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs"
                        onClick={() => setShowClientModal(true)}
                      >
                        + Aggiungi nuovo cliente
                      </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di lavoro*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="repair">Riparazione</SelectItem>
                          <SelectItem value="installation">Installazione</SelectItem>
                          <SelectItem value="maintenance">Manutenzione</SelectItem>
                          <SelectItem value="quote">Preventivo</SelectItem>
                          <SelectItem value="emergency">Emergenza</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs"
                          onClick={() => setShowJobTypeModal(true)}
                        >
                          + Aggiungi tipo personalizzato
                        </Button>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e ora di inizio*</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (ore)*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tariffa oraria (€)*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="materialsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo materiali (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posizione</FormLabel>
                    <FormControl>
                      <Input placeholder="Indirizzo del lavoro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Aggiungi eventuali note sul lavoro" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4 pb-2 sticky bottom-0 bg-white border-t border-gray-200 mt-4">
                <Button type="button" variant="outline" onClick={onClose} className="px-4">
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJob.isPending}
                  className="px-4 bg-blue-600 hover:bg-blue-700"
                >
                  {createJob.isPending ? "Salvataggio..." : "Salva lavoro"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal per aggiungere un nuovo cliente */}
      <QuickClientModal 
        isOpen={showClientModal} 
        onClose={() => setShowClientModal(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Modal per aggiungere un nuovo tipo di lavoro */}
      <QuickJobTypeModal
        isOpen={showJobTypeModal}
        onClose={() => setShowJobTypeModal(false)}
        onJobTypeAdded={handleJobTypeAdded}
      />
    </>
  );
}