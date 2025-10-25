import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Camera, X } from 'lucide-react';

const getJobSchema = (t: any) => z.object({
  title: z.string().min(1, t('mobile.jobs.modal.newJob.form.titleRequired')),
  clientId: z.number({
    required_error: t('mobile.jobs.modal.newJob.form.clientRequired'),
    invalid_type_error: t('mobile.jobs.modal.newJob.form.clientValid')
  }),
  type: z.enum(['repair', 'installation', 'maintenance', 'quote', 'emergency'], {
    required_error: t('mobile.jobs.modal.newJob.form.typeRequired')
  }),
  startDate: z.string().min(1, t('mobile.jobs.modal.newJob.form.startDateRequired')),
  duration: z.number({
    required_error: t('mobile.jobs.modal.newJob.form.durationRequired'),
    invalid_type_error: t('mobile.jobs.modal.newJob.form.durationNumber')
  }).min(0.5, t('mobile.jobs.modal.newJob.form.durationMin')),
  hourlyRate: z.number({
    required_error: t('mobile.jobs.modal.newJob.form.hourlyRateRequired'),
    invalid_type_error: t('mobile.jobs.modal.newJob.form.hourlyRateNumber')
  }).min(0, t('mobile.jobs.modal.newJob.form.hourlyRateMin')),
  materialsCost: z.number({
    invalid_type_error: t('mobile.jobs.modal.newJob.form.materialsCostNumber')
  }).default(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

type JobFormValues = z.infer<ReturnType<typeof getJobSchema>>;

interface NewJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  initialDate?: Date;
}

export function NewJobDialog({ isOpen, onClose, onSubmit, initialDate = new Date() }: NewJobDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Get schema with translations
  const jobSchema = getJobSchema(t);
  
  // Queries per ottenere i clienti
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/mobile/all-clients'],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/all-clients');
      if (!response.ok) throw new Error('Errore nel recuperare i clienti');
      return response.json();
    },
    enabled: isOpen
  });
  
  // Inizializza il form con i valori predefiniti
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      clientId: 0,
      type: 'repair',
      startDate: initialDate 
        ? format(initialDate, "yyyy-MM-dd'T'HH:mm") 
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
    if (initialDate) {
      form.setValue('startDate', format(initialDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [initialDate, form]);

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

  // Funzione per creare un nuovo lavoro
  const handleFormSubmit = async (values: JobFormValues) => {
    try {
      // Prepara i dati del form inclusi i file
      const formData = new FormData();
      
      // Aggiungi i campi del form
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Aggiungi i file multimediali
      mediaFiles.forEach(file => {
        formData.append('photos', file);
      });
      
      // Passa i dati al parent component
      onSubmit(formData);
      
      // Resetta il form e chiudi il dialog
      form.reset();
      setPhotos([]);
      setMediaFiles([]);
    } catch (error) {
      console.error('Errore durante la creazione del lavoro:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante la creazione del lavoro',
        variant: 'destructive'
      });
    }
  };

  // Quando si chiude il dialog, pulisci il form
  const handleDialogClose = () => {
    form.reset();
    setPhotos([]);
    setMediaFiles([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
                  <DialogTitle>{t('mobile.jobs.modal.newJob.title')}</DialogTitle>
        <DialogDescription>
          {t('mobile.jobs.modal.newJob.description')}
        </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('mobile.jobs.modal.newJob.form.titlePlaceholder')} {...field} />
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
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.client')}</FormLabel>
                  <Select 
                    value={field.value.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('mobile.jobs.modal.newJob.form.clientPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">{t('mobile.jobs.modal.newJob.form.clientPlaceholder')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.type')}</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('mobile.jobs.modal.newJob.form.typePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="repair">{t('mobile.jobs.type.repair')}</SelectItem>
                      <SelectItem value="installation">{t('mobile.jobs.type.installation')}</SelectItem>
                      <SelectItem value="maintenance">{t('mobile.jobs.type.maintenance')}</SelectItem>
                      <SelectItem value="quote">{t('mobile.jobs.type.quote')}</SelectItem>
                      <SelectItem value="emergency">{t('mobile.jobs.type.emergency')}</SelectItem>
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
                <FormItem>
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.startDate')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('mobile.jobs.modal.newJob.form.duration')}</FormLabel>
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

              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('mobile.jobs.modal.newJob.form.hourlyRate')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.location')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('mobile.jobs.modal.newJob.form.locationPlaceholder')} {...field} />
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
                  <FormLabel>{t('mobile.jobs.modal.newJob.form.notes')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('mobile.jobs.modal.newJob.form.notesPlaceholder')} 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload foto */}
            <div className="space-y-2">
              <FormLabel>{t('mobile.jobs.modal.newJob.form.photos')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={photo}
                      alt={`${t('mobile.jobs.modal.newJob.form.photoPreview')} ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-md cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Camera size={24} className="text-gray-500" />
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                {t('mobile.jobs.modal.newJob.form.cancel')}
              </Button>
              <Button type="submit">
                {t('mobile.jobs.modal.newJob.form.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}