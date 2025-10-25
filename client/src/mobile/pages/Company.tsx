import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { mobileGet, mobilePatch } from "../utils/mobileApi";
import MobileLayout from "../components/MobileLayout";

const companySchema = z.object({
  companyName: z.string().min(1, { message: "Nome azienda obbligatorio" }),
  ownerName: z.string().min(1, { message: "Nome proprietario obbligatorio" }),
  vatNumber: z.string().min(1, { message: "Partita IVA obbligatoria" }),
  address: z.string().min(1, { message: "Indirizzo obbligatorio" }),
  city: z.string().min(1, { message: "Città obbligatoria" }),
  zipCode: z.string().min(1, { message: "CAP obbligatorio" }),
  province: z.string().min(1, { message: "Provincia obbligatoria" }),
  country: z.string().min(1, { message: "Nazione obbligatoria" }),
  email: z.string().email({ message: "Email non valida" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompanySettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carica i dati aziendali
  const { data: company, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['/api/mobile/company'],
    queryFn: async () => {
      try {
        const response = await mobileGet('/company');
        if (!response.ok) {
          if (response.status === 401) {
            // Utente non autenticato, ma non facciamo il redirect
            // Restituiamo null invece di lanciare un errore
            return null;
          }
          throw new Error('Errore nel recuperare i dati aziendali');
        }
        return response.json();
      } catch (error) {
        console.error('Errore:', error);
        return null;
      }
    }
  });

  // Gestione form
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      ownerName: "",
      vatNumber: "",
      address: "",
      city: "",
      zipCode: "",
      province: "",
      country: "Italia",
      email: "",
      phone: "",
      website: "",
      logo: "",
    }
  });

  // Aggiorna i valori del form quando i dati aziendali vengono caricati
  useEffect(() => {
    if (company) {
      form.reset({
        companyName: company.name || "",
        ownerName: company.ownerName || "",
        vatNumber: company.vatNumber || "",
        address: company.address || "",
        city: company.city || "",
        zipCode: company.zipCode || "",
        province: company.province || "",
        country: company.country || "Italia",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        logo: company.logo || "",
      });
    }
  }, [company, form]);

  // Mutation per salvare i dati aziendali
  const updateCompany = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      const response = await mobilePatch('/company', {
        name: data.companyName,
        ownerName: data.ownerName,
        vatNumber: data.vatNumber,
        address: data.address,
        city: data.city,
        zipCode: data.zipCode,
        province: data.province,
        country: data.country,
        email: data.email,
        phone: data.phone,
        website: data.website,
        logo: data.logo,
      });

      if (!response.ok) {
        throw new Error('Errore durante il salvataggio dei dati aziendali');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Salvataggio completato",
        description: "I dati aziendali sono stati aggiornati correttamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/company'] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Gestisci il submit del form
  const onSubmit = (data: CompanyFormValues) => {
    updateCompany.mutate(data);
  };

  const rightAction = (
    <Button 
      type="submit" 
      size="sm"
      form="companyForm"
      disabled={updateCompany.isPending || !form.formState.isDirty}
    >
      <Save className="h-4 w-4 mr-2" />
      Salva
    </Button>
  );

  return (
    <MobileLayout 
      title="Profilo Aziendale" 
      rightAction={rightAction}
      showBackButton={true}
      onBackClick={() => setLocation("/mobile/settings")}
    >
      <div className="p-4">
        <div className="mb-6 mt-2">
          <p className="text-sm text-gray-500">
            Gestisci le informazioni della tua azienda che appariranno nelle fatture e nei documenti
          </p>
        </div>

        {isCompanyLoading ? (
          <div className="flex justify-center py-8">
            <p>Caricamento dati...</p>
          </div>
        ) : (
          <Form {...form}>
            <form id="companyForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Informazioni Generali</h2>
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Azienda *</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci il nome dell'azienda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proprietario *</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci il nome del proprietario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partita IVA *</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci la partita IVA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Indirizzo</h2>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci l'indirizzo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città *</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci la città" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAP *</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il CAP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia *</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci la provincia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazione *</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci la nazione" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Contatti</h2>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Inserisci l'email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci il telefono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sito Web</FormLabel>
                      <FormControl>
                        <Input placeholder="Inserisci il sito web" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        )}
      </div>
    </MobileLayout>
  );
}