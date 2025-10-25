import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/queryClient';
import { mobileApiCall } from '../utils/mobileApi';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { usePermissions } from '../contexts/PermissionContext';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

// Schema per la validazione del form
const getRegistrationSchema = (t: any) => z.object({
  jobId: z.number({
    required_error: t('mobile.jobs.modal.jobRegistration.form.jobRequired'),
    invalid_type_error: t('mobile.jobs.modal.jobRegistration.form.jobValid')
  }),
  activityId: z.number({
    required_error: t('mobile.jobs.modal.jobRegistration.form.activityRequired'),
    invalid_type_error: t('mobile.jobs.modal.jobRegistration.form.activityValid')
  }),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled'], {
    required_error: t('mobile.jobs.modal.jobRegistration.form.statusRequired')
  }),
  duration: z.number({
    required_error: t('mobile.jobs.modal.jobRegistration.form.durationRequired'),
    invalid_type_error: t('mobile.jobs.modal.jobRegistration.form.durationNumber')
  }).min(0.5, t('mobile.jobs.modal.jobRegistration.form.durationMin')),
  startDate: z.string().min(1, t('mobile.jobs.modal.jobRegistration.form.startDateRequired')),
  notes: z.string().optional(),
  materials: z.string().optional(),
  materialsCost: z.number().optional(),
  completedDate: z.string().optional(),
  actualDuration: z.number().optional(),
});

type RegistrationFormValues = z.infer<ReturnType<typeof getRegistrationSchema>>;

interface JobRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: number;
}

export function JobRegistrationDialog({ isOpen, onClose, jobId }: JobRegistrationDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  
  // Field visibility permissions for registration
  const { hasPermission } = usePermissions();
  const canViewRegistrationDate = hasPermission('canViewRegistrationDate');
  const canViewRegistrationTime = hasPermission('canViewRegistrationTime');
  const canViewRegistrationActivity = hasPermission('canViewRegistrationActivity');
  const canViewRegistrationDuration = hasPermission('canViewRegistrationDuration');
  const canViewRegistrationPhotos = hasPermission('canViewRegistrationPhotos');
  const canViewRegistrationLocation = hasPermission('canViewRegistrationLocation');
  const canViewRegistrationJob = hasPermission('canViewRegistrationJob');
  const canViewRegistrationNotes = hasPermission('canViewRegistrationNotes');
  const canViewRegistrationMaterials = hasPermission('canViewRegistrationMaterials');
  const canViewRegistrationSignature = hasPermission('canViewRegistrationSignature');

  // Get schema with translations
  const registrationSchema = getRegistrationSchema(t);

  // Filtra i lavori in corso o programmati
  const filteredJobStatus = ['scheduled', 'in_progress'];

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

  // Query per ottenere tutte le attività disponibili
  const { data: allActivities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['/api/mobile/activities'],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/activities');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore nel recuperare le attività: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: isOpen
  });

  // Query per ottenere tutti i lavori disponibili (se jobId non è fornito)
  const { data: allJobs = [], isLoading: isJobsLoading } = useQuery({
    queryKey: ['/api/mobile/all-jobs'],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/all-jobs');
      if (!response.ok) throw new Error('Errore nel recuperare i lavori');
      return response.json();
    },
    enabled: !jobId && isOpen
  });

  // Filtra i lavori per mostrare solo quelli in corso o programmati
  const jobs = allJobs.filter((job: any) => filteredJobStatus.includes(job.status));

  // Inizializza il form
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      jobId: jobId || 0,
      activityId: -1, // Default to General Activity
      status: 'in_progress',
      duration: 1,
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: '',
      materials: '',
      materialsCost: 0,
      completedDate: '',
      actualDuration: 0,
    }
  });

  // Filtra le attività in base al tipo di lavoro selezionato
  const activities = useMemo(() => {
    if (!allActivities.length) {
      return [];
    }
    
    // Aggiungi sempre un'opzione "General Activity" all'inizio
    const generalActivity = {
      id: -1, // Use negative ID to avoid conflicts
      name: 'General Activity',
      description: 'General work activity',
      jobTypeId: null
    };
    
    // Se abbiamo un jobId specifico, usa il tipo di quel job
    let jobType = job?.type;
    
    // Se non abbiamo un jobId ma abbiamo selezionato un job nel form
    if (!jobType && form.watch('jobId')) {
      const selectedJob = jobs.find((j: any) => j.id === form.watch('jobId'));
      jobType = selectedJob?.type;
    }
    
    if (!jobType) return [generalActivity, ...allActivities];
    
    // Mappa i tipi di lavoro ai jobTypeId
    const jobTypeMap: { [key: string]: number } = {
      'repair': 1,
      'installation': 2, 
      'maintenance': 3,
      'quote': 4,
      'emergency': 5
    };
    
    const jobTypeId = jobTypeMap[jobType];
    if (!jobTypeId) return [generalActivity, ...allActivities];
    
    // Filtra le attività per il tipo di lavoro specifico
    const filteredActivities = allActivities.filter((activity: any) => activity.jobTypeId === jobTypeId);
    
    // Se non ci sono attività specifiche per questo tipo di lavoro, mostra tutte le attività
    if (filteredActivities.length === 0) {
      return [generalActivity, ...allActivities];
    }
    
    return [generalActivity, ...filteredActivities];
  }, [allActivities, job?.type, jobs, form.watch('jobId')]);

  // Aggiorna il form quando cambia il lavoro selezionato
  useEffect(() => {
    if (jobId) {
      form.setValue('jobId', jobId);
    }
  }, [jobId, form]);

  // Registra le attività
  const registerActivity = useMutation({
    mutationFn: async (values: RegistrationFormValues) => {
      // Crea FormData per l'upload dei file
      const formData = new FormData();
      
      // Aggiungi tutti i campi del form
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Aggiungi le foto
      mediaFiles.forEach(file => {
        formData.append('photos', file);
      });
      
      return apiRequest({
        method: 'POST',
        url: '/api/job-activities',
        data: formData
      });
    },
    onSuccess: () => {
      console.log('🎉 Activity registered successfully!');
      toast({
        title: t('mobile.jobs.modal.jobRegistration.activityRegistered'),
        description: t('mobile.jobs.modal.jobRegistration.activityRegisteredDescription'),
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/jobs'] });
      
      // Resetta il form e chiudi il dialog
      form.reset({
        jobId: jobId || 0,
        activityId: -1, // Reset to General Activity
        status: 'in_progress',
        duration: 1,
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: '',
        materials: '',
        materialsCost: 0,
        completedDate: '',
        actualDuration: 0,
      });
      setPhotos([]);
      setMediaFiles([]);
      onClose();
    },
    onError: (error) => {
      console.error('Errore durante la registrazione:', error);
      toast({
        title: t('mobile.jobs.modal.jobRegistration.errorTitle'),
        description: t('mobile.jobs.modal.jobRegistration.errorDescription'),
        variant: 'destructive'
      });
    }
  });

  // Gestione del caricamento dei file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newMediaFiles = Array.from(files);
    const validFiles = newMediaFiles.filter(file => {
      // Controlla se il file è un'immagine o un video
      return (file.type.startsWith('image/') || file.type.startsWith('video/'));
    });
    
    // Aggiungi i nuovi file validi alla lista di file
    setMediaFiles(prev => [...prev, ...validFiles]);
    
    // Crea URL temporanei per la preview
    const newPhotos = validFiles.map(file => URL.createObjectURL(file));
    setPhotos(prev => [...prev, ...newPhotos]);
  };
  
  // Rimuovi una foto
  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newMediaFiles = [...mediaFiles];
    
    // Revoca l'URL per evitare memory leak
    URL.revokeObjectURL(photos[index]);
    
    newPhotos.splice(index, 1);
    newMediaFiles.splice(index, 1);
    
    setPhotos(newPhotos);
    setMediaFiles(newMediaFiles);
  };

  // Gestione invio form
  const onSubmit = (values: RegistrationFormValues) => {
    registerActivity.mutate(values);
  };
  
  // Gestione salvataggio in bozza
  const saveAsDraft = () => {
    // Copia i valori correnti del form
    const values = form.getValues();
    // Imposta lo stato come "in_progress" (in corso)
    values.status = "in_progress";
    // Esegui la mutazione
    registerActivity.mutate(values);
  };

  // Quando si chiude il dialog, pulisci il form
  const handleDialogClose = () => {
    form.reset();
    setPhotos([]);
    setMediaFiles([]);
    onClose();
  };

  // Caricamento dei dati
  const isLoading = isJobLoading || isActivitiesLoading || isJobsLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-start">
          <div>
            <DialogTitle>{t('mobile.jobs.modal.jobRegistration.registerActivityTitle')}</DialogTitle>
            {job && job.title && (
              <div className="text-sm text-gray-600 mt-1">
                <p>{job.title}</p>
                <p className="text-xs">{t('mobile.jobs.modal.jobRegistration.jobStartDate', { date: job.startDate ? format(new Date(job.startDate), "dd MMM yyyy, HH:mm", { locale: it }) : '' })}</p>
              </div>
            )}
          </div>
          
          {/* Menu a tre punti rimosso su richiesta dell'utente */}
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center">
            <p>{t('mobile.jobs.modal.jobRegistration.loading')}</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 pt-1">
              {/* Campo JobId mostrato solo quando il jobId non è fornito come prop */}
              {!jobId && (
                <FormField
                  control={form.control}
                  name="jobId"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.jobLabel')}</FormLabel>
                      <Select 
                        value={field.value.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('mobile.jobs.modal.jobRegistration.form.jobPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">{t('mobile.jobs.modal.jobRegistration.form.jobSelect')}</SelectItem>
                          {jobs.map((job: any) => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title} - {job.startDate ? format(new Date(job.startDate), "dd MMM yyyy, HH:mm", { locale: it }) : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo attività - mostrato sempre quando abbiamo un job selezionato */}
              {(jobId || form.watch('jobId') > 0) && (
                <FormField
                  control={form.control}
                  name="activityId"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.activityLabel')}</FormLabel>
                      <Select 
                        value={field.value.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('mobile.jobs.modal.jobRegistration.form.activityPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">{t('mobile.jobs.modal.jobRegistration.form.activitySelect')}</SelectItem>
                          {activities.map((activity: any) => (
                            <SelectItem key={activity.id} value={activity.id.toString()}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="mb-2">
                    <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.statusLabel')}</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('mobile.jobs.modal.jobRegistration.form.statusPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">{t('mobile.jobs.modal.jobRegistration.form.statusScheduled')}</SelectItem>
                        <SelectItem value="in_progress">{t('mobile.jobs.modal.jobRegistration.form.statusInProgress')}</SelectItem>
                        <SelectItem value="completed">{t('mobile.jobs.modal.jobRegistration.form.statusCompleted')}</SelectItem>
                        <SelectItem value="cancelled">{t('mobile.jobs.modal.jobRegistration.form.statusCancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="mb-2">
                    <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.startDateLabel')}</FormLabel>
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
                  <FormItem className="mb-2">
                    <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.durationLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0.5" 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campi visibili solo se lo stato è "completed" */}
              {form.watch('status') === 'completed' && (
                <>
                  <FormField
                    control={form.control}
                    name="completedDate"
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <FormLabel>Completion Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            value={field.value || format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualDuration"
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <FormLabel>Actual Duration (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            value={field.value || 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {canViewRegistrationMaterials && (
                <FormField
                  control={form.control}
                  name="materials"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.materialsLabel')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('mobile.jobs.modal.jobRegistration.form.materialsPlaceholder')} 
                          className="min-h-[60px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {canViewRegistrationMaterials && (
                <FormField
                  control={form.control}
                  name="materialsCost"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.materialsCostLabel')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {canViewRegistrationNotes && (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.notesLabel')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('mobile.jobs.modal.jobRegistration.form.notesPlaceholder')} 
                          className="min-h-[60px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Upload foto */}
              {canViewRegistrationPhotos && (
                <div className="space-y-1 mb-2">
                  <FormLabel>{t('mobile.jobs.modal.jobRegistration.form.photosLabel')}</FormLabel>
                <div className="flex items-center space-x-2">
                  <label className="flex-1">
                    <div className="cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center hover:bg-gray-50">
                      <span className="mr-2">{t('mobile.jobs.modal.jobRegistration.form.chooseFile')}</span>
                      {photos.length > 0 ? 
                        <span className="text-gray-500">{photos.length} {t('mobile.jobs.modal.jobRegistration.form.selectedFiles')}</span> : 
                        <span className="text-gray-500">{t('mobile.jobs.modal.jobRegistration.form.noFilesSelected')}</span>
                      }
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*, video/*" 
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('mobile.jobs.modal.jobRegistration.form.fileTypesHint')}
                </p>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative rounded overflow-hidden" style={{ height: '60px' }}>
                        {mediaFiles[index]?.type.startsWith('video/') ? (
                          <video 
                            className="w-full h-full object-cover" 
                            controls={false}
                          >
                            <source src={photo} type={mediaFiles[index]?.type} />
                            <p>{t('mobile.jobs.modal.jobRegistration.form.videoNotSupported')}</p>
                          </video>
                        ) : (
                          <img 
                            src={photo} 
                            alt={`File ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center leading-none text-xs"
                          aria-label={t('mobile.jobs.modal.jobRegistration.form.removeFile')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  {t('mobile.jobs.modal.jobRegistration.cancelButton')}
                </Button>
                
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={saveAsDraft}
                  disabled={registerActivity.isPending}
                >
                  {t('mobile.jobs.modal.jobRegistration.saveAsDraftButton')}
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={registerActivity.isPending}
                  className="col-span-2"
                >
                  {registerActivity.isPending ? t('mobile.jobs.modal.jobRegistration.registering') : t('mobile.jobs.modal.jobRegistration.registerActivityButton')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}