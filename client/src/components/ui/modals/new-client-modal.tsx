import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

const clientSchema = z.object({
  name: z.string().min(1, "Nome / Azienda è richiesto"),
  type: z.enum(["residential", "commercial", "industrial"]),
  phone: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function NewClientModal() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      type: 'residential',
      phone: '',
      email: '',
      address: '',
      notes: '',
    }
  });
  
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'new-client-modal') {
        setIsOpen(true);
      }
    };
    
    document.addEventListener('openModal', handleOpenModal);
    return () => document.removeEventListener('openModal', handleOpenModal);
  }, []);
  
  const closeModal = () => {
    setIsOpen(false);
    reset();
  };
  
  const onSubmit = async (data: ClientFormData) => {
    try {
      await apiRequest('POST', '/api/clients', data);
      
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        title: "Cliente aggiunto",
        description: `${data.name} è stato aggiunto con successo.`
      });
      
      closeModal();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del cliente.",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold">Nuovo Cliente</h2>
          <button className="text-neutral-500" onClick={closeModal}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome / Azienda</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo Cliente</label>
                <select 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  {...register('type')}
                >
                  <option value="residential">Residenziale</option>
                  <option value="commercial">Commerciale</option>
                  <option value="industrial">Industriale</option>
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Telefono</label>
                <input 
                  type="tel" 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  {...register('phone')}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Indirizzo</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  {...register('address')}
                />
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
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
                    Salvataggio...
                  </span>
                ) : 'Salva Cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
