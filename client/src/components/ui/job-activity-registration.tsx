import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

interface Job {
  id: number;
  title: string;
  clientId: number;
  type: string;
  status: string;
  startDate: string;
  duration: number;
  hourlyRate: number;
  materialsCost: number;
  location: string;
  notes: string;
  client?: {
    name: string;
  };
}

interface Activity {
  id: number;
  name: string;
  description: string | null;
  jobTypeId: number;
  jobTypeIds: string | null;
  defaultDuration: number | null;
  defaultRate: number | null;
  defaultCost: number | null;
}

interface Collaborator {
  id: number;
  fullName: string;
  username: string;
  roleId: number | null;
}

interface JobActivity {
  id: number;
  jobId: number;
  activityId: number;
  startDate: string;
  duration: number;
  status: string;
  notes: string | null;
  completedDate: string | null;
  actualDuration: number | null;
  photos: string[];
}

interface JobActivityRegistrationProps {
  job: Job;
  onCompleted?: () => void;
}

// Schema per la validazione del form
const jobActivityRegistrationSchema = z.object({
  activityId: z.number().min(1, "Seleziona un'attività"),
  collaboratorIds: z.array(z.number()).optional(),
  startDate: z.string().min(1, "La data di inizio è richiesta"),
  duration: z.number({
    required_error: "La durata è richiesta",
    invalid_type_error: "La durata deve essere un numero"
  }).min(0.5, "La durata deve essere maggiore di 0.5 ore"),
  completedDate: z.string().min(1, "La data di completamento è richiesta"),
  actualDuration: z.number({
    required_error: "La durata effettiva è richiesta",
    invalid_type_error: "La durata deve essere un numero"
  }).min(0.5, "La durata deve essere maggiore di 0.5 ore"),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  photos: z.array(z.string()).optional()
});

type JobActivityRegistrationFormValues = z.infer<typeof jobActivityRegistrationSchema>;

export function JobActivityRegistration({ job, onCompleted }: JobActivityRegistrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [selectedJobTypeId, setSelectedJobTypeId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ottieni i tipi di lavoro
  const { data: jobTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/jobtypes'],
    enabled: isOpen
  });

  // Determina il tipo di lavoro dal job corrente
  useEffect(() => {
    if (isOpen && job && job.type) {
      let jobTypeId: number | null = null;
      
      // Controlla se è un tipo standard o personalizzato
      switch(job.type) {
        case 'repair':
        case 'installation':
        case 'maintenance':
        case 'quote':
        case 'emergency':
          // Cerca il jobType corrispondente in base al nome
          const jobTypeName = 
            job.type === 'repair' ? 'Riparazione' :
            job.type === 'installation' ? 'Installazione' :
            job.type === 'maintenance' ? 'Manutenzione' :
            job.type === 'quote' ? 'Preventivo' : 'Emergenza';
          
          const matchingJobType = jobTypes.find(jt => jt.name === jobTypeName);
          jobTypeId = matchingJobType ? matchingJobType.id : null;
          break;
        default:
          // Potrebbe essere un ID numerico di un tipo personalizzato
          const numericId = parseInt(job.type);
          if (!isNaN(numericId)) {
            jobTypeId = numericId;
          }
          break;
      }
      
      if (jobTypeId) {
        setSelectedJobTypeId(jobTypeId);
      }
    }
  }, [isOpen, job, jobTypes]);

  // Ottieni tutte le attività e poi filtrale sul client
  const { data: allActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Errore nel recupero delle attività: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: isOpen
  });
  
  // Filtra le attività sul client in base al tipo di lavoro selezionato
  const activities = useMemo(() => {
    // Se non c'è un tipo di lavoro selezionato, mostra tutte le attività
    if (!selectedJobTypeId) return allActivities;
    
    return allActivities.filter(activity => {
      // Verifica jobTypeId principale
      if (activity.jobTypeId === selectedJobTypeId) return true;
      
      // Verifica jobTypeIds (array)
      if (Array.isArray(activity.jobTypeIds) && activity.jobTypeIds.includes(selectedJobTypeId)) {
        return true;
      }
      
      // Verifica jobTypeIds (stringa JSON)
      if (typeof activity.jobTypeIds === 'string') {
        try {
          const jobTypeIds = JSON.parse(activity.jobTypeIds);
          if (Array.isArray(jobTypeIds) && jobTypeIds.includes(selectedJobTypeId)) {
            return true;
          }
        } catch (e) {
          // Se il parsing fallisce, controlla se è un singolo ID come stringa
          if (activity.jobTypeIds && activity.jobTypeIds.includes(String(selectedJobTypeId))) {
            return true;
          }
          console.error("Errore nel parsing jobTypeIds", e);
        }
      }
      
      return false;
    });
  }, [selectedJobTypeId, allActivities]);

  // Ottieni i collaboratori
  const { data: collaborators = [] } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators'],
    enabled: isOpen
  });

  // Ottieni le attività già registrate per questo lavoro
  const { data: jobActivities = [], refetch: refetchJobActivities } = useQuery<JobActivity[]>({
    queryKey: ['/api/jobs', job.id, 'activities'],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${job.id}/activities`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Errore nel recupero delle attività di lavoro: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: isOpen
  });

  // Inizializza il form con i valori predefiniti
  const form = useForm<JobActivityRegistrationFormValues>({
    resolver: zodResolver(jobActivityRegistrationSchema),
    defaultValues: {
      activityId: 0,
      collaboratorIds: [],
      startDate: format(new Date(job.startDate), "yyyy-MM-dd'T'HH:mm"), // Usa la data del job
      duration: 1,
      completedDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      actualDuration: 1,
      notes: '',
      status: 'completed',
      photos: []
    }
  });

  // Aggiorna i campi del form quando viene selezionata un'attività
  const updateFormWithActivity = (activityId: number) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      form.setValue('duration', activity.defaultDuration || 1);
    }
  };

  // Mutation per registrare l'attività
  const registerActivity = useMutation({
    mutationFn: async (values: JobActivityRegistrationFormValues) => {
      const response = await fetch(`/api/jobs/${job.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          photos,
          status: saveAsDraft ? 'in_progress' : values.status
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore nella registrazione attività: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: saveAsDraft ? "Attività salvata in bozza" : "Attività registrata",
        description: saveAsDraft 
          ? "L'attività è stata salvata come bozza e può essere completata successivamente." 
          : "L'attività è stata registrata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', job.id, 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setIsOpen(false);
      refetchJobActivities();
      if (onCompleted) onCompleted();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante la registrazione dell'attività: ${error.message}`,
        variant: "destructive"
      });
      console.error("Error registering activity:", error);
    }
  });

  // Gestione dell'upload delle immagini
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newMediaFiles = Array.from(files);
    const validFiles = newMediaFiles.filter(file => {
      // Controlla se il file è un'immagine o un video
      return (
        file.type.startsWith('image/') || 
        file.type.startsWith('video/')
      );
    });
    
    if (validFiles.length !== newMediaFiles.length) {
      toast({
        title: "Attenzione",
        description: "Alcuni file non sono stati aggiunti perché non sono immagini o video.",
        variant: "destructive"
      });
    }
    
    setMediaFiles(prev => [...prev, ...validFiles]);
    
    // Crea URL per visualizzazione anteprima
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  // Handler per la sottomissione del form
  const onSubmit = (values: JobActivityRegistrationFormValues) => {
    registerActivity.mutate(values);
  };

  // Formatta il tempo in ore e minuti
  const formatTime = (date: Date): string => {
    return format(date, "HH:mm", { locale: it });
  };

  // Formatta la data in italiano
  const formatDate = (date: Date): string => {
    return format(date, "d MMMM yyyy", { locale: it });
  };

  // Reset del form quando si chiude la finestra di dialogo
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setPhotos([]);
      setMediaFiles([]);
      setSaveAsDraft(false);
    }
  }, [isOpen, form]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center">
            <span className="material-icons text-sm mr-1">assignment_turned_in</span>
            <span>Registra</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Registrazione attività</DialogTitle>
              <DialogDescription>
                Registra un'attività per il lavoro: {job.title}
              </DialogDescription>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </DialogHeader>

          <div className="mb-4">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <CardDescription>
                  Cliente: {job.client?.name} | Luogo: {job.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Data programmata:</span>{' '}
                    {formatDate(new Date(job.startDate))} alle {formatTime(new Date(job.startDate))}
                  </div>
                  <div>
                    <span className="font-medium">Durata programmata:</span>{' '}
                    {job.duration} {job.duration === 1 ? 'ora' : 'ore'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Selezione attività</h3>
            {/* Il tipo di lavoro viene preselezionato automaticamente in base al tipo di lavoro */}
          </div>

          {/* Attività in ordine temporale */}
          {jobActivities.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Attività pianificate</h3>
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 max-h-40 overflow-y-auto">
                {jobActivities.sort((a, b) => 
                  new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                ).map(activity => {
                  const activityData = activities.find(a => a.id === activity.activityId);
                  return (
                    <div key={activity.id} className="flex justify-between items-center py-1 border-b border-neutral-200 last:border-0">
                      <div>
                        <span className="font-medium">{activityData?.name || `Attività #${activity.id}`}</span>
                        <span className="ml-2 text-sm text-neutral-600">
                          {formatDate(new Date(activity.startDate))} {formatTime(new Date(activity.startDate))}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          activity.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {activity.status === 'completed' ? 'Completata' :
                           activity.status === 'in_progress' ? 'In corso' :
                           activity.status === 'scheduled' ? 'Programmata' :
                           'Annullata'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Selezione attività e collaboratori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="activityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attività*</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                            updateFormWithActivity(Number(value));
                          }}
                          value={field.value?.toString() || undefined}
                          disabled={!selectedJobTypeId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedJobTypeId ? "Seleziona prima un tipo di lavoro" : "Seleziona attività"} />
                          </SelectTrigger>
                          <SelectContent>
                            {activities.map(activity => (
                              <SelectItem key={activity.id} value={activity.id.toString()}>
                                {activity.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collaboratorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collaboratori</FormLabel>
                      <FormControl>
                        <Select 
                          // In una vera implementazione, usare un MultiSelect component
                          onValueChange={(value) => {
                            field.onChange([Number(value)]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona collaboratore" />
                          </SelectTrigger>
                          <SelectContent>
                            {collaborators.map(collaborator => (
                              <SelectItem key={collaborator.id} value={collaborator.id.toString()}>
                                {collaborator.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date e durate */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e ora pianificata*</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata pianificata (ore)*</FormLabel>
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
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e ora di completamento*</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata effettiva (ore)*</FormLabel>
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
              </div>

              {/* Note di realizzazione */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note realizzazione attività</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Inserisci note su come è stata realizzata l'attività" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stato */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato*</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={saveAsDraft} // Disabilitato se è in modalità bozza
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completata</SelectItem>
                          <SelectItem value="in_progress">In corso</SelectItem>
                          <SelectItem value="scheduled">Programmata</SelectItem>
                          <SelectItem value="cancelled">Annullata</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {saveAsDraft && (
                      <p className="text-xs text-neutral-500 mt-1">
                        In modalità bozza lo stato sarà automaticamente "In corso"
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Upload media */}
              <div>
                <label className="block text-sm font-medium mb-1">Foto e Video</label>
                <Input 
                  type="file" 
                  accept="image/*,video/*" 
                  multiple 
                  onChange={handleFileUpload} 
                  className="mb-2"
                />
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative rounded overflow-hidden" style={{ height: '80px' }}>
                        {mediaFiles[index]?.type.startsWith('video/') ? (
                          <video 
                            className="w-full h-full object-cover" 
                            controls={false}
                          >
                            <source src={photo} type={mediaFiles[index]?.type} />
                            Il tuo browser non supporta il tag video.
                          </video>
                        ) : (
                          <img 
                            src={photo} 
                            alt={`File ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </Button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                          {mediaFiles[index]?.type.startsWith('video/') ? 'Video' : 'Foto'} {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => {
                    setSaveAsDraft(true);
                    form.handleSubmit(onSubmit)();
                  }}
                  disabled={registerActivity.isPending}
                >
                  {registerActivity.isPending && saveAsDraft ? "Salvando..." : "Salva in draft"}
                </Button>
                <Button 
                  type="submit" 
                  disabled={registerActivity.isPending}
                >
                  {registerActivity.isPending && !saveAsDraft ? "Registrando..." : "Registra attività"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}