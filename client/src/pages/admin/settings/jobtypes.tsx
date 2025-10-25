import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { MultiSelect, OptionType } from "../../../components/ui/multi-select";
import { LanguageSelector } from "../../../components/ui/language-selector";

// Schema per la validazione del form
const jobTypeSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  description: z.string().nullable().optional(),
  sectorIds: z.array(z.string()).min(1, "Seleziona almeno un settore"),
  isDefault: z.boolean().default(false),
});

type JobTypeFormValues = z.infer<typeof jobTypeSchema>;

export default function AdminJobTypesPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJobType, setEditingJobType] = useState<any | null>(null);
  const [sectorOptions, setSectorOptions] = useState<OptionType[]>([]);

  // Query per ottenere i tipi di lavoro
  const { data: jobTypes = [], isLoading: isLoadingJobTypes } = useQuery({
    queryKey: ["/api/jobtypes"],
    queryFn: () => apiRequest("GET", "/api/jobtypes").then(res => res.json()).catch(() => []),
  });

  // Query per ottenere i settori
  const { data: sectors = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ["/api/sectors"],
    queryFn: () => apiRequest("GET", "/api/sectors").then(res => res.json()).catch(() => []),
  });

  // Prepara le opzioni per il multi-select dei settori
  useEffect(() => {
    if (Array.isArray(sectors)) {
      const options = sectors.map((sector: any) => ({
        label: sector.name,
        value: sector.id.toString(),
      }));
      setSectorOptions(options);
    }
  }, [sectors]);

  // Definiamo il form con React Hook Form
  const form = useForm<JobTypeFormValues>({
    resolver: zodResolver(jobTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      sectorIds: [],
      isDefault: false,
    },
  });

  // Mutation per creare un nuovo tipo di lavoro
  const createMutation = useMutation({
    mutationFn: (data: JobTypeFormValues) => {
      // Converti da array di stringhe a stringa JSON nel formato di storage
      const formattedData = {
        ...data,
        sectorIds: JSON.stringify(data.sectorIds),
      };
      return apiRequest("POST", "/api/jobtypes", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobtypes"] });
      toast({
        title: t("jobTypes.jobTypeCreated"),
        description: t("jobTypes.jobTypeCreatedDescription"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("jobTypes.errorCreatingJobType")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un tipo di lavoro esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobTypeFormValues }) => 
      apiRequest("PUT", `/api/jobtypes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobtypes"] });
      toast({
        title: t("jobTypes.jobTypeUpdated"),
        description: t("jobTypes.jobTypeUpdatedDescription"),
      });
      setIsDialogOpen(false);
      setEditingJobType(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("jobTypes.errorUpdatingJobType")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un tipo di lavoro
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      console.log('🔍 Deleting job type with ID:', id);
      return apiRequest("DELETE", `/api/jobtypes/${id}`);
    },
    onSuccess: () => {
      console.log('✅ Job type deleted successfully');
      queryClient.invalidateQueries({ queryKey: ["/api/jobtypes"] });
      toast({
        title: t("jobTypes.jobTypeDeleted"),
        description: t("jobTypes.jobTypeDeletedDescription"),
      });
    },
    onError: (error) => {
      console.error('❌ Error deleting job type:', error);
      toast({
        title: t("admin.common.error"),
        description: `${t("jobTypes.errorDeletingJobType")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      name: "",
      description: "",
      sectorIds: [],
      isDefault: false,
    });
    setEditingJobType(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (jobType: any) => {
    // Converti i sectorIds da stringa JSON a array
    let sectorIds: string[] = [];
    try {
      if (jobType.sectorIds) {
        sectorIds = JSON.parse(jobType.sectorIds);
      }
    } catch (e) {
      console.error("Errore nel parsing dei settori:", e);
    }

    form.reset({
      name: jobType.name,
      description: jobType.description || "",
      sectorIds: sectorIds.map(id => id.toString()),
      isDefault: jobType.isDefault === null ? false : jobType.isDefault,
    });
    setEditingJobType(jobType);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: JobTypeFormValues) => {
    if (editingJobType) {
      updateMutation.mutate({ id: editingJobType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un tipo di lavoro
  const handleDelete = (id: number) => {
    if (confirm(t("jobTypes.confirmDeleteJobType"))) {
      deleteMutation.mutate(id);
    }
  };

  // Funzione per ottenere i nomi dei settori da un array di IDs
  const getSectorNames = (sectorIds: string) => {
    if (!sectorIds || !Array.isArray(sectors)) return "-";
    
    try {
      const ids = JSON.parse(sectorIds);
      if (!Array.isArray(ids) || ids.length === 0) return "-";
      
      return ids.map((id: string) => {
        const sector = sectors.find((s: any) => s.id === parseInt(id));
        return sector ? sector.name : `${t('admin.jobTypes.table.sectors')} #${id}`;
      }).join(", ");
    } catch (e) {
      console.error("Errore nella visualizzazione dei settori:", e);
      return "-";
    }
  };

  // Funzione per visualizzare i badge dei settori
  const getSectorBadges = (sectorIds: string) => {
    console.log('🔍 getSectorBadges called with:', { sectorIds, sectors: sectors?.length });
    if (!sectorIds || !Array.isArray(sectors)) return null;
    
    try {
      const ids = JSON.parse(sectorIds);
      console.log('🔍 Parsed IDs:', ids);
      if (!Array.isArray(ids) || ids.length === 0) return null;
      
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id: string) => {
            const sector = sectors.find((s: any) => s.id === parseInt(id));
            return sector ? (
              <Badge key={id} variant="outline" className="text-xs">
                {sector.name}
              </Badge>
            ) : null;
          })}
        </div>
      );
    } catch (e) {
      console.error("Errore nella visualizzazione dei settori:", e);
      return null;
    }
  };

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
            {t('jobTypes.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('jobTypes.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('jobTypes.newJobType')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('jobTypes.title')}</CardTitle>
          <CardDescription>
            {t('jobTypes.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJobTypes ? (
            <div className="flex justify-center p-6">
              <p>{t('jobTypes.loadingJobTypes')}</p>
            </div>
          ) : Array.isArray(jobTypes) && jobTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">{t('jobTypes.noJobTypesAvailable')}</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                {t('jobTypes.createFirstJobType')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('jobTypes.table.name')}</TableHead>
                  <TableHead>{t('jobTypes.table.description')}</TableHead>
                  <TableHead>{t('jobTypes.table.sectors')}</TableHead>
                  <TableHead>{t('jobTypes.table.isDefault')}</TableHead>
                  <TableHead className="text-right">{t('jobTypes.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(jobTypes) && jobTypes.map((jobType: any) => (
                  <TableRow key={jobType.id}>
                    <TableCell className="font-medium">{jobType.name}</TableCell>
                    <TableCell>{jobType.description || t('jobTypes.table.noDescription')}</TableCell>
                    <TableCell>
                      {getSectorBadges(jobType.sectorIds) || t('admin.jobTypes.table.noSectors')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${jobType.isDefault ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                        {jobType.isDefault ? t('jobTypes.table.yes') : t('jobTypes.table.no')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(jobType)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(jobType.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog per creare/modificare un tipo di lavoro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingJobType ? t('jobTypes.editJobType') : t('jobTypes.newJobType')}
            </DialogTitle>
            <DialogDescription>
              {editingJobType 
                ? t('jobTypes.editJobTypeDescription')
                : t('jobTypes.newJobTypeDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('jobTypes.form.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('jobTypes.form.namePlaceholder')} {...field} />
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
                    <FormLabel>{t('jobTypes.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('jobTypes.form.descriptionPlaceholder')}
                        {...field} 
                      />
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
                    <FormLabel>{t('jobTypes.form.sectors')}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={sectorOptions}
                        placeholder={t('jobTypes.form.sectorsPlaceholder')}
                        selected={field.value}
                        onChange={field.onChange}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t('jobTypes.form.isDefault')}</FormLabel>
                      <FormDescription>
                        {t('jobTypes.form.isDefaultDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('jobTypes.form.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingJobType 
                    ? t('jobTypes.form.update')
                    : t('jobTypes.form.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}