import { useState, useEffect } from 'react';
import { useParams, useLocation } from "wouter";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';

import MobileLayout from './MobileLayout';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft } from "lucide-react";

// Interface for JobType
interface JobType {
  id: number;
  name: string;
  description?: string;
}

const activitySchema = z.object({
  name: z.string().min(1, 'Il nome è richiesto'),
  jobTypeId: z.string().min(1, 'Il tipo di lavoro è richiesto'),
  description: z.string().optional(),
  defaultDuration: z.string().optional(),
  defaultRate: z.string().optional(),
  jobTypesIds: z.string().optional(),
  selectedJobTypes: z.array(z.number()).default([]),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function ActivityForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activityId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!activityId && activityId > 0;
  const [isSaving, setIsSaving] = useState(false);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: '',
      jobTypeId: '',
      description: '',
      defaultDuration: '',
      defaultRate: '',
      jobTypesIds: '',
      selectedJobTypes: [],
    }
  });

  // Fetch job types
  const { isLoading: isLoadingJobTypes, data: jobTypesData } = useQuery({
    queryKey: ['/api/mobile/jobtypes'],
    queryFn: async () => {
      const response = await fetch('/api/mobile/jobtypes');
      if (!response.ok) {
        throw new Error('Errore nel recuperare i tipi di lavoro');
      }
      return response.json();
    }
  });
  
  // Aggiorna i tipi di lavoro quando arrivano i dati
  useEffect(() => {
    if (jobTypesData) {
      setJobTypes(jobTypesData);
    }
  }, [jobTypesData]);

  // Fetch activity data if in edit mode
  const { isLoading: isLoadingActivity, data: activityData } = useQuery({
    queryKey: [`/api/mobile/activities/${activityId}`],
    queryFn: async () => {
      if (!activityId) return undefined;
      const response = await fetch(`/api/mobile/activities/${activityId}`);
      if (!response.ok) {
        throw new Error("Errore nel recuperare i dati dell'attività");
      }
      return response.json();
    },
    enabled: isEditMode
  });
  
  // Funzione per processare i jobTypesIds da stringa ad array di numeri
  const processJobTypesIds = (jobTypesIdsString: string | undefined | null): number[] => {
    if (!jobTypesIdsString) return [];
    
    try {
      // Gestisce sia formato CSV che JSON array
      if (jobTypesIdsString.startsWith('[') && jobTypesIdsString.endsWith(']')) {
        return JSON.parse(jobTypesIdsString);
      } else {
        return jobTypesIdsString.split(',')
          .map(id => id.trim())
          .filter(id => id !== '')
          .map(id => parseInt(id, 10))
          .filter(id => !isNaN(id));
      }
    } catch (error) {
      console.error("Errore nel processare i jobTypesIds:", error);
      return [];
    }
  };

  // Aggiorna i valori del form quando arrivano i dati dell'attività
  useEffect(() => {
    if (activityData) {
      // Processa i tipi di lavoro associati
      const selectedJobTypes = processJobTypesIds(activityData.jobTypesIds);
      
      // Set form values ensuring string values for select and number inputs
      form.reset({
        ...activityData,
        jobTypeId: activityData.jobTypeId.toString(),
        defaultDuration: activityData.defaultDuration ? activityData.defaultDuration.toString() : '',
        defaultRate: activityData.defaultRate ? activityData.defaultRate.toString() : '',
        selectedJobTypes: selectedJobTypes
      });
    }
  }, [activityData, form]);

  // Create activity mutation
  const createActivity = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      setIsSaving(true);
      try {
        console.log("Dati attività da inviare:", JSON.stringify(values, null, 2));
        
        // Convert string values to appropriate types
        const dataToSend = {
          ...values,
          jobTypeId: parseInt(values.jobTypeId),
          defaultDuration: values.defaultDuration ? parseFloat(values.defaultDuration) : undefined,
          defaultRate: values.defaultRate ? parseFloat(values.defaultRate) : undefined,
        };
        
        // Aggiungiamo jobTypesIds come stringa per compatibilità
        if (values.selectedJobTypes && values.selectedJobTypes.length > 0) {
          dataToSend.jobTypesIds = values.selectedJobTypes.join(',');
        }
        
        console.log("Dati formattati da inviare:", JSON.stringify(dataToSend, null, 2));
        
        const response = await fetch('/api/mobile/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
        
        console.log("Risposta del server:", response.status, response.statusText);
        
        if (!response.ok) {
          let errorMessage = "Errore durante la creazione dell'attività";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            const errorText = await response.text();
            errorMessage += `: ${errorText}`;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error) {
        console.error("Errore nella chiamata API:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Attività creata",
        description: "La nuova attività è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/activities'] });
      setLocation("/mobile/settings/activities");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'attività",
        variant: "destructive"
      });
    }
  });

  // Update activity mutation
  const updateActivity = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      if (!activityId) throw new Error("ID attività mancante");
      setIsSaving(true);
      
      try {
        console.log("Dati attività da aggiornare:", JSON.stringify(values, null, 2));
        
        // Convert string values to appropriate types
        const dataToSend = {
          ...values,
          jobTypeId: parseInt(values.jobTypeId),
          defaultDuration: values.defaultDuration ? parseFloat(values.defaultDuration) : undefined,
          defaultRate: values.defaultRate ? parseFloat(values.defaultRate) : undefined,
        };
        
        // Aggiungiamo jobTypesIds come stringa per compatibilità
        if (values.selectedJobTypes && values.selectedJobTypes.length > 0) {
          dataToSend.jobTypesIds = values.selectedJobTypes.join(',');
        }
        
        console.log("Dati formattati da inviare per l'aggiornamento:", JSON.stringify(dataToSend, null, 2));
        
        const response = await fetch(`/api/mobile/activities/${activityId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
        
        console.log("Risposta del server per aggiornamento:", response.status, response.statusText);
        
        if (!response.ok) {
          let errorMessage = "Errore durante l'aggiornamento dell'attività";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            const errorText = await response.text();
            errorMessage += `: ${errorText}`;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error) {
        console.error("Errore nella chiamata API di aggiornamento:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Attività aggiornata",
        description: "L'attività è stata aggiornata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/activities'] });
      setLocation("/mobile/settings/activities");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dell'attività",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: ActivityFormValues) => {
    if (isEditMode) {
      updateActivity.mutate(values);
    } else {
      createActivity.mutate(values);
    }
  };

  const handleCancel = () => {
    setLocation("/mobile/settings/activities");
  };

  const isLoading = isLoadingJobTypes || isLoadingActivity;

  return (
    <MobileLayout
      title={isEditMode ? "Modifica Attività" : "Nuova Attività"}
      rightAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <div className="p-4">
        {isLoadingJobTypes && (
          <div className="text-center py-4">Caricamento tipi di lavoro...</div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome attività" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedJobTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipi di lavoro*</FormLabel>
                  <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg">
                    {jobTypes.map((jobType) => (
                      <label key={jobType.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary" 
                          checked={field.value.includes(jobType.id)}
                          onChange={(e) => {
                            let updatedJobTypes = [...field.value];
                            if (e.target.checked) {
                              if (!updatedJobTypes.includes(jobType.id)) {
                                updatedJobTypes.push(jobType.id);
                              }
                            } else {
                              updatedJobTypes = updatedJobTypes.filter(id => id !== jobType.id);
                            }
                            field.onChange(updatedJobTypes);
                            
                            // Aggiorna anche jobTypesIds come stringa per compatibilità
                            const jobTypesIdsString = updatedJobTypes.join(',');
                            form.setValue('jobTypesIds', jobTypesIdsString);
                            
                            // Se c'è almeno un tipo di lavoro selezionato, impostiamo il primo come principale
                            if (updatedJobTypes.length > 0) {
                              form.setValue('jobTypeId', updatedJobTypes[0].toString());
                            } else {
                              form.setValue('jobTypeId', '');
                            }
                          }}
                        />
                        <span>{jobType.name}</span>
                      </label>
                    ))}
                  </div>
                  <FormDescription>
                    Seleziona uno o più tipi di lavoro per questa attività
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrizione dell'attività" 
                      {...field} 
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            


            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata prevista (ore)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0"
                        placeholder="Ore" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tariffa oraria (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="€/ora" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || isLoading}
              >
                {isSaving ? "Salvataggio..." : isEditMode ? "Aggiorna attività" : "Salva attività"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MobileLayout>
  );
}