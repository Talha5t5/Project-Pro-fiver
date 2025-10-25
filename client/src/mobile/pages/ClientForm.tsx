import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { usePermissions } from "../contexts/PermissionContext";
import MobileLayout from "../components/MobileLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { ArrowLeft, Save } from "lucide-react";

interface ClientFormData {
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
}

interface ClientFormProps {
  clientId?: string;
  isEditMode?: boolean;
}

export default function ClientForm({ clientId, isEditMode = false }: ClientFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    type: "residential",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation per creare o aggiornare un cliente
  const clientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const url = isEditMode 
        ? `/api/mobile/clients/${clientId}` 
        : '/api/mobile/clients';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Use mobileApiCall to include session header
      const { mobileApiCall } = await import('../utils/mobileApi');
      const response = await mobileApiCall(method, url, data);
      
      if (!response.ok) {
        throw new Error(isEditMode 
          ? 'Errore durante l\'aggiornamento del cliente' 
          : 'Errore durante la creazione del cliente'
        );
      }
      
      // Some endpoints may return empty body; guard parsing
      try {
        return await response.json();
      } catch {
        return true as any;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/all-clients'] });
      toast({
        title: isEditMode ? "Cliente aggiornato" : "Cliente creato",
        description: isEditMode 
          ? "Il cliente è stato aggiornato con successo" 
          : "Il cliente è stato creato con successo",
      });
      setLocation("/mobile/settings/clients");
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  // Gestisci il submit del form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazioni di base
    if (!formData.name.trim()) {
      toast({
        title: "Campo richiesto",
        description: "Il nome del cliente è obbligatorio",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    clientMutation.mutate(formData);
  };
  
  // Aggiorna lo stato del form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Aggiorna il tipo di cliente
  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value
    }));
  };
  
  return (
    <MobileLayout 
      title={isEditMode ? "Modifica Cliente" : "Nuovo Cliente"}
      rightAction={
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/mobile/settings/clients")}
        >
          <ArrowLeft size={22} />
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Client Name - Always visible */}
        <div>
          <Label htmlFor="name">Nome Cliente</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome completo del cliente"
            className="mt-1"
            required
          />
        </div>
        
        {/* Client Type - Check permission */}
        {hasPermission('canViewClientType') && (
          <div>
            <Label>Tipo Cliente</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={handleTypeChange}
              className="flex flex-col space-y-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="residential" id="residential" />
                <Label htmlFor="residential" className="font-normal">Residenziale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commercial" id="commercial" />
                <Label htmlFor="commercial" className="font-normal">Commerciale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="industrial" id="industrial" />
                <Label htmlFor="industrial" className="font-normal">Industriale</Label>
              </div>
            </RadioGroup>
          </div>
        )}
        
        {/* Email - Check permission */}
        {hasPermission('canViewClientEmail') && (
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email del cliente"
              className="mt-1"
            />
          </div>
        )}
        
        {/* Phone - Check permission */}
        {hasPermission('canViewClientPhone') && (
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Numero di telefono"
              className="mt-1"
            />
          </div>
        )}
        
        {/* Address - Check permission */}
        {hasPermission('canViewClientAddress') && (
          <div>
            <Label htmlFor="address">Indirizzo</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Indirizzo completo"
              className="mt-1"
            />
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center"
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting 
            ? "Salvataggio in corso..." 
            : isEditMode 
              ? "Aggiorna Cliente" 
              : "Salva Cliente"
          }
        </Button>
      </form>
    </MobileLayout>
  );
}