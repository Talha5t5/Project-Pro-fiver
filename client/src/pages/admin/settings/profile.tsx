import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { useToast } from "../../../hooks/use-toast";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { MultiSelect } from "../../../components/ui/multi-select";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Schema di validazione per il profilo aziendale
const companyProfileSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  owner: z.string().min(2, "Il nome del proprietario deve contenere almeno 2 caratteri"),
  vatNumber: z.string().min(5, "La partita IVA deve contenere almeno 5 caratteri"),
  address: z.string().min(5, "L'indirizzo deve contenere almeno 5 caratteri"),
  city: z.string().min(2, "La città deve contenere almeno 2 caratteri"),
  postalCode: z.string().min(2, "Il CAP deve contenere almeno 2 caratteri"),
  province: z.string().min(2, "La provincia deve contenere almeno 2 caratteri"),
  country: z.string().min(2, "Il paese deve contenere almeno 2 caratteri"),
  phone: z.string().min(5, "Il telefono deve contenere almeno 5 caratteri"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  website: z.string().optional(),
  invoicePrefix: z.string().optional(),
  taxRate: z.number().min(0, "L'aliquota fiscale non può essere negativa"),
  sectorIds: z.array(z.number()).min(1, "Seleziona almeno un settore")
});

type FormValues = z.infer<typeof companyProfileSchema>;

export default function CompanyProfilePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Query per ottenere i settori disponibili
  const { data: sectors } = useQuery({
    queryKey: ["/api/sectors"],
    queryFn: () => apiRequest("GET", "/api/sectors")
      .then(res => res.json())
      .catch(() => []),
  });

  // Query per ottenere il profilo aziendale attuale
  const { data: company, isLoading } = useQuery({
    queryKey: ["/api/company"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/company");
        return await res.json();
      } catch (error) {
        console.error("Errore nel recupero del profilo aziendale:", error);
        // Se il profilo non esiste (404), restituisce un oggetto vuoto invece di null
        // così il form funziona lo stesso e il metodo usato sarà POST
        return {};
      }
    },
  });

  // Definiamo il form con React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: "",
      owner: "",
      vatNumber: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      country: "Italia", // Valore predefinito per l'Italia
      phone: "",
      email: "",
      website: "",
      invoicePrefix: "INV", // Prefisso predefinito per le fatture
      taxRate: 22, // Aliquota IVA predefinita
      sectorIds: []
    },
  });

  // Aggiorniamo i valori del form quando arrivano i dati
  const [formInitialized, setFormInitialized] = useState(false);
  
  // useEffect invece di useState per reagire ai cambiamenti nei dati
  useEffect(() => {
    if (company && !isLoading && !formInitialized) {
      // Convertiamo la stringa JSON dei settori in un array di numeri
      let sectorIdsArray: number[] = [];
      try {
        if (company.sectorIds) {
          sectorIdsArray = JSON.parse(company.sectorIds);
        }
      } catch (error) {
        console.error("Errore nel parsing dei sectorIds:", error);
      }

      console.log("Aggiornamento del form con settori:", sectorIdsArray);
      
      form.reset({
        ...company,
        taxRate: Number(company.taxRate),
        sectorIds: sectorIdsArray
      });
      
      setFormInitialized(true);
    }
  }, [company, isLoading, form, formInitialized]);

  // Mutation per creare o aggiornare il profilo aziendale
  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      setLoading(true);
      // Determiniamo il metodo corretto: 
      // - Se l'oggetto company ha una proprietà id, usiamo PUT per aggiornare
      // - Altrimenti usiamo POST per creare un nuovo profilo
      const method = company && company.id ? "PUT" : "POST";
      console.log("Metodo usato:", method, "Company:", company);
      
      // Assicuriamoci che i sectorIds siano nel formato corretto
      const formattedData = {
        ...data,
        sectorIds: JSON.stringify(data.sectorIds)
      };
      return await apiRequest(method, "/api/company", formattedData)
        .then(res => res.json());
    },
    onSuccess: () => {
      setLoading(false);
      toast({
        title: t("admin.profile.profileSaved"),
        description: t("admin.profile.profileSavedDescription"),
      });
    },
    onError: (error) => {
      setLoading(false);
      toast({
        title: t("admin.common.error"),
        description: `${t("admin.profile.errorSavingProfile")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Gestione del submit del form
  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data);
  };

  // Opzioni per i settori (convertite dal formato dell'API)
  const sectorOptions = sectors?.map((sector: any) => ({
    value: sector.id,
    label: sector.name
  })) || [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/settings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t("admin.profile.backToSettings")}
          </Button>
          <h1 className="text-3xl font-bold">{t("admin.profile.title")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="ml-2">{t("admin.profile.loading")}</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome aziendale */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.companyName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.companyNamePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Proprietario */}
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.owner")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.ownerPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Partita IVA */}
                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.vatNumber")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.vatNumberPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t("admin.profile.form.emailPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Telefono */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.phone")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.phonePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sito web */}
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.website")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.websitePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Indirizzo */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.address")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.addressPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Città */}
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.city")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.cityPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Codice postale */}
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.postalCode")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.postalCodePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Provincia */}
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.province")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.provincePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Paese */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.country")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.countryPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prefisso fattura */}
                  <FormField
                    control={form.control}
                    name="invoicePrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.invoicePrefix")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("admin.profile.form.invoicePrefixPlaceholder")} {...field} />
                        </FormControl>
                        <FormDescription>
                          Prefisso utilizzato per la numerazione delle fatture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Aliquota fiscale */}
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("admin.profile.form.taxRate")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("admin.profile.form.taxRatePlaceholder")}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Percentuale IVA predefinita per le fatture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Settori */}
                <FormField
                  control={form.control}
                  name="sectorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.profile.form.sectors")}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={sectorOptions}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder={t("admin.profile.form.sectorsPlaceholder")}
                        />
                      </FormControl>
                      <FormDescription>
                        Seleziona i settori in cui opera la tua azienda. Questo determinerà le attività e i tipi di lavoro disponibili.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                    <Save size={16} />
                    {t("admin.profile.saveChanges")}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}