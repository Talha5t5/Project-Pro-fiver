import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { MultiSelect } from '../../../components/ui/multi-select';
import { apiRequest } from '../../../lib/queryClient';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { italianProvinces, getCitiesByProvince, getProvinceCodeByName } from '../../../lib/italian-data';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';

// Schema di validazione per i dati aziendali - will be created dynamically with translations

type CompanyProfileFormValues = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  email: string;
  emailPEC?: string;
  phone: string;
  vatNumber: string;
  taxCode?: string;
  website?: string;
  owner: string;
  bankName?: string;
  bankIBAN?: string;
  bankSwift?: string;
  logo?: string;
  sectorIds?: string;
  cuu: string;
};

type CompanyProfileFormProps = {
  onSubmit: (data: CompanyProfileFormValues) => void;
  defaultValues?: Partial<CompanyProfileFormValues>;
  onCancel?: () => void;
};

export function CompanyProfileForm({ onSubmit, defaultValues, onCancel }: CompanyProfileFormProps) {
  const { t } = useTranslation();
  const [provinceOptions, setProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  
  // Create validation schema dynamically with translations
  const companyProfileSchema = z.object({
    name: z.string().min(1, t('companyProfile.companyNameRequired', 'Nome azienda richiesto')),
    address: z.string().min(1, t('companyProfile.addressRequired', 'Indirizzo richiesto')),
    city: z.string().min(1, t('companyProfile.cityRequired', 'Città richiesta')),
    postalCode: z.string().min(1, t('companyProfile.postalCodeRequired', 'CAP richiesto')),
    province: z.string().min(1, t('companyProfile.provinceRequired', 'Provincia richiesta')),
    country: z.string().min(1, t('companyProfile.countryRequired', 'Paese richiesto')),
    email: z.string().email(t('companyProfile.emailInvalid', 'Email non valida')),
    emailPEC: z.string().email(t('companyProfile.emailPECInvalid', 'Email PEC non valida')).optional(),
    phone: z.string().min(1, t('companyProfile.phoneRequired', 'Telefono richiesto')),
    vatNumber: z.string().min(11, t('companyProfile.vatNumberInvalid', 'Partita IVA deve contenere 11 cifre'))
      .regex(/^\d{11}$/, t('companyProfile.vatNumberNumeric', 'Partita IVA deve contenere solo numeri')),
    taxCode: z.string().optional(),
    website: z.string().optional(),
    owner: z.string().min(1, t('companyProfile.ownerRequired', 'Nome del proprietario richiesto')),
    bankName: z.string().optional(),
    bankIBAN: z.string().optional(),
    bankSwift: z.string().optional(),
    logo: z.string().optional(),
    sectorIds: z.string().optional(),
    cuu: z.string().length(7, t('companyProfile.uniqueCodeLength', 'Codice univoco deve contenere 7 caratteri'))
      .regex(/^[A-Za-z0-9]{7}$/, t('companyProfile.uniqueCodeAlphanumeric', 'Codice univoco deve contenere solo caratteri alfanumerici'))
  });
  
  // Query per ottenere settori
  const { data: sectors = [] } = useQuery({
    queryKey: ['/api/sectors'],
    queryFn: () => 
      apiRequest('GET', '/api/sectors')
        .then(res => res.json())
        .catch(() => []),
  });

  // Inizializza il form con react-hook-form
  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      postalCode: '',
      province: '',
      country: 'Italia',
      email: '',
      emailPEC: '',
      phone: '',
      vatNumber: '',
      taxCode: '',
      website: '',
      owner: '',
      bankName: '',
      bankIBAN: '',
      bankSwift: '',
      logo: '',
      sectorIds: '',
      cuu: '0000000',
      ...defaultValues
    },
  });

  // Inizializza le opzioni per le province italiane
  useEffect(() => {
    const options = italianProvinces.map(province => ({
      value: province.code,
      label: `${province.name} (${province.code})`,
    }));
    
    setProvinceOptions(options);
  }, []);

  // Aggiorna le opzioni per le città quando cambia la provincia
  useEffect(() => {
    const provinceCode = form.watch('province');
    if (provinceCode) {
      const cities = getCitiesByProvince(provinceCode);
      setCityOptions(cities);
    } else {
      setCityOptions([]);
    }
  }, [form.watch('province')]);

  // Imposta i valori predefiniti quando disponibili
  useEffect(() => {
    if (defaultValues) {
      // Se c'è il nome della provincia ma non il codice
      if (defaultValues.province && defaultValues.province.length > 2) {
        const provinceCode = getProvinceCodeByName(defaultValues.province);
        if (provinceCode) {
          form.setValue('province', provinceCode);
        }
      }
    }
  }, [defaultValues, form]);

  // Funzione di submit
  const handleSubmit = (data: CompanyProfileFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{t('companyProfile.companyInfo', 'Informazioni Aziendali')}</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.companyName', 'Nome Azienda')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.companyNamePlaceholder', 'Ragione sociale')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.owner', 'Proprietario/Titolare')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.ownerPlaceholder', 'Nome e cognome')} {...field} />
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
                  <FormLabel>{t('companyProfile.vatNumber', 'Partita IVA')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.vatNumberPlaceholder', 'Partita IVA (11 cifre)')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="taxCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.taxCode', 'Codice Fiscale')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.taxCodePlaceholder', 'Codice fiscale')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cuu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.uniqueCode', 'Codice Univoco')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.uniqueCodePlaceholder', '0000000')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sectorIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.activitySectors', 'Settori di Attività')}</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un settore" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((sector: any) => (
                          <SelectItem key={sector.id} value={sector.id.toString()}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {t('companyProfile.activitySectorsDesc', 'Seleziona il settore principale della tua attività')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{t('companyProfile.addressContacts', 'Indirizzo e Contatti')}</h3>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.address', 'Indirizzo')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.addressPlaceholder', 'Via/Piazza e numero civico')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.province', 'Provincia')}*</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('companyProfile.provincePlaceholder', 'Seleziona una provincia')} />
                      </SelectTrigger>
                      <SelectContent>
                        {provinceOptions.map((province) => (
                          <SelectItem key={province.value} value={province.value}>
                            {province.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.city', 'Città')}*</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={!form.watch('province')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !form.watch('province') 
                            ? t('companyProfile.cityPlaceholder', 'Seleziona prima una provincia')
                            : t('companyProfile.citySelectPlaceholder', 'Seleziona una città')
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {city.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="altro">{t('companyProfile.otherCity', 'Altra città (non in lista)')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.postalCode', 'CAP')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.postalCodePlaceholder', 'Codice postale')} {...field} />
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
                  <FormLabel>{t('companyProfile.country', 'Paese')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.countryPlaceholder', 'Italia')} {...field} />
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
                  <FormLabel>{t('companyProfile.email', 'Email')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.emailPlaceholder', 'Email aziendale')} {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="emailPEC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.emailPEC', 'Email PEC')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.emailPECPlaceholder', 'Email PEC aziendale')} {...field} value={field.value || ''} type="email" />
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
                  <FormLabel>{t('companyProfile.phone', 'Telefono')}*</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.phonePlaceholder', 'Telefono aziendale')} {...field} />
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
                  <FormLabel>{t('companyProfile.website', 'Sito Web')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.websitePlaceholder', 'Sito web aziendale')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-lg font-medium">{t('companyProfile.bankInfo', 'Dati Bancari')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.bankName', 'Nome Banca')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.bankNamePlaceholder', 'Nome della banca')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bankIBAN"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.bankIBAN', 'IBAN')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.bankIBANPlaceholder', 'IBAN')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bankSwift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyProfile.bankSwift', 'SWIFT/BIC')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('companyProfile.bankSwiftPlaceholder', 'Codice SWIFT/BIC')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {t('companyProfile.cancel', 'Annulla')}
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {t('companyProfile.save', 'Salva Informazioni')}
          </button>
        </div>
      </form>
    </Form>
  );
}