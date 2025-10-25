import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, MapPin, Phone, Mail, Building, Home, Factory } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

// Client type definition
type Client = {
  id: number;
  name: string;
  type: "residential" | "commercial" | "industrial";
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  country: string | null;
  createdAt: Date;
  geoLocation: string | null;
  notes: string | null;
  vatNumber: string | null;
  taxCode: string | null;
  contactPerson: string | null;
  website: string | null;
};

// Form validation schema
const clientSchema = z.object({
  name: z.string().min(1, "Nome cliente richiesto"),
  type: z.enum(["residential", "commercial", "industrial"]),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().min(1, "Telefono richiesto"),
  address: z.string().min(1, "Indirizzo richiesto"),
  city: z.string().min(1, "Città richiesta"),
  postalCode: z.string().min(1, "CAP richiesto"),
  province: z.string().min(1, "Provincia richiesta"),
  country: z.string().min(1, "Paese richiesto"),
  vatNumber: z.string().optional(),
  taxCode: z.string().optional(),
  contactPerson: z.string().optional(),
  website: z.string().url("URL non valido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form setup
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      type: "residential",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      country: "Italia",
      vatNumber: "",
      taxCode: "",
      contactPerson: "",
      website: "",
      notes: "",
    },
  });

  // Fetch clients data
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(res => res.json()),
    enabled: true,
  });

     // Create client mutation
   const createClientMutation = useMutation({
     mutationFn: (data: ClientFormData) => 
       apiRequest("POST", "/api/clients", data).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
       toast({
         title: t('clients.messages.created'),
         description: t('clients.messages.created'),
       });
       setIsCreateDialogOpen(false);
       form.reset();
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('clients.messages.createError'),
         variant: "destructive",
       });
     },
   });

     // Update client mutation
   const updateClientMutation = useMutation({
     mutationFn: ({ id, data }: { id: number; data: ClientFormData }) =>
       apiRequest("PUT", `/api/clients/${id}`, data).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
       toast({
         title: t('clients.messages.updated'),
         description: t('clients.messages.updated'),
       });
       setEditingClient(null);
       form.reset();
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('clients.messages.updateError'),
         variant: "destructive",
       });
     },
   });

   // Delete client mutation
   const deleteClientMutation = useMutation({
     mutationFn: (id: number) =>
       apiRequest("DELETE", `/api/clients/${id}`).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
       toast({
         title: t('clients.messages.deleted'),
         description: t('clients.messages.deleted'),
       });
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('clients.messages.deleteError'),
         variant: "destructive",
       });
     },
   });

  // Handle form submission
  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      createClientMutation.mutate(data);
    }
  };

  // Handle edit client
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      type: client.type,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      postalCode: client.postalCode || "",
      province: client.province || "",
      country: client.country || "Italia",
      vatNumber: client.vatNumber || "",
      taxCode: client.taxCode || "",
      contactPerson: client.contactPerson || "",
      website: client.website || "",
      notes: client.notes || "",
    });
  };

     // Handle delete client
   const handleDelete = (id: number) => {
     if (confirm(t('clients.actions.deleteConfirm'))) {
       deleteClientMutation.mutate(id);
     }
   };

  // Filter clients based on search term
  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

     // Get client type icon and label
   const getClientTypeInfo = (type: string) => {
     switch (type) {
       case "residential":
         return { icon: Home, label: t('clients.types.residential'), color: "bg-blue-100 text-blue-800" };
       case "commercial":
         return { icon: Building, label: t('clients.types.commercial'), color: "bg-green-100 text-green-800" };
       case "industrial":
         return { icon: Factory, label: t('clients.types.industrial'), color: "bg-purple-100 text-purple-800" };
       default:
         return { icon: Building, label: type, color: "bg-gray-100 text-gray-800" };
     }
   };

     if (error) {
     return (
       <div className="p-6">
         <Card className="border-red-200 bg-red-50">
           <CardContent className="p-4">
             <p className="text-red-800">{t('clients.error')}</p>
           </CardContent>
         </Card>
       </div>
     );
   }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('clients.title')}</h1>
            <p className="text-gray-600">{t('clients.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")}>
              {t('clients.backToDashboard')}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('clients.newClient')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? t('clients.editClient') : t('clients.newClient')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingClient 
                      ? t('clients.form.editDescription')
                      : t('clients.form.description')
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="name"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.name')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.namePlaceholder')} {...field} />
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
                             <FormLabel>{t('clients.form.type')}</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                               <FormControl>
                                 <SelectTrigger>
                                   <SelectValue placeholder="Seleziona tipo" />
                                 </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                                 <SelectItem value="residential">{t('clients.types.residential')}</SelectItem>
                                 <SelectItem value="commercial">{t('clients.types.commercial')}</SelectItem>
                                 <SelectItem value="industrial">{t('clients.types.industrial')}</SelectItem>
                               </SelectContent>
                             </Select>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="email"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.email')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.emailPlaceholder')} type="email" {...field} />
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
                             <FormLabel>{t('clients.form.phone')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.phonePlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <FormField
                       control={form.control}
                       name="address"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('clients.form.address')}</FormLabel>
                           <FormControl>
                             <Input placeholder={t('clients.form.addressPlaceholder')} {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField
                         control={form.control}
                         name="city"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.city')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.cityPlaceholder')} {...field} />
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
                             <FormLabel>{t('clients.form.postalCode')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.postalCodePlaceholder')} {...field} />
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
                             <FormLabel>{t('clients.form.province')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.provincePlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="country"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.country')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.countryPlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="contactPerson"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.contactPerson')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.contactPersonPlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="vatNumber"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('clients.form.vatNumber')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.vatNumberPlaceholder')} {...field} />
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
                             <FormLabel>{t('clients.form.taxCode')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('clients.form.taxCodePlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <FormField
                       control={form.control}
                       name="website"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('clients.form.website')}</FormLabel>
                           <FormControl>
                             <Input placeholder={t('clients.form.websitePlaceholder')} {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="notes"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('clients.form.notes')}</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder={t('clients.form.notesPlaceholder')} 
                               className="min-h-[100px]"
                               {...field} 
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
                         onClick={() => {
                           setIsCreateDialogOpen(false);
                           setEditingClient(null);
                           form.reset();
                         }}
                       >
                         {t('clients.form.cancel')}
                       </Button>
                       <Button 
                         type="submit" 
                         disabled={createClientMutation.isPending || updateClientMutation.isPending}
                       >
                         {createClientMutation.isPending || updateClientMutation.isPending 
                           ? (editingClient ? t('clients.form.updating') : t('clients.form.creating'))
                           : editingClient ? t('clients.form.save') : t('clients.form.save')
                         }
                       </Button>
                     </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
                 {/* Search and Filters */}
         <Card className="mb-6">
           <CardContent className="p-4">
             <div className="flex items-center space-x-4">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                 <Input
                   placeholder={t('clients.searchPlaceholder')}
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10"
                 />
               </div>
               <Badge variant="outline">
                 {filteredClients.length} {t('clients.clientsCount')}
               </Badge>
             </div>
           </CardContent>
         </Card>

        {/* Clients List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
                 ) : filteredClients.length === 0 ? (
           <Card>
             <CardContent className="p-8 text-center">
               <div className="text-gray-400 mb-4">
                 <Building className="h-16 w-16 mx-auto" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">
                 {searchTerm ? t('clients.noClientsFound') : t('clients.noClients')}
               </h3>
               <p className="text-gray-500 mb-4">
                 {searchTerm 
                   ? t('clients.searchModify')
                   : t('clients.startCreating')
                 }
               </p>
               {!searchTerm && (
                 <Button onClick={() => setIsCreateDialogOpen(true)}>
                   <Plus className="h-4 w-4 mr-2" />
                   {t('clients.createFirstClient')}
                 </Button>
               )}
             </CardContent>
           </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client: Client) => {
              const typeInfo = getClientTypeInfo(client.type);
              const TypeIcon = typeInfo.icon;
              
              return (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <TypeIcon className="h-4 w-4 text-gray-500" />
                          <Badge variant="outline" className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                                             <div className="flex items-center gap-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEdit(client)}
                           title={t('clients.actions.edit')}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(client.id)}
                           className="text-red-600 hover:text-red-700"
                           title={t('clients.actions.delete')}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{client.address}, {client.city}</span>
                        </div>
                      )}
                                             {client.contactPerson && (
                         <div className="text-gray-600">
                           <span className="font-medium">{t('clients.form.contactPerson')}:</span> {client.contactPerson}
                         </div>
                       )}
                      {client.notes && (
                        <div className="text-gray-600 pt-2 border-t">
                          <p className="line-clamp-2">{client.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Creato il {new Date(client.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 