import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { QuickClientModal } from './quick-client-modal';
import { QuickJobTypeModal } from './quick-jobtype-modal';

interface Client {
  id: number;
  name: string;
  address?: string;
}

interface JobType {
  id: number;
  name: string;
  description: string | null;
}

const jobSchema = z.object({
  title: z.string().min(1, "Titolo è richiesto"),
  clientId: z.number().min(1, "Seleziona un cliente"),
  type: z.string().min(1, "Tipo lavoro è richiesto"),
  date: z.string().min(1, "Data è richiesta"),
  startTime: z.string().min(1, "Ora inizio è richiesta"),
  duration: z.number().min(0.5, "Durata minima è 0.5 ore"),
  hourlyRate: z.number().min(0, "Tariffa/ora non può essere negativa"),
  materialsCost: z.number().min(0, "Costo materiali non può essere negativo"),
  location: z.string().optional(),
  notes: z.string().optional(),
  // Non includiamo photos nello schema Zod perché verrà gestito separatamente
});

type JobFormData = z.infer<typeof jobSchema>;

export function NewJobModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showJobTypeModal, setShowJobTypeModal] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: isOpen
  });
  
  const { data: jobTypes = [] } = useQuery<JobType[]>({
    queryKey: ['/api/jobtypes'],
    enabled: isOpen
  });
  
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      clientId: 0,
      type: 'repair',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      duration: 1,
      hourlyRate: 40,
      materialsCost: 0,
      location: '',
      notes: '',
    }
  });
  
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'new-job-modal') {
        setIsOpen(true);
      }
    };
    
    document.addEventListener('openModal', handleOpenModal);
    return () => document.removeEventListener('openModal', handleOpenModal);
  }, []);
  
  const closeModal = () => {
    setIsOpen(false);
    reset();
    setPhotos([]);
    setMediaFiles([]);
  };
  
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
  
  // Handler per l'aggiunta di un nuovo cliente
  const handleClientAdded = (clientId: number) => {
    setValue('clientId', clientId);
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    setShowClientModal(false);
    
    // Tentativo di aggiornare l'indirizzo se disponibile
    setTimeout(() => {
      const client = clients.find(c => c.id === clientId);
      if (client && client.address) {
        setValue('location', client.address);
      }
    }, 300);
  };
  
  // Handler per l'aggiunta di un nuovo tipo di lavoro personalizzato
  const handleJobTypeAdded = (jobTypeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
    setShowJobTypeModal(false);
    toast({
      title: "Tipo di lavoro aggiunto",
      description: "Il nuovo tipo di lavoro è stato aggiunto con successo",
    });
  };

  const onSubmit = async (data: JobFormData) => {
    try {
      // Convert date and time to ISO format
      const startDate = new Date(`${data.date}T${data.startTime}`);
      
      const jobData = {
        ...data,
        startDate: startDate.toISOString(),
        photos: photos // Aggiungi i file all'oggetto job
      };
      
      await apiRequest({
        url: '/api/jobs',
        method: 'POST',
        data: jobData
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      toast({
        title: "Lavoro creato",
        description: "Il nuovo lavoro è stato creato con successo",
      });
      
      closeModal();
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nella creazione del lavoro",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-neutral-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold">Nuovo Lavoro</h2>
            <button 
              className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100" 
              onClick={closeModal} 
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Titolo Lavoro</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    {...register('title')}
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Cliente</label>
                  <select 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    {...register('clientId', { valueAsNumber: true })}
                  >
                    <option value={0}>-- Seleziona Cliente --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                    <option value={-1}>+ Aggiungi Nuovo Cliente</option>
                  </select>
                  {errors.clientId && <p className="mt-1 text-sm text-red-500">{errors.clientId.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo Lavoro</label>
                  <select 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    {...register('type')}
                  >
                    <option value="">-- Seleziona Tipo --</option>
                    <option value="repair">Riparazione</option>
                    <option value="installation">Installazione</option>
                    <option value="maintenance">Manutenzione</option>
                    <option value="quote">Preventivo</option>
                    <option value="emergency">Emergenza</option>
                    {jobTypes && jobTypes.map(jobType => (
                      <option key={jobType.id} value={jobType.id}>{jobType.name}</option>
                    ))}
                    <option value="custom">+ Aggiungi Tipo Personalizzato</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Data</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      {...register('date')}
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Ora Inizio</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      {...register('startTime')}
                    />
                    {errors.startTime && <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Durata (ore)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      min="0.5"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      {...register('duration', { valueAsNumber: true })}
                    />
                    {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Tariffa/ora (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      {...register('hourlyRate', { valueAsNumber: true })}
                    />
                    {errors.hourlyRate && <p className="mt-1 text-sm text-red-500">{errors.hourlyRate.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Materiali (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      {...register('materialsCost', { valueAsNumber: true })}
                    />
                    {errors.materialsCost && <p className="mt-1 text-sm text-red-500">{errors.materialsCost.message}</p>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Luogo</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    {...register('location')}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Note</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" 
                    rows={3}
                    {...register('notes')}
                  ></textarea>
                  {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Foto e Video</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*, video/*" 
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Puoi caricare file immagine (.jpg, .png, .gif, ecc.) e video (.mp4, .mov, ecc.)
                  </p>
                  
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
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center leading-none text-xs"
                            aria-label="Rimuovi file"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {mediaFiles[index]?.type.startsWith('video/') ? 'Video' : 'Foto'} {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creazione...
                    </span>
                  ) : 'Crea Lavoro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
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