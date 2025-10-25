import { useState } from 'react';
import { useParams, useLocation } from "wouter";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';

import MobileLayout from './MobileLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft } from "lucide-react";

const jobTypeSchema = z.object({
  name: z.string().min(1, 'Il nome è richiesto'),
  description: z.string().optional(),
});

type JobTypeFormValues = z.infer<typeof jobTypeSchema>;

export default function JobTypeForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const jobTypeId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!jobTypeId && jobTypeId > 0;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<JobTypeFormValues>({
    resolver: zodResolver(jobTypeSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  // Fetch job type data if in edit mode
  const { isLoading } = useQuery({
    queryKey: [`/api/jobtypes/${jobTypeId}`],
    queryFn: async () => {
      if (!jobTypeId) return undefined;
      const response = await fetch(`/api/jobtypes/${jobTypeId}`);
      if (!response.ok) {
        throw new Error("Errore nel recuperare i dati del tipo di lavoro");
      }
      return response.json();
    },
    enabled: isEditMode,
    onSuccess: (data) => {
      if (data) {
        form.reset(data);
      }
    }
  });

  // Mutation for creating a new job type
  const createJobType = useMutation({
    mutationFn: async (values: JobTypeFormValues) => {
      setIsSaving(true);
      const response = await fetch('/api/jobtypes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante la creazione del tipo di lavoro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Tipo di lavoro creato",
        description: "Il nuovo tipo di lavoro è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
      setLocation("/mobile/settings/jobtypes");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione del tipo di lavoro",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating an existing job type
  const updateJobType = useMutation({
    mutationFn: async (values: JobTypeFormValues) => {
      if (!jobTypeId) throw new Error("ID tipo di lavoro mancante");
      setIsSaving(true);
      
      const response = await fetch(`/api/jobtypes/${jobTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'aggiornamento del tipo di lavoro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Tipo di lavoro aggiornato",
        description: "Il tipo di lavoro è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
      setLocation("/mobile/settings/jobtypes");
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento del tipo di lavoro",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: JobTypeFormValues) => {
    if (isEditMode) {
      updateJobType.mutate(values);
    } else {
      createJobType.mutate(values);
    }
  };

  const handleCancel = () => {
    setLocation("/mobile/settings/jobtypes");
  };

  return (
    <MobileLayout
      title={isEditMode ? "Modifica Tipo di Lavoro" : "Nuovo Tipo di Lavoro"}
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome tipo di lavoro" {...field} />
                  </FormControl>
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
                      placeholder="Descrizione del tipo di lavoro" 
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                {isSaving ? "Salvataggio..." : isEditMode ? "Aggiorna tipo" : "Salva tipo"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MobileLayout>
  );
}