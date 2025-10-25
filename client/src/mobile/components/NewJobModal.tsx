import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Clock, Plus, RefreshCw, Check, MapPin, ChevronDown, Users, FileText } from 'lucide-react';
import { usePermissions } from '../contexts/PermissionContext';
import { mobileApiCall } from '../utils/mobileApi';

interface Client {
  id: number;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  type?: string;
}

interface JobType {
  id: number;
  name: string;
  description: string | null;
}

interface Activity {
  id: number;
  name: string;
  description?: string;
  jobTypeId?: number;
  jobTypesIds?: string; // Campi per i tipi di lavoro aggiuntivi (formato CSV o JSON array)
  jobTypeIds?: string; // Campi alternativi per i tipi di lavoro (usato in alcune parti del codice)
  hourlyRate?: number;
  materialsCost?: number;
  materialsDescription?: string;
  // Campi per la pianificazione delle attività
  date?: string;
  startTime?: string;
  duration?: number;
  photos?: string[];
}

interface ActivityWithEditing extends Activity {
  isEditing?: boolean;
  notes?: string;
  attachedFiles?: string[];
  jobTypes?: string[]; // Array di tipi di lavoro aggiuntivi
  collaborators?: number[]; // ID dei collaboratori assegnati a questa attività
}

interface Collaborator {
  id: number;
  name: string;
  role?: string;
  roleId?: number;
  email?: string;
  phone?: string;
}

const getJobSchema = (t: any) => z.object({
  title: z.string().min(1, t('mobile.jobs.modal.newJob.form.titleRequired')),
  clientId: z.number().min(1, t('mobile.jobs.modal.newJob.form.clientRequired')),
  type: z.string().min(1, t('mobile.jobs.modal.newJob.form.typeRequired')),
  location: z.string().optional(),
  date: z.string().min(1, t('mobile.jobs.modal.newJob.form.startDateRequired')),
  startTime: z.string().min(1, t('mobile.jobs.modal.newJob.form.startTimeRequired')),
  duration: z.number().min(0.5, t('mobile.jobs.modal.newJob.form.durationMin')),
  hourlyRate: z.number().min(0, t('mobile.jobs.modal.newJob.form.hourlyRateMin')),
  materialsCost: z.number().min(0, t('mobile.jobs.modal.newJob.form.materialsCostMin')),
  materialsDescription: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  endDate: z.string().optional(),
});

// const activitySchema = z.object({ // Unused schema
//   name: z.string().min(1, "Nome attività è richiesto"),
//   jobTypeId: z.number().optional(),
//   jobTypes: z.array(z.string()).optional(),
//   description: z.string().optional(),
//   hourlyRate: z.number().min(0, "Tariffa non può essere negativa").optional(),
//   materialsCost: z.number().min(0, "Costo non può essere negativo").optional(),
//   materialsDescription: z.string().optional(),
//   duration: z.number().min(0.5, "Durata minima è 0.5 ore").optional(),
//   date: z.string().optional(),
//   startTime: z.string().optional(),
//   collaborators: z.array(z.number()).optional(),
// });

const getClientSchema = (t: any) => z.object({
  name: z.string().min(1, t('mobile.jobs.modal.newJob.form.nameLabel')),
  address: z.string().optional(),
  email: z.string().email(t('mobile.jobs.modal.newJob.form.emailLabel')).optional(),
  phone: z.string().optional(),
  type: z.string().optional(),
});

const getJobTypeSchema = (t: any) => z.object({
  name: z.string().min(1, t('mobile.jobs.modal.newJob.form.jobTypeNameLabel')),
  description: z.string().optional(),
});

type JobFormData = z.infer<ReturnType<typeof getJobSchema>>;
// type ActivityFormData = z.infer<typeof activitySchema>; // Unused
type ClientFormData = z.infer<ReturnType<typeof getClientSchema>>;
type JobTypeFormData = z.infer<ReturnType<typeof getJobTypeSchema>>;

export function NewJobModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Get permissions for permission-based UI rendering
  const { 
    hasPermission, 
    isLoading: permissionsLoading 
  } = usePermissions();
  
  // Permission checks
  const canCreateJobs = hasPermission('canCreateJobs');
  const canEditJobs = hasPermission('canEditJobs');
  const canViewJobFinancials = hasPermission('canViewJobFinancials');
  const canCreateClients = hasPermission('canCreateClients');
  const canUploadJobPhotos = hasPermission('canUploadJobPhotos');
  const canAddJobNotes = hasPermission('canAddJobNotes');
  const canViewClientSensitiveData = hasPermission('canViewClientSensitiveData');
  
  // Job field visibility permissions
  const canViewJobTitle = hasPermission('canViewJobTitle');
  const canViewJobDescription = hasPermission('canViewJobDescription');
  const canViewJobStartDate = hasPermission('canViewJobStartDate');
  const canViewJobEndDate = hasPermission('canViewJobEndDate');
  const canViewJobStatus = hasPermission('canViewJobStatus');
  const canViewJobRate = hasPermission('canViewJobRate');
  const canViewJobClient = hasPermission('canViewJobClient');
  const canViewJobLocation = hasPermission('canViewJobLocation');
  const canViewJobDuration = hasPermission('canViewJobDuration');
  const canViewJobPriority = hasPermission('canViewJobPriority');
  const canViewJobMaterials = hasPermission('canViewJobMaterials');
  const canViewJobMaterialsCost = hasPermission('canViewJobMaterialsCost');
  const canViewJobCost = hasPermission('canViewJobCost');
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/mobile/all-clients'],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/all-clients');
      if (!response.ok) throw new Error('Errore nel recuperare i clienti');
      return response.json();
    },
    enabled: isOpen
  });
  
  const { data: jobTypes = [] } = useQuery<JobType[]>({
    queryKey: ['/api/jobtypes'],
    enabled: isOpen
  });

  // Get schema with translations
  const jobSchema = getJobSchema(t);
  
  // Inizializziamo il form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      clientId: 0,
      type: '', // Inizialmente vuoto per costringere la selezione dal dropdown
      location: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      duration: 1,
      hourlyRate: 40,
      materialsCost: 0,
      materialsDescription: '',
      notes: '',
      description: '',
      status: 'scheduled',
      priority: 'medium',
      endDate: '',
    }
  });
  
  // Note: selectedJobType is used in filteredActivities logic below

  // Query per ottenere tutte le attività disponibili
  const { data: allActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/mobile/activities'],
    enabled: isOpen,
    staleTime: 0, // Disabilita la cache per ottenere sempre dati freschi
    refetchOnMount: true // Aggiorna sempre i dati quando il componente viene montato
  });
  
  // Note: availableActivities logic moved to filteredActivities below

  const { data: availableCollaborators = [] } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators'],
    enabled: isOpen
  });

  // Check activity management permissions
  const { data: activityPermissions } = useQuery({
    queryKey: ['/api/mobile/permissions/activity-management'],
    queryFn: async () => {
      const response = await fetch('/api/mobile/permissions/activity-management', {
        headers: {
          'x-mobile-session-id': localStorage.getItem('mobileSessionId') || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
    enabled: isOpen
  });
  
  const [editMode, setEditMode] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isPriceTotal, setIsPriceTotal] = useState(false);
  const [isActivityLevel, setIsActivityLevel] = useState(false);
  const [manageByActivities, setManageByActivities] = useState(false);
  const [activityManagementEnabled, setActivityManagementEnabled] = useState(false);
  
  const [activities, setActivities] = useState<ActivityWithEditing[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);
  const [showActivityCollaboratorDropdown, setShowActivityCollaboratorDropdown] = useState<number | null>(null);
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [currentEditingActivity, setCurrentEditingActivity] = useState<number | null>(null);
  
  // Stati per il form di aggiunta attività
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityJobTypeId, setActivityJobTypeId] = useState<number | undefined>(undefined);
  const [activityDuration, setActivityDuration] = useState(1);
  const [activityHourlyRate, setActivityHourlyRate] = useState(40);
  const [activitySelectedJobTypes, setActivitySelectedJobTypes] = useState<string[]>([]);
  
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddJobTypeModal, setShowAddJobTypeModal] = useState(false);
  
  const watchedType = watch('type');
  const watchedClientId = watch('clientId');
  
  // Ottieni informazioni del cliente selezionato
  const selectedClient = clients.find(client => client.id === watchedClientId);
  
  // Imposta automaticamente l'indirizzo del cliente quando viene selezionato
  useEffect(() => {
    if (selectedClient?.address && !editMode) {
      setValue('location', selectedClient.address);
    }
  }, [selectedClient, setValue, editMode]);
  
  // Versione semplificata del filtro attività
  const filteredActivities = useMemo(() => {
    // Se non c'è un tipo selezionato, restituisci tutte le attività
    if (!watchedType) {
      return allActivities;
    }

    // Converti watchedType in numero se possibile
    const jobTypeId = parseInt(watchedType);
    
    return allActivities.filter(activity => {
      // Caso 1: L'attività non ha un tipo specifico (è generica)
      if (!activity.jobTypeId) {
        return true;
      }
      
      // Caso 2: Verifica la corrispondenza diretta con jobTypeId
      if (activity.jobTypeId === jobTypeId || activity.jobTypeId.toString() === watchedType) {
        return true;
      }
      
      // Prova a cercare nei tipi secondari se presenti
      if (activity.jobTypesIds) {
        return true; // Semplifichiamo per ora includendo tutte le attività con tipi secondari
      }
      
      return false;
    });
  }, [watchedType, allActivities]);
  
  const { data: selectedJob } = useQuery({
    queryKey: ['/api/jobs', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const response = await fetch(`/api/jobs/${selectedJobId}`);
      if (!response.ok) throw new Error('Errore nel recuperare il lavoro');
      return response.json();
    },
    enabled: !!selectedJobId && isOpen
  });
  
  useEffect(() => {
    if (selectedJob) {
      const jobStartDate = new Date(selectedJob.startDate);
      
      setValue('title', selectedJob.title);
      setValue('clientId', selectedJob.clientId);
      setValue('type', selectedJob.type);
      setValue('location', selectedJob.location || '');
      setValue('date', jobStartDate.toISOString().split('T')[0]);
      setValue('startTime', jobStartDate.toTimeString().slice(0, 5));
      setValue('duration', selectedJob.duration || 1);
      setValue('hourlyRate', selectedJob.hourlyRate || 40);
      setValue('materialsCost', selectedJob.materialsCost || 0);
      setValue('materialsDescription', selectedJob.materialsDescription || '');
      setValue('notes', selectedJob.notes || '');
      
      if (selectedJob.photos && selectedJob.photos.length > 0) {
        setPhotos(selectedJob.photos);
      }
      
      if (selectedJob.activities && selectedJob.activities.length > 0) {
        setActivities(selectedJob.activities);
        setManageByActivities(true);
      }
      
      if (selectedJob.collaborators && selectedJob.collaborators.length > 0) {
        setCollaborators(selectedJob.collaborators);
      }
      
      if (selectedJob.isActivityLevel !== undefined) {
        setIsActivityLevel(selectedJob.isActivityLevel);
      }
      
      if (selectedJob.isPriceTotal !== undefined) {
        setIsPriceTotal(selectedJob.isPriceTotal);
      }

      if (selectedJob.manageByActivities !== undefined) {
        setManageByActivities(selectedJob.manageByActivities);
      }
    }
  }, [selectedJob, setValue]);
  
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === 'string' && customEvent.detail === 'new-job-modal') {
        setIsOpen(true);
        setEditMode(false);
        setSelectedJobId(null);
        reset();
      } else if (typeof customEvent.detail === 'object' && customEvent.detail.modalId === 'new-job-modal') {
        setIsOpen(true);
        if (customEvent.detail.jobId) {
          setEditMode(true);
          setSelectedJobId(customEvent.detail.jobId);
        } else {
          setEditMode(false);
          setSelectedJobId(null);
          reset();
        }
      }
    };
    
    document.addEventListener('openModal', handleOpenModal);
    return () => document.removeEventListener('openModal', handleOpenModal);
  }, [reset]);
  
  const closeModal = () => {
    setIsOpen(false);
    reset();
    setPhotos([]);
    setMediaFiles([]);
    setActivities([]);
    setCollaborators([]);
    setIsActivityLevel(false);
    setIsPriceTotal(false);
    setManageByActivities(false);
    setCurrentEditingActivity(null);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newMediaFiles = Array.from(files);
    const validFiles = newMediaFiles.filter(file => {
      return (
        file.type.startsWith('image/') || 
        file.type.startsWith('video/') ||
        file.type === 'application/pdf' ||
        file.name.endsWith('.doc') ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.dwg') ||
        file.name.endsWith('.coc')
      );
    });
    
    if (validFiles.length !== newMediaFiles.length) {
      toast({
        title: t('mobile.jobs.modal.newJob.form.attention'),
        description: t('mobile.jobs.modal.newJob.form.someFilesNotAdded'),
        variant: "destructive"
      });
    }
    
    setMediaFiles(prev => [...prev, ...validFiles]);
    
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
  
  const onSubmit = async (data: JobFormData) => {
    console.log('🚀 FORM SUBMISSION STARTED', {
      canCreateJobs,
      editMode,
      data: Object.keys(data),
      formData: data
    });
    
    // Check permissions before allowing submission
    if (!canCreateJobs && !editMode) {
      toast({
        title: t('mobile.jobs.modal.newJob.form.accessDenied'),
        description: t('mobile.jobs.modal.newJob.form.noPermissionCreateJobs'),
        variant: "destructive"
      });
      return;
    }
    
    if (editMode && !canEditJobs) {
      toast({
        title: t('mobile.jobs.modal.newJob.form.accessDenied'), 
        description: t('mobile.jobs.modal.newJob.form.noPermissionEditJobs'),
        variant: "destructive"
      });
      return;
    }

    try {
      const startDate = new Date(`${data.date}T${data.startTime}`);
      
      // Calcola la data di fine in base alla durata specificata
      const durationInHours = data.duration;
      const endDate = new Date(startDate.getTime());
      endDate.setHours(endDate.getHours() + Math.floor(durationInHours));
      endDate.setMinutes(endDate.getMinutes() + (durationInHours % 1) * 60);
      
      // Aggiorna il calcolo della tariffa in base ai collaboratori
      let hourlyRate = data.hourlyRate;
      if (collaborators.length > 1 && !isPriceTotal && !manageByActivities) {
        hourlyRate = hourlyRate * collaborators.length;
      }
      
      const jobData = {
        title: data.title,
        clientId: data.clientId,
        jobTypeId: parseInt(data.type),
        startDate: startDate.toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : endDate.toISOString(),
        status: data.status || 'scheduled',
        priority: data.priority || 'medium',
        cost: hourlyRate * durationInHours,
        description: data.description || '',
        notes: data.notes || '',
        hourlyRate: hourlyRate,
        materialsCost: data.materialsCost || 0,
        materialsDescription: data.materialsDescription || '',
        location: data.location || '',
        photos: photos,
        isPriceTotal: isPriceTotal,
        activities: activities,
        collaborators: collaborators,
        isActivityLevel: isActivityLevel,
        manageByActivities: manageByActivities,
        collaboratorCount: collaborators.length
      };
      
      if (editMode && selectedJobId) {
        await apiRequest('PATCH', `/api/mobile/jobs/${selectedJobId}`, jobData);
        
        // Invalidate all job queries, including job range queries for calendar
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJobId] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs/range'] });
        
        toast({
          title: t('mobile.jobs.modal.newJob.form.jobUpdated'),
          description: t('mobile.jobs.modal.newJob.form.jobUpdatedDescription'),
        });
      } else {
        const response = await mobileApiCall('POST', '/api/mobile/jobs', jobData);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create job');
        }
        
        // Invalidate all job queries, including mobile job queries
        queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs/range'] });
        
        toast({
          title: t('mobile.jobs.modal.newJob.form.jobCreated'),
          description: t('mobile.jobs.modal.newJob.form.jobCreatedDescription'),
        });
        
        // Close modal immediately after success
        closeModal();
        setIsOpen(false);
      }
      
    } catch (error) {
      console.error('Error with job:', error);
      toast({
        title: t('mobile.jobs.modal.newJob.form.error'),
        description: editMode 
          ? t('mobile.jobs.modal.newJob.form.errorUpdatingJob') 
          : t('mobile.jobs.modal.newJob.form.errorCreatingJob'),
        variant: "destructive"
      });
    }
  };

  const handleAddNewClientClick = () => {
    setShowAddClientModal(true);
  };

  const handleAddCustomJobTypeClick = () => {
    setShowAddJobTypeModal(true);
  };
  
  const handleActivityDropdownToggle = () => {
    setShowActivityDropdown(!showActivityDropdown);
    setShowCollaboratorDropdown(false);
    setShowActivityCollaboratorDropdown(null);
  };
  
  const handleCollaboratorDropdownToggle = () => {
    setShowCollaboratorDropdown(!showCollaboratorDropdown);
    setShowActivityDropdown(false);
    setShowActivityCollaboratorDropdown(null);
  };
  
  const handleActivityCollaboratorDropdownToggle = (activityId: number) => {
    if (showActivityCollaboratorDropdown === activityId) {
      setShowActivityCollaboratorDropdown(null);
    } else {
      setShowActivityCollaboratorDropdown(activityId);
      setShowActivityDropdown(false);
      setShowCollaboratorDropdown(false);
    }
  };
  
  const handleAddNewActivityClick = () => {
    setActivityName('');
    setActivityDescription('');
    setActivityJobTypeId(parseInt(watchedType) || undefined);
    setActivityDuration(1);
    setActivityHourlyRate(40);
    setActivitySelectedJobTypes([]);
    setShowAddActivityForm(true);
    setShowActivityDropdown(false);
  };
  
  const handleActivitySelect = (activity: Activity) => {
    if (activities.some(a => a.id === activity.id && a.name === activity.name)) {
      toast({
        title: "Attività già presente",
        description: "Questa attività è già stata aggiunta al lavoro",
        variant: "destructive"
      });
      return;
    }
    
    // Aggiungi l'attività con un campo isEditing impostato a true
    const newActivity: ActivityWithEditing = {
      ...activity,
      id: activity.id || Date.now(),
      date: watch('date'),
      startTime: watch('startTime'),
      duration: activity.duration || 1,
      isEditing: true,
      collaborators: [] // Array vuoto di collaboratori
    };
    
    setActivities([...activities, newActivity]);
    setShowActivityDropdown(false);
    setCurrentEditingActivity(newActivity.id);
    
    // Attiva la gestione per attività se è la prima attività aggiunta
    if (activities.length === 0) {
      setManageByActivities(true);
    }
  };
  
  const handleClientAdd = async (client: ClientFormData) => {
    try {
      const response = await mobileApiCall('POST', '/clients', client);
      const newClient = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-clients'] });
      
      setValue('clientId', newClient.id);
      setValue('location', newClient.address || '');
      
      toast({
        title: "Cliente aggiunto",
        description: `Il cliente ${newClient.name} è stato aggiunto con successo`,
      });
      
      setShowAddClientModal(false);
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'aggiunta del cliente",
        variant: "destructive"
      });
    }
  };
  
  const handleJobTypeAdd = async (jobType: JobTypeFormData) => {
    try {
      const response = await apiRequest('POST', '/api/jobtypes', jobType);
      const newJobType = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
      
      setValue('type', newJobType.id.toString());
      
      toast({
        title: "Tipo lavoro aggiunto",
        description: `Il tipo di lavoro ${newJobType.name} è stato aggiunto con successo`,
      });
      
      setShowAddJobTypeModal(false);
    } catch (error) {
      console.error('Error adding job type:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'aggiunta del tipo di lavoro",
        variant: "destructive"
      });
    }
  };
  
  const handleNewActivityAdd = () => {
    if (!activityName) {
      toast({
        title: "Errore",
        description: "Il nome dell'attività è obbligatorio",
        variant: "destructive"
      });
      return;
    }
    
    if (!activityJobTypeId) {
      toast({
        title: "Errore",
        description: "Il tipo di lavoro principale è obbligatorio",
        variant: "destructive"
      });
      return;
    }
    
    // Converti l'array di stringhe in stringa formato CSV per compatibilità con il back-end
    const jobTypesIds = activitySelectedJobTypes.length > 0 ? activitySelectedJobTypes.join(',') : '';
    
    // Crea una nuova attività
    const activity: ActivityWithEditing = {
      id: Date.now(),
      name: activityName,
      description: activityDescription,
      jobTypeId: activityJobTypeId,
      jobTypes: activitySelectedJobTypes,
      jobTypesIds: jobTypesIds, // Aggiunto campo per compatibilità
      hourlyRate: activityHourlyRate,
      materialsCost: 0,
      materialsDescription: '',
      duration: activityDuration,
      date: watch('date'),
      startTime: watch('startTime'),
      collaborators: [],
      isEditing: true
    };
    
    setActivities([...activities, activity]);
    setShowAddActivityForm(false);
    setCurrentEditingActivity(activity.id);
    
    // Attiva la gestione per attività se è la prima attività aggiunta
    if (activities.length === 0) {
      setManageByActivities(true);
    }
  };
  
  const handleCollaboratorSelect = (collaborator: Collaborator) => {
    // Verifica se il collaboratore è già stato selezionato
    if (collaborators.some(c => c.id === collaborator.id)) {
      toast({
        title: "Collaboratore già aggiunto",
        description: "Questo collaboratore è già stato aggiunto al lavoro",
        variant: "destructive"
      });
      return;
    }
    
    setCollaborators([...collaborators, collaborator]);
  };
  
  const handleActivityCollaboratorSelect = (activityId: number, collaboratorId: number) => {
    // Aggiunge il collaboratore a questa specifica attività
    setActivities(activities.map(activity => {
      if (activity.id === activityId) {
        const activityCollaborators = activity.collaborators || [];
        
        // Se il collaboratore è già presente, non fare nulla
        if (activityCollaborators.includes(collaboratorId)) {
          return activity;
        }
        
        // Altrimenti aggiungi il collaboratore all'attività
        return {
          ...activity,
          collaborators: [...activityCollaborators, collaboratorId]
        };
      }
      return activity;
    }));
  };
  
  const handleActivityCollaboratorRemove = (activityId: number, collaboratorId: number) => {
    // Rimuove il collaboratore da questa specifica attività
    setActivities(activities.map(activity => {
      if (activity.id === activityId && activity.collaborators) {
        return {
          ...activity,
          collaborators: activity.collaborators.filter(id => id !== collaboratorId)
        };
      }
      return activity;
    }));
  };
  
  const handleActivityRemove = (id: number) => {
    setActivities(activities.filter(a => a.id !== id));
    
    // Se rimuoviamo tutte le attività, disattiviamo la gestione per attività
    if (activities.length <= 1) {
      setManageByActivities(false);
    }
    
    if (currentEditingActivity === id) {
      setCurrentEditingActivity(null);
    }
  };
  
  const handleCollaboratorRemove = (id: number) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
  };
  
  // Note: handleJobTypeSelectToggle function removed as it's handled inline

  // Calcola il totale del lavoro in base alle attività o al prezzo totale
  const calculateTotals = () => {
    // Calcola totali per gestione per attività
    if (manageByActivities) {
      // Calcola la durata totale di tutte le attività
      const totalHours = activities.reduce((sum, act) => sum + (act.duration || 0), 0);
      
      if (isActivityLevel) {
        // A livello attività, calcola separatamente prezzo e materiali
        const totalPrice = activities.reduce((sum, act) => {
          // Calcola il prezzo per questa attività
          const activityPrice = isPriceTotal 
            ? (act.hourlyRate || 0)
            : (act.hourlyRate || 0) * (act.duration || 0) * ((act.collaborators?.length || 0) || 1);
          return sum + activityPrice;
        }, 0);
        
        const totalMaterialsCost = activities.reduce((sum, act) => sum + (act.materialsCost || 0), 0);
        
        return {
          hours: totalHours,
          price: totalPrice,
          materials: totalMaterialsCost,
          total: totalPrice + totalMaterialsCost
        };
      } else {
        // A livello lavoro, usa i campi del form
        const hourlyRate = watch('hourlyRate') || 0;
        const materialsCost = watch('materialsCost') || 0;
        
        const totalPrice = isPriceTotal 
          ? hourlyRate
          : hourlyRate * totalHours * (collaborators.length || 1);
          
        return {
          hours: totalHours,
          price: totalPrice,
          materials: materialsCost,
          total: totalPrice + materialsCost
        };
      }
    } else {
      // Calcolo standard a livello lavoro
      const hourlyRate = watch('hourlyRate') || 0;
      const materialsCost = watch('materialsCost') || 0;
      const duration = watch('duration') || 0;
      
      if (isPriceTotal) {
        return {
          hours: duration,
          price: hourlyRate,
          materials: materialsCost,
          total: hourlyRate + materialsCost
        };
      } else {
        // Se ci sono più collaboratori, moltiplica la tariffa oraria
        const rateWithCollaborators = collaborators.length > 1 ? hourlyRate * collaborators.length : hourlyRate;
        const totalPrice = rateWithCollaborators * duration;
        
        return {
          hours: duration,
          price: totalPrice,
          materials: materialsCost,
          total: totalPrice + materialsCost
        };
      }
    }
  };

  useEffect(() => {
    const openModalOnNavigation = () => {
      const path = window.location.pathname;
      if (path === '/mobile/new-job') {
        setIsOpen(true);
      }
    };

    openModalOnNavigation();
    window.addEventListener('popstate', openModalOnNavigation);
    
    return () => {
      window.removeEventListener('popstate', openModalOnNavigation);
    };
  }, []);

  useEffect(() => {
    // Se selezioniamo "Gestisci per attività", abilita anche "Gestisci costi a livello attività"
    if (manageByActivities) {
      setIsActivityLevel(true);
    }
  }, [manageByActivities]);

  // Update activity management enabled state when permissions are loaded
  useEffect(() => {
    if (activityPermissions) {
      setActivityManagementEnabled(activityPermissions.activityManagementEnabled);
    }
  }, [activityPermissions]);

  // Fetch plan configuration to gate collaborator feature as well
  const { data: planConfig } = useQuery({
    queryKey: ['/api/mobile/plan-configuration'],
    queryFn: async () => {
      const res = await fetch('/api/mobile/plan-configuration');
      if (!res.ok) return null;
      return res.json();
    }
  });
  const collaboratorFeatureEnabled = planConfig?.features?.collaborator_management === true;

  if (!isOpen) return null;
  
  // Show loading state while permissions are being loaded
  if (permissionsLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>{t('mobile.jobs.modal.newJob.form.loadingPermissions')}</span>
          </div>
        </div>
      </div>
    );
  }
  
  const totals = calculateTotals();
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto pt-4 pb-20">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold">{editMode ? t('mobile.jobs.editJob') : t('mobile.jobs.newJob')}</h2>
            <button 
              className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100" 
              onClick={closeModal} 
              aria-label={t('mobile.jobs.modal.newJob.form.close')}
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit, (errors) => {
              console.log('❌ FORM VALIDATION ERRORS:', errors);
              console.log('❌ Form errors details:', Object.keys(errors).map(key => ({ field: key, error: errors[key] })));
            })}>
              <div className="space-y-4">
                {canViewJobTitle && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.title')}</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={t('mobile.jobs.modal.newJob.form.titlePlaceholder')}
                      {...register('title')}
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
                  </div>
                )}
                
                {(canViewJobClient || true) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.client')}</label>
                    <div className="flex items-center space-x-2">
                      <select 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        {...register('clientId', { valueAsNumber: true })}
                      >
                        <option value={0}>{t('mobile.jobs.modal.newJob.form.clientPlaceholder')}</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                      {canCreateClients && (
                        <button 
                          type="button"
                          onClick={handleAddNewClientClick}
                          className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-primary border border-gray-300 rounded-lg hover:bg-gray-100"
                          title={t('mobile.jobs.modal.newJob.form.addNewClient')}
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                    {errors.clientId && <p className="mt-1 text-sm text-red-500">{errors.clientId.message}</p>}
                  </div>
                )}
                
                {/* Job Location - Permission controlled */}
                {canViewJobLocation && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.location')}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={t('mobile.jobs.modal.newJob.form.locationPlaceholder')}
                        {...register('location')}
                      />
                      <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-600 z-10" />
                    </div>
                    {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.type')}</label>
                  <div className="flex items-center space-x-2">
                    <select 
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      {...register('type')}
                    >
                      <option value="">{t('mobile.jobs.modal.newJob.form.typePlaceholder')}</option>
                      {jobTypes && jobTypes.map(jobType => (
                        <option key={jobType.id} value={jobType.id.toString()}>{jobType.name}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={handleAddCustomJobTypeClick}
                      className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-primary border border-gray-300 rounded-lg hover:bg-gray-100"
                      title={t('mobile.jobs.modal.newJob.form.addCustomType')}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>}
                </div>
                
                {/* Switch per gestione per attività - visibile solo se abilitato dal piano */}
                {activityManagementEnabled && (
                  <div className="flex items-center justify-between py-2 px-1 border-t border-b border-gray-200">
                    <span className="text-sm font-medium">{t('mobile.jobs.modal.newJob.form.activityManagement')}</span>
                    <button
                      type="button"
                      onClick={() => setManageByActivities(!manageByActivities)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${manageByActivities ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${manageByActivities ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                )}
                
                {manageByActivities && (
                  <div className="flex items-center justify-between py-2 px-1 border-t border-b border-gray-200">
                    <span className="text-sm font-medium">{t('mobile.jobs.modal.newJob.form.manageCostsAt')}</span>
                    <div className="bg-gray-200 p-0.5 rounded-lg flex text-xs">
                      <button
                        type="button"
                        onClick={() => setIsActivityLevel(false)}
                        className={`px-3 py-1.5 rounded ${!isActivityLevel ? 'bg-blue-600 text-white' : ''}`}
                      >
{t('mobile.jobs.modal.newJob.form.job')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsActivityLevel(true)}
                        className={`px-3 py-1.5 rounded ${isActivityLevel ? 'bg-blue-600 text-white' : ''}`}
                      >
{t('mobile.jobs.modal.newJob.form.activity')}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Sezione Attività con dropdown style come da immagine - visibile solo con gestione attività */}
                {activityManagementEnabled && manageByActivities && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.activities')}</label>
                    <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={handleActivityDropdownToggle}
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <span className={activities.length === 0 ? "text-gray-500" : ""}>
                          {activities.length === 0 ? t('mobile.jobs.modal.newJob.form.selectActivities') : t('mobile.jobs.modal.newJob.form.activitiesSelected', { count: activities.length })}
                        </span>
                        <ChevronDown size={16} className={`transition transform ${showActivityDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showActivityDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-20 max-h-60 overflow-y-auto">
                          {filteredActivities.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                              {filteredActivities.map(activity => (
                                <div 
                                  key={activity.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                  onClick={() => handleActivitySelect(activity)}
                                >
                                  <div>
                                    <h4 className="font-medium">{activity.name}</h4>
                                    {activity.description && (
                                      <p className="text-sm text-gray-500">{activity.description}</p>
                                    )}
                                  </div>
                                  {activities.some(a => a.id === activity.id) && (
                                    <Check size={16} className="text-primary" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 text-center text-gray-500">
{t('mobile.jobs.modal.newJob.form.noActivitiesAvailable')}
                            </div>
                          )}
                          <div 
                            className="p-3 border-t border-gray-200 bg-gray-50 text-primary hover:bg-gray-100 cursor-pointer flex items-center justify-center"
                            onClick={handleAddNewActivityClick}
                          >
                            <Plus size={16} className="mr-2" />
                            <span>{t('mobile.jobs.modal.newJob.form.addNewActivity')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddNewActivityClick}
                      className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-primary border border-gray-300 rounded-lg hover:bg-gray-100"
                      title={t('mobile.jobs.modal.newJob.form.addNewActivity')}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {/* Area di modifica attività */}
                  {activities.length > 0 && (
                    <div className="mt-3 space-y-4">
                      {activities.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="border rounded-lg bg-white overflow-hidden"
                        >
                          {/* Intestazione attività */}
                          <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
                            <div className="font-medium">{activity.name}</div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleActivityRemove(activity.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Form di modifica attività - sempre visibile */}
                          <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Data</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  defaultValue={activity.date || watch('date')}
                                  onChange={(e) => {
                                    const updatedActivity = { ...activity, date: e.target.value };
                                    setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Ora inizio</label>
                                <input
                                  type="time"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  defaultValue={activity.startTime || watch('startTime')}
                                  onChange={(e) => {
                                    const updatedActivity = { ...activity, startTime: e.target.value };
                                    setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Durata (ore)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                defaultValue={activity.duration || 1}
                                onChange={(e) => {
                                  const updatedActivity = { ...activity, duration: parseFloat(e.target.value) };
                                  setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                }}
                              />
                            </div>
                            
                            {/* Mostra i campi costo solo se gestisco a livello attività - Permission controlled */}
                            {isActivityLevel && canViewJobFinancials && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Tariffa oraria (€)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    defaultValue={activity.hourlyRate || 40}
                                    onChange={(e) => {
                                      const updatedActivity = { ...activity, hourlyRate: parseFloat(e.target.value) };
                                      setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-1">Costo materiali (€)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    defaultValue={activity.materialsCost || 0}
                                    onChange={(e) => {
                                      const updatedActivity = { ...activity, materialsCost: parseFloat(e.target.value) };
                                      setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            
                            {/* Collaboratori per questa specifica attività */}
                            {activityManagementEnabled && manageByActivities && (
                              <div>
                                <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.collaborators')}</label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleActivityCollaboratorDropdownToggle(activity.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg"
                                  >
                                    <span className="flex items-center">
                                      <Users size={16} className="mr-2 text-gray-500" />
                                      <span className={!activity.collaborators || activity.collaborators.length === 0 ? "text-gray-500" : ""}>
                                        {!activity.collaborators || activity.collaborators.length === 0 
                                          ? t('mobile.jobs.modal.newJob.form.selectCollaborators') 
                                          : t('mobile.jobs.modal.newJob.form.collaboratorsSelected', { count: activity.collaborators.length })}
                                      </span>
                                    </span>
                                    <ChevronDown size={16} className={`transition transform ${showActivityCollaboratorDropdown === activity.id ? 'rotate-180' : ''}`} />
                                  </button>
                                  
                                  {showActivityCollaboratorDropdown === activity.id && (
                                    <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-30 max-h-60 overflow-y-auto">
                                      {availableCollaborators.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                          {availableCollaborators.map(collaborator => (
                                            <div 
                                              key={collaborator.id}
                                              className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                              onClick={() => handleActivityCollaboratorSelect(activity.id, collaborator.id)}
                                            >
                                              <div>
                                                <h4 className="font-medium">{collaborator.name}</h4>
                                                {collaborator.role && (
                                                  <p className="text-sm text-gray-500">{collaborator.role}</p>
                                                )}
                                              </div>
                                              {activity.collaborators?.includes(collaborator.id) && (
                                                <Check size={16} className="text-primary" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="p-3 text-center text-gray-500">
                                          {t('mobile.jobs.modal.newJob.form.noCollaboratorsAvailable')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {activity.collaborators && activity.collaborators.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {activity.collaborators.map(collaboratorId => {
                                      const collaborator = availableCollaborators.find(c => c.id === collaboratorId);
                                      if (!collaborator) return null;
                                      
                                      return (
                                        <div 
                                          key={collaboratorId} 
                                          className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-sm"
                                        >
                                          <span>{collaborator.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleActivityCollaboratorRemove(activity.id, collaboratorId)}
                                            className="text-gray-400 hover:text-red-500"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.materials')}</label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                                value={activity.materialsDescription || ''}
                                onChange={(e) => {
                                  const updatedActivity = { ...activity, materialsDescription: e.target.value };
                                  setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                }}
                                placeholder={t('mobile.jobs.modal.newJob.form.materialsPlaceholder')}
                              ></textarea>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.notes')}</label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                                value={activity.notes || ''}
                                onChange={(e) => {
                                  const updatedActivity = { ...activity, notes: e.target.value };
                                  setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                }}
                                placeholder={t('mobile.jobs.modal.newJob.form.notesPlaceholder')}
                              ></textarea>
                            </div>
                            
                            {canUploadJobPhotos && (
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  <div className="flex items-center">
                                    <FileText size={16} className="mr-2" />
                                    <span>{t('mobile.jobs.modal.newJob.form.attachedFiles')}</span>
                                  </div>
                                </label>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*, video/*, application/pdf, .doc, .docx, .xls, .xlsx, .dwg, .coc"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  onChange={(e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    
                                    // Versione semplificata dell'upload
                                    const files = Array.from(e.target.files);
                                    const fileNames = files.map(file => file.name);
                                    
                                    const updatedActivity = { 
                                      ...activity, 
                                      attachedFiles: activity.attachedFiles ? [...activity.attachedFiles, ...fileNames] : fileNames 
                                    };
                                    
                                    setActivities(activities.map(a => a.id === activity.id ? updatedActivity : a));
                                    
                                    // Resetta il campo input file
                                    e.target.value = '';
                                  }}
                                />
                              
                                {activity.attachedFiles && activity.attachedFiles.length > 0 && (
                                  <div className="mt-2 text-sm">
                                    <div className="font-medium text-gray-600">{t('mobile.jobs.modal.newJob.form.selectedFiles')}:</div>
                                    <ul className="list-disc pl-5">
                                      {activity.attachedFiles.map((file, idx) => (
                                        <li key={idx} className="text-xs">{file}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Pulsante per aggiungere un'altra attività */}
                      <div className="mt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={handleAddNewActivityClick}
                          className="flex items-center justify-center text-primary hover:bg-gray-100 px-4 py-2 rounded-lg border border-gray-300"
                        >
                          <Plus size={16} className="mr-2" />
                          <span>{t('mobile.jobs.modal.newJob.form.addAnotherActivity')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )}
                
                {/* Collaboratori DropDown Style - visibile solo se non gestiamo per attività */}
                {!manageByActivities && collaboratorFeatureEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.collaborators')}</label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={handleCollaboratorDropdownToggle}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <span className={collaborators.length === 0 ? "text-gray-500" : ""}>
                            {collaborators.length === 0 ? t('mobile.jobs.modal.newJob.form.selectCollaborators') : t('mobile.jobs.modal.newJob.form.collaboratorsSelected', { count: collaborators.length })}
                          </span>
                          <ChevronDown size={16} className={`transition transform ${showCollaboratorDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showCollaboratorDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg z-20 max-h-60 overflow-y-auto">
                            {availableCollaborators.length > 0 ? (
                              <div className="divide-y divide-gray-100">
                                {availableCollaborators.map(collaborator => (
                                  <div 
                                    key={collaborator.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                    onClick={() => handleCollaboratorSelect(collaborator)}
                                  >
                                    <div>
                                      <h4 className="font-medium">{collaborator.name}</h4>
                                      {collaborator.role && (
                                        <p className="text-sm text-gray-500">{collaborator.role}</p>
                                      )}
                                    </div>
                                    {collaborators.some(c => c.id === collaborator.id) && (
                                      <Check size={16} className="text-primary" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 text-center text-gray-500">
                                {t('mobile.jobs.modal.newJob.form.noCollaboratorsAvailable')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          // Apre solo il dropdown dei collaboratori
                          handleCollaboratorDropdownToggle();
                        }}
                        className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-primary border border-gray-300 rounded-lg hover:bg-gray-100"
                        title={t('mobile.jobs.modal.newJob.form.addNewCollaborator')}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    
                    {collaborators.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {collaborators.map(collaborator => (
                          <div 
                            key={collaborator.id} 
                            className="p-3 rounded-lg border border-gray-200 bg-white flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{collaborator.name}</div>
                              {collaborator.role && (
                                <div className="text-sm text-gray-500">{collaborator.role}</div>
                              )}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleCollaboratorRemove(collaborator.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {collaborators.length > 1 && !isPriceTotal && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Nota:</strong> Tariffa oraria moltiplicata per {collaborators.length} collaboratori nel calcolo del totale.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Campi data, ora, durata visibili solo se non si gestisce per attività */}
                {!manageByActivities && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {canViewJobStartDate && (
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.date')}</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              {...register('date')}
                            />
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                          {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
                        </div>
                      )}
                      
                      {canViewJobStartDate && (
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.startTime')}</label>
                          <div className="relative">
                            <input 
                              type="time" 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              {...register('startTime')}
                            />
                            <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                          {errors.startTime && <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>}
                        </div>
                      )}
                    </div>
                    
                    {canViewJobDuration && (
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.duration')}</label>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0.5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          {...register('duration', { valueAsNumber: true })}
                        />
                        {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration.message}</p>}
                      </div>
                    )}
                  </>
                )}
                
                {/* Campi di costo visibili solo se non si gestisce per attività o se isActivityLevel=false - Permission controlled */}
                {(!activityManagementEnabled || !manageByActivities || !isActivityLevel) && canViewJobFinancials && (
                  <div className="space-y-4">
                    {canViewJobRate && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium">
                            {isPriceTotal ? t('mobile.jobs.modal.newJob.form.totalPrice') : t('mobile.jobs.modal.newJob.form.hourlyRate')}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsPriceTotal(!isPriceTotal)}
                            className="flex items-center text-xs bg-blue-600/10 rounded px-2 py-1 text-primary"
                          >
                            <RefreshCw size={12} className="mr-1" />
                            <span>{isPriceTotal ? t('mobile.jobs.modal.newJob.form.hourlyRate') : t('mobile.jobs.modal.newJob.form.totalPrice')}</span>
                          </button>
                        </div>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          {...register('hourlyRate', { valueAsNumber: true })}
                          placeholder={isPriceTotal ? t('mobile.jobs.modal.newJob.form.totalPricePlaceholder') : t('mobile.jobs.modal.newJob.form.hourlyRatePlaceholder')}
                        />
                        {errors.hourlyRate && <p className="mt-1 text-sm text-red-500">{errors.hourlyRate.message}</p>}
                      </div>
                    )}
                    
                    {/* Nasconde i campi materiali se manageByActivities è true e isActivityLevel è false */}
                    {!(activityManagementEnabled && manageByActivities && !isActivityLevel) && canViewJobMaterials && (
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.materials')}</label>
                        <textarea 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                          rows={2}
                          placeholder={t('mobile.jobs.modal.newJob.form.materialsDescriptionPlaceholder')}
                          {...register('materialsDescription')}
                        ></textarea>
                        {errors.materialsDescription && (
                          <p className="mt-1 text-sm text-red-500">{errors.materialsDescription.message}</p>
                        )}
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.materialsCost')}</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            {...register('materialsCost', { valueAsNumber: true })}
                          />
                          {errors.materialsCost && <p className="mt-1 text-sm text-red-500">{errors.materialsCost.message}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* File allegati visibili solo se non si gestisce per attività - Permission controlled */}
                {(!activityManagementEnabled || !manageByActivities) && canUploadJobPhotos && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.attachedFiles')}</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*, video/*, application/pdf, .doc, .docx, .xls, .xlsx, .dwg, .coc" 
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Puoi caricare file immagine (.jpg, .png, .gif), video (.mp4, .mov), documenti (.pdf, .doc, .docx), 
                      fogli di calcolo (.xls, .xlsx), disegni tecnici (.dwg) e certificati (.coc)
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
                            ) : mediaFiles[index]?.type.startsWith('image/') ? (
                              <img 
                                src={photo} 
                                alt={`File ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-center text-xs p-1">
                                {mediaFiles[index]?.name || `File ${index + 1}`}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center leading-none text-xs"
                              aria-label={t('mobile.jobs.modal.newJob.form.removeFile')}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {canViewJobDescription && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.description')}</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                      rows={3}
                      placeholder={t('mobile.jobs.modal.newJob.form.descriptionPlaceholder')}
                      {...register('description')}
                    ></textarea>
                    {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
                  </div>
                )}

                {canViewJobStatus && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.status')}</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      {...register('status')}
                    >
                      <option value="scheduled">{t('mobile.jobs.modal.newJob.form.statusScheduled')}</option>
                      <option value="in_progress">{t('mobile.jobs.modal.newJob.form.statusInProgress')}</option>
                      <option value="completed">{t('mobile.jobs.modal.newJob.form.statusCompleted')}</option>
                      <option value="cancelled">{t('mobile.jobs.modal.newJob.form.statusCancelled')}</option>
                    </select>
                    {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>}
                  </div>
                )}

                {canViewJobPriority && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.priority')}</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      {...register('priority')}
                    >
                      <option value="low">{t('mobile.jobs.modal.newJob.form.priorityLow')}</option>
                      <option value="medium">{t('mobile.jobs.modal.newJob.form.priorityMedium')}</option>
                      <option value="high">{t('mobile.jobs.modal.newJob.form.priorityHigh')}</option>
                      <option value="urgent">{t('mobile.jobs.modal.newJob.form.priorityUrgent')}</option>
                    </select>
                    {errors.priority && <p className="mt-1 text-sm text-red-500">{errors.priority.message}</p>}
                  </div>
                )}

                {canViewJobEndDate && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.endDate')}</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        {...register('endDate')}
                      />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate.message}</p>}
                  </div>
                )}

                {canAddJobNotes && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.notes')}</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                      rows={3}
                      placeholder={t('mobile.jobs.modal.newJob.form.notesPlaceholder')}
                      {...register('notes')}
                    ></textarea>
                    {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
                  </div>
                )}
                
                {/* Tabella dei costi totali con tutti i dettagli richiesti - Permission controlled */}
                {canViewJobFinancials && (
                  <div className="py-2 px-4 bg-blue-600/5 rounded-lg border border-primary/20">
                    <div className="mb-2">
                      <span className="font-medium">{t('mobile.jobs.modal.newJob.form.costSummary')}:</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                          <tr>
                            <th className="px-2 py-1 text-left">{t('mobile.jobs.modal.newJob.form.detail')}</th>
                            <th className="px-2 py-1 text-right">{t('mobile.jobs.modal.newJob.form.value')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1">{t('mobile.jobs.modal.newJob.form.totalHours')}</td>
                            <td className="px-2 py-1 text-right">{totals.hours} {t('mobile.jobs.modal.newJob.form.hours')}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1">{t('mobile.jobs.modal.newJob.form.workPrice')}</td>
                            <td className="px-2 py-1 text-right">€{totals.price.toFixed(2)}</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="px-2 py-1">{t('mobile.jobs.modal.newJob.form.materialsCost')}</td>
                            <td className="px-2 py-1 text-right">€{totals.materials.toFixed(2)}</td>
                          </tr>
                          <tr className="font-bold">
                            <td className="px-2 py-1">{t('mobile.jobs.modal.newJob.form.totalPriceEstimated')}</td>
                            <td className="px-2 py-1 text-right">€{totals.total.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  
                    <p className="text-xs text-gray-500 mt-1">
                      {activityManagementEnabled && manageByActivities
                        ? isActivityLevel 
                          ? t('mobile.jobs.modal.newJob.form.calculatedFromActivities')
                          : t('mobile.jobs.modal.newJob.form.calculatedFromHourlyRate')
                        : isPriceTotal 
                          ? t('mobile.jobs.modal.newJob.form.calculatedFromTotalPrice')
                          : collaborators.length > 1
                            ? t('mobile.jobs.modal.newJob.form.calculatedFromCollaborators', { count: collaborators.length })
                            : t('mobile.jobs.modal.newJob.form.calculatedFromStandard')
                      }
                    </p>
                  </div>
                )}
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || permissionsLoading || (!canCreateJobs && !editMode) || (editMode && !canEditJobs)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-600/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                    onClick={() => {
                      console.log('🔘 CREATE BUTTON CLICKED', {
                        isSubmitting,
                        permissionsLoading,
                        canCreateJobs,
                        editMode,
                        canEditJobs,
                        disabled: isSubmitting || permissionsLoading || (!canCreateJobs && !editMode) || (editMode && !canEditJobs)
                      });
                      console.log('📝 CURRENT FORM VALUES:', watch());
                    }}
                  >
                    {isSubmitting 
                      ? (editMode ? t('mobile.jobs.modal.newJob.form.updating') : t('mobile.jobs.modal.newJob.form.creating')) 
                      : (editMode ? t('mobile.jobs.modal.newJob.form.update') : t('mobile.jobs.modal.newJob.form.create'))
                    }
                  </button>
                  
                  {/* Permission warning message */}
                  {!permissionsLoading && (
                    <>
                      {!canCreateJobs && !editMode && (
                        <p className="mt-2 text-sm text-red-500 text-center">
                          {t('mobile.jobs.modal.newJob.form.warningNoPermissionCreate')}
                        </p>
                      )}
                      {editMode && !canEditJobs && (
                        <p className="mt-2 text-sm text-red-500 text-center">
                          {t('mobile.jobs.modal.newJob.form.warningNoPermissionEdit')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Form per aggiungere una nuova attività */}
      {showAddActivityForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('mobile.jobs.modal.newJob.form.newActivity')}</h3>
              <button 
                className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100" 
                onClick={() => setShowAddActivityForm(false)}
                aria-label={t('mobile.jobs.modal.newJob.form.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                handleNewActivityAdd(); 
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.activityNameLabel')}</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={t('mobile.jobs.modal.newJob.form.activityName')}
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.jobTypesLabel')}</label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg">
                      {jobTypes.map((jobType) => (
                        <label key={jobType.id} className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary" 
                            checked={activitySelectedJobTypes.includes(jobType.id.toString())}
                            onChange={(e) => {
                              let updatedJobTypes = [...activitySelectedJobTypes];
                              if (e.target.checked) {
                                if (!updatedJobTypes.includes(jobType.id.toString())) {
                                  updatedJobTypes.push(jobType.id.toString());
                                }
                              } else {
                                updatedJobTypes = updatedJobTypes.filter(id => id !== jobType.id.toString());
                              }
                              setActivitySelectedJobTypes(updatedJobTypes);
                              
                              // Se c'è almeno un tipo di lavoro selezionato, impostiamo il primo come principale
                              if (updatedJobTypes.length > 0) {
                                setActivityJobTypeId(parseInt(updatedJobTypes[0]));
                              } else {
                                setActivityJobTypeId(undefined);
                              }
                            }}
                          />
                          <span>{jobType.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('mobile.jobs.modal.newJob.form.selectJobTypes')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.descriptionLabel')}</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                      rows={3}
                      placeholder={t('mobile.jobs.modal.newJob.form.activityDescription')}
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                    ></textarea>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.durationLabel')}</label>
                      <input 
                        type="number" 
                        step="0.5"
                        min="0.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={activityDuration}
                        onChange={(e) => setActivityDuration(parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.rateLabel')}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={activityHourlyRate}
                        onChange={(e) => setActivityHourlyRate(parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('mobile.jobs.modal.newJob.form.rateDescription')}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-600/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {t('mobile.jobs.modal.newJob.form.addActivity')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal per aggiungere un nuovo cliente */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('mobile.jobs.modal.newJob.form.addClient')}</h3>
              <button 
                className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100" 
                onClick={() => setShowAddClientModal(false)}
                aria-label={t('mobile.jobs.modal.newJob.form.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formEl = e.target as HTMLFormElement;
                const nameInput = formEl.elements.namedItem('clientName') as HTMLInputElement;
                const addressInput = formEl.elements.namedItem('clientAddress') as HTMLInputElement;
                const emailInput = formEl.elements.namedItem('clientEmail') as HTMLInputElement;
                const phoneInput = formEl.elements.namedItem('clientPhone') as HTMLInputElement;
                const typeInput = formEl.elements.namedItem('clientType') as HTMLSelectElement;
                
                const clientData: ClientFormData = {
                  name: nameInput.value,
                  address: addressInput.value,
                  email: emailInput.value,
                  phone: phoneInput.value,
                  type: typeInput.value
                };
                
                handleClientAdd(clientData);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.nameLabel')}</label>
                    <input 
                      type="text" 
                      name="clientName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Es. Mario Rossi o Azienda ABC"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.typeLabel')}</label>
                    <select 
                      name="clientType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="residential">{t('mobile.jobs.modal.newJob.form.residential')}</option>
                      <option value="business">{t('mobile.jobs.modal.newJob.form.business')}</option>
                      <option value="condominium">{t('mobile.jobs.modal.newJob.form.condominium')}</option>
                      <option value="government">{t('mobile.jobs.modal.newJob.form.government')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.addressLabel')}</label>
                    <input 
                      type="text" 
                      name="clientAddress"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Es. Via Roma 123, Milano"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.emailLabel')}</label>
                    <input 
                      type="email" 
                      name="clientEmail"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Es. mario.rossi@esempio.it"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.phoneLabel')}</label>
                    <input 
                      type="tel" 
                      name="clientPhone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Es. 345 123 4567"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-600/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {t('mobile.jobs.modal.newJob.form.add')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal per aggiungere un nuovo tipo di lavoro */}
      {showAddJobTypeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('mobile.jobs.modal.newJob.form.addJobType')}</h3>
              <button 
                className="rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100" 
                onClick={() => setShowAddJobTypeModal(false)}
                aria-label={t('mobile.jobs.modal.newJob.form.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formEl = e.target as HTMLFormElement;
                const nameInput = formEl.elements.namedItem('jobTypeName') as HTMLInputElement;
                const descriptionInput = formEl.elements.namedItem('jobTypeDescription') as HTMLTextAreaElement;
                
                const jobTypeData: JobTypeFormData = {
                  name: nameInput.value,
                  description: descriptionInput.value
                };
                
                handleJobTypeAdd(jobTypeData);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.jobTypeNameLabel')}</label>
                    <input 
                      type="text" 
                      name="jobTypeName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Es. Manutenzione Caldaia"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('mobile.jobs.modal.newJob.form.jobTypeDescriptionLabel')}</label>
                    <textarea 
                      name="jobTypeDescription"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Descrivi questo tipo di lavoro..."
                    ></textarea>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-600/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {t('mobile.jobs.modal.newJob.form.addJobTypeButton')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}