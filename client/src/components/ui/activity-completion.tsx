import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

interface JobActivity {
  id: number;
  jobId: number;
  activityId: number;
  startDate: string;
  duration: number;
  status: string;
  notes: string;
  activity?: {
    name: string;
  };
  job?: {
    title: string;
    client?: {
      name: string;
    };
  };
}

interface ActivityCompletionProps {
  jobActivity: JobActivity;
  onCompleted?: () => void;
}

// Schema per la validazione del form
const activityCompletionSchema = z.object({
  completedDate: z.string().min(1, "La data è richiesta"),
  actualDuration: z.number({
    required_error: "La durata è richiesta",
    invalid_type_error: "La durata deve essere un numero"
  }).min(0, "La durata deve essere maggiore di 0"),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional()
});

type ActivityCompletionFormValues = z.infer<typeof activityCompletionSchema>;

export function ActivityCompletion({ jobActivity, onCompleted }: ActivityCompletionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Inizializza il form con i valori predefiniti
  const form = useForm<ActivityCompletionFormValues>({
    resolver: zodResolver(activityCompletionSchema),
    defaultValues: {
      completedDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      actualDuration: jobActivity.duration,
      notes: jobActivity.notes || '',
      photos: []
    }
  });

  // Mutation per completare l'attività
  const completeActivity = useMutation({
    mutationFn: (values: ActivityCompletionFormValues) => {
      return apiRequest(`/api/jobactivities/${jobActivity.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          photos
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Attività completata",
        description: "L'attività è stata registrata come completata.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobactivities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobActivity.jobId, 'activities'] });
      setIsOpen(false);
      if (onCompleted) onCompleted();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento dell'attività.",
        variant: "destructive"
      });
      console.error("Error completing activity:", error);
    }
  });

  // Gestione dell'upload delle immagini
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In una vera implementazione, qui caricheresti i file su un server 
    // e otterresti URL per le immagini caricate
    const newPhotos = Array.from(files).map((file) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      
      reader.readAsDataURL(file);
      return URL.createObjectURL(file);
    });
  };

  // Handler per la sottomissione del form
  const onSubmit = (values: ActivityCompletionFormValues) => {
    completeActivity.mutate(values);
  };

  // Formatta il tempo in ore e minuti
  const formatTime = (date: Date): string => {
    return format(date, "HH:mm", { locale: it });
  };

  // Formatta la data in italiano
  const formatDate = (date: Date): string => {
    return format(date, "d MMMM yyyy", { locale: it });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="w-full">Registra completamento</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Registra completamento dell'attività</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli dell'attività completata
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg">
                  {jobActivity.activity?.name || "Attività"}
                </CardTitle>
                <CardDescription>
                  {jobActivity.job?.title} - {jobActivity.job?.client?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Data/ora programmata:</span>{' '}
                    {formatDate(new Date(jobActivity.startDate))} alle {formatTime(new Date(jobActivity.startDate))}
                  </div>
                  <div>
                    <span className="font-medium">Durata programmata:</span>{' '}
                    {jobActivity.duration} {jobActivity.duration === 1 ? 'ora' : 'ore'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Aggiungi note sull'attività completata" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="block text-sm font-medium mb-1">Foto</label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileUpload} 
                  className="mb-2"
                />
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative rounded overflow-hidden" style={{ height: '80px' }}>
                        <img 
                          src={photo} 
                          alt={`Foto ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={completeActivity.isPending}
                >
                  {completeActivity.isPending ? "Salvataggio..." : "Completa attività"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}