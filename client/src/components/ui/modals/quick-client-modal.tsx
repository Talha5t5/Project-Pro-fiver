import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/queryClient';
import { useToast } from '../../../hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../form';
import { Input } from '../input';
import { Button } from '../button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Textarea } from '../textarea';

const clientSchema = z.object({
  name: z.string().min(1, 'Il nome è richiesto'),
  type: z.enum(['residential', 'commercial', 'industrial'], {
    required_error: 'Il tipo di cliente è richiesto'
  }),
  phone: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  address: z.string().optional(),
  geoLocation: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: (clientId: number) => void;
}

export function QuickClientModal({ isOpen, onClose, onClientAdded }: QuickClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      type: 'residential',
      address: '',
      phone: '',
      email: '',
      geoLocation: '',
      notes: '',
    }
  });

  const createClient = useMutation({
    mutationFn: (values: ClientFormValues) => {
      setIsSaving(true);
      return apiRequest('POST', '/api/clients', values);
    },
    onSuccess: (data: any) => {
      setIsSaving(false);
      toast({
        title: "Cliente creato",
        description: "Il nuovo cliente è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      if (onClientAdded && data.id) {
        onClientAdded(data.id);
      }
      form.reset();
      onClose();
    },
    onError: (error) => {
      setIsSaving(false);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del cliente",
        variant: "destructive"
      });
      console.error("Error creating client:", error);
    }
  });

  const onSubmit = (values: ClientFormValues) => {
    createClient.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Aggiungi un nuovo cliente</DialogTitle>
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
                    <Input placeholder="Nome cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo cliente*</FormLabel>
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
                      <SelectItem value="residential">Residenziale</SelectItem>
                      <SelectItem value="commercial">Commerciale</SelectItem>
                      <SelectItem value="industrial">Industriale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input placeholder="Indirizzo cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="Numero di telefono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="geoLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posizione geografica</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Latitudine,Longitudine" {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const lat = position.coords.latitude;
                              const lng = position.coords.longitude;
                              field.onChange(`${lat},${lng}`);
                              toast({
                                title: "Posizione attuale ottenuta",
                                description: `Coordinate: ${lat}, ${lng}`,
                              });
                            },
                            (error) => {
                              toast({
                                title: "Errore",
                                description: "Impossibile ottenere la posizione attuale.",
                                variant: "destructive"
                              });
                              console.error("Geolocation error:", error);
                            }
                          );
                        } else {
                          toast({
                            title: "Errore",
                            description: "Geolocalizzazione non supportata dal tuo browser.",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="shrink-0"
                    >
                      <span className="material-icons text-sm">my_location</span>
                    </Button>
                  </div>
                  <FormDescription>
                    Inserisci le coordinate nel formato "latitudine,longitudine" o usa il pulsante per ottenere la posizione attuale
                  </FormDescription>
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
                    <Textarea placeholder="Inserisci eventuali note" {...field} />
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
                {isSaving ? "Salvataggio..." : "Salva cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}