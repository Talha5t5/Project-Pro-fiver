import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/queryClient';
import { useToast } from '../../../hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../form';
import { Input } from '../input';
import { Button } from '../button';
import { Textarea } from '../textarea';

const jobTypeSchema = z.object({
  name: z.string().min(1, 'Il nome è richiesto'),
  description: z.string().optional(),
});

type JobTypeFormValues = z.infer<typeof jobTypeSchema>;

interface QuickJobTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobTypeAdded?: (jobTypeId: string) => void;
}

export function QuickJobTypeModal({ isOpen, onClose, onJobTypeAdded }: QuickJobTypeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<JobTypeFormValues>({
    resolver: zodResolver(jobTypeSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const createJobType = useMutation({
    mutationFn: (values: JobTypeFormValues) => {
      setIsSaving(true);
      return apiRequest('POST', '/api/jobtypes', values);
    },
    onSuccess: (data: any) => {
      setIsSaving(false);
      toast({
        title: "Tipo di lavoro creato",
        description: "Il nuovo tipo di lavoro è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobtypes'] });
      if (onJobTypeAdded && data.id) {
        onJobTypeAdded(data.id);
      }
      form.reset();
      onClose();
    },
    onError: (error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del tipo di lavoro",
        variant: "destructive"
      });
      console.error("Error creating job type:", error);
    }
  });

  const onSubmit = (values: JobTypeFormValues) => {
    createJobType.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Aggiungi un nuovo tipo di lavoro</DialogTitle>
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
                    <Textarea placeholder="Descrizione" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? "Salvataggio..." : "Salva tipo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}