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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
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
const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  implementationNotes: z.string().nullable().optional(),
  jobTypeId: z.string().min(1, "Select a main job type"),
  jobTypeIds: z.array(z.string()).min(1, "Select at least one job type"),
  sectorIds: z.array(z.string()).min(1, "Select at least one sector"),
  isDefault: z.boolean().default(false),
  defaultDuration: z.coerce.number().positive("Duration must be positive").nullable().optional(),
  defaultRate: z.coerce.number().nonnegative("Rate cannot be negative").nullable().optional(),
  defaultCost: z.coerce.number().nonnegative("Cost cannot be negative").nullable().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function AdminActivitiesPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [jobTypeOptions, setJobTypeOptions] = useState<OptionType[]>([]);
  const [sectorOptions, setSectorOptions] = useState<OptionType[]>([]);

  // Query per ottenere le attività
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: () => apiRequest("GET", "/api/activities").then(res => res.json()).catch(() => []),
  });

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

  // Prepara le opzioni per il multi-select dei tipi di lavoro
  useEffect(() => {
    console.log("Job types data received:", jobTypes);
    if (Array.isArray(jobTypes)) {
      const options = jobTypes.map((jobType: any) => ({
        label: jobType.name,
        value: jobType.id.toString(),
      }));
      console.log("Setting job type options:", options);
      setJobTypeOptions(options);
    } else {
      console.log("Job types is not an array:", jobTypes);
    }
  }, [jobTypes]);

  // Prepara le opzioni per il multi-select dei settori
  useEffect(() => {
    console.log("Sectors data received:", sectors);
    if (Array.isArray(sectors)) {
      const options = sectors.map((sector: any) => ({
        label: sector.name,
        value: sector.id.toString(),
      }));
      console.log("Setting sector options:", options);
      setSectorOptions(options);
    } else {
      console.log("Sectors is not an array:", sectors);
    }
  }, [sectors]);

  // Definiamo il form con React Hook Form
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      description: "",
      implementationNotes: "",
      jobTypeId: "",
      jobTypeIds: [],
      sectorIds: [],
      isDefault: false,
      defaultDuration: null,
      defaultRate: null,
      defaultCost: null,
    },
  });

  // Mutation per creare una nuova attività
  const createMutation = useMutation({
    mutationFn: (data: ActivityFormValues) => {
      // Converti da array di stringhe a stringa JSON nel formato di storage
      const formattedData = {
        ...data,
        jobTypeId: parseInt(data.jobTypeId),
        jobTypeIds: JSON.stringify(data.jobTypeIds),
        sectorIds: JSON.stringify(data.sectorIds),
        // Convert numeric fields to strings for decimal database fields
        defaultDuration: data.defaultDuration?.toString() || null,
        defaultRate: data.defaultRate?.toString() || null,
        defaultCost: data.defaultCost?.toString() || null,
      };
      return apiRequest("POST", "/api/activities", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: t("activities.activityCreated"),
        description: t("activities.activityCreatedDescription"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("activities.errorCreatingActivity")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un'attività esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActivityFormValues }) => {
      // Converti da array di stringhe a stringa JSON nel formato di storage
      const formattedData = {
        ...data,
        jobTypeId: parseInt(data.jobTypeId),
        jobTypeIds: JSON.stringify(data.jobTypeIds),
        sectorIds: JSON.stringify(data.sectorIds),
        // Convert numeric fields to strings for decimal database fields
        defaultDuration: data.defaultDuration?.toString() || null,
        defaultRate: data.defaultRate?.toString() || null,
        defaultCost: data.defaultCost?.toString() || null,
      };
      return apiRequest("PUT", `/api/activities/${id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: t("activities.activityUpdated"),
        description: t("activities.activityUpdatedDescription"),
      });
      setIsDialogOpen(false);
      setEditingActivity(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("activities.errorUpdatingActivity")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un'attività
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: t("activities.activityDeleted"),
        description: t("activities.activityDeletedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("activities.errorDeletingActivity")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      name: "",
      description: "",
      implementationNotes: "",
      jobTypeId: "",
      jobTypeIds: [],
      sectorIds: [],
      isDefault: false,
      defaultDuration: null,
      defaultRate: null,
      defaultCost: null,
    });
    setEditingActivity(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (activity: any) => {
    console.log("Opening edit dialog for activity:", activity);
    
    // Converti i jobTypeIds e sectorIds da stringa JSON a array
    let jobTypeIds: string[] = [];
    let sectorIds: string[] = [];
    
    try {
      if (activity.jobTypeIds) {
        jobTypeIds = JSON.parse(activity.jobTypeIds);
        console.log("Parsed jobTypeIds:", jobTypeIds);
      }
      if (activity.sectorIds) {
        sectorIds = JSON.parse(activity.sectorIds);
        console.log("Parsed sectorIds:", sectorIds);
      }
    } catch (e) {
      console.error("Errore nel parsing dei dati:", e);
    }

    const formData = {
      name: activity.name,
      description: activity.description || "",
      implementationNotes: activity.implementationNotes || "",
      jobTypeId: activity.jobTypeId ? activity.jobTypeId.toString() : "",
      jobTypeIds: jobTypeIds.map(id => id.toString()),
      sectorIds: sectorIds.map(id => id.toString()),
      isDefault: activity.isDefault === null ? false : activity.isDefault,
      defaultDuration: activity.defaultDuration,
      defaultRate: activity.defaultRate,
      defaultCost: activity.defaultCost,
    };
    
    console.log("Setting form data:", formData);
    form.reset(formData);
    setEditingActivity(activity);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: ActivityFormValues) => {
    console.log("Form submitted with data:", data);
    
    // Assicuriamoci che il tipo di lavoro principale sia incluso nei tipi di lavoro selezionati
    if (!data.jobTypeIds.includes(data.jobTypeId)) {
      const updatedJobTypeIds = [...data.jobTypeIds, data.jobTypeId];
      form.setValue("jobTypeIds", updatedJobTypeIds);
      data.jobTypeIds = updatedJobTypeIds;
    }
    
    console.log("Final data being sent:", data);
    
    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un'attività
  const handleDelete = (id: number) => {
    if (confirm(t("activities.confirmDeleteActivity"))) {
      deleteMutation.mutate(id);
    }
  };

  // Funzione per ottenere il nome di un tipo di lavoro da un ID
  const getJobTypeName = (id: number) => {
    if (!Array.isArray(jobTypes)) return `${t('admin.activities.table.jobTypes')} #${id}`;
    const jobType = jobTypes.find((jt: any) => jt.id === id);
    return jobType ? jobType.name : `${t('admin.activities.table.jobTypes')} #${id}`;
  };

  // Funzione per visualizzare i badge dei tipi di lavoro
  const getJobTypeBadges = (jobTypeIds: string) => {
    if (!jobTypeIds || !Array.isArray(jobTypes)) return null;
    
    try {
      const ids = JSON.parse(jobTypeIds);
      if (!Array.isArray(ids) || ids.length === 0) return null;
      
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id: string) => {
            const jobType = jobTypes.find((jt: any) => jt.id === parseInt(id));
            return jobType ? (
              <Badge key={id} variant="outline" className="text-xs">
                {jobType.name}
              </Badge>
            ) : null;
          })}
        </div>
      );
    } catch (e) {
      console.error("Errore nella visualizzazione dei tipi di lavoro:", e);
      return null;
    }
  };

  // Funzione per visualizzare i badge dei settori
  const getSectorBadges = (sectorIds: string) => {
    console.log("getSectorBadges called with:", sectorIds, "sectors:", sectors);
    
    if (!sectorIds || !Array.isArray(sectors)) {
      console.log("No sectorIds or sectors array, returning null");
      return null;
    }
    
    try {
      const ids = JSON.parse(sectorIds);
      console.log("Parsed sector IDs:", ids);
      
      if (!Array.isArray(ids) || ids.length === 0) {
        console.log("No valid sector IDs, returning null");
        return null;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id: string) => {
            const sector = sectors.find((s: any) => s.id === parseInt(id));
            console.log(`Looking for sector with id ${id}, found:`, sector);
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

  // Effetto per sincronizzare il tipo di lavoro principale con i tipi di lavoro selezionati
  useEffect(() => {
    const jobTypeId = form.watch("jobTypeId");
    if (jobTypeId) {
      const jobTypeIds = form.watch("jobTypeIds");
      if (!jobTypeIds.includes(jobTypeId)) {
        form.setValue("jobTypeIds", [...jobTypeIds, jobTypeId]);
      }
    }
  }, [form.watch("jobTypeId")]);

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
            {t('activities.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('activities.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('activities.newActivity')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('activities.title')}</CardTitle>
          <CardDescription>
            {t('activities.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="flex justify-center p-6">
              <p>{t('activities.loadingActivities')}</p>
            </div>
          ) : Array.isArray(activities) && activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-gray-500 mb-4">{t('activities.noActivitiesAvailable')}</p>
              <Button onClick={openCreateDialog} variant="outline" className="flex items-center gap-2">
                <Plus size={16} />
                {t('activities.createFirstActivity')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activities.table.name')}</TableHead>
                  <TableHead>{t('activities.table.mainJobType')}</TableHead>
                  <TableHead>{t('activities.table.jobTypes')}</TableHead>
                  <TableHead>{t('activities.table.sectors')}</TableHead>
                  <TableHead>{t('activities.table.duration')}</TableHead>
                  <TableHead>{t('activities.table.isDefault')}</TableHead>
                  <TableHead className="text-right">{t('activities.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(activities) && activities.map((activity: any) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell>{getJobTypeName(activity.jobTypeId)}</TableCell>
                    <TableCell>
                      {getJobTypeBadges(activity.jobTypeIds) || t('admin.activities.table.noJobTypes')}
                    </TableCell>
                    <TableCell>
                      {getSectorBadges(activity.sectorIds) || t('admin.activities.table.noSectors')}
                    </TableCell>
                    <TableCell>
                      {activity.defaultDuration ? `${activity.defaultDuration} ${t('admin.activities.table.hours')}` : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${activity.isDefault ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                        {activity.isDefault ? t('admin.activities.table.yes') : t('admin.activities.table.no')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(activity)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(activity.id)}
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

      {/* Dialog per creare/modificare un'attività */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? t('activities.editActivity') : t('activities.newActivity')}
            </DialogTitle>
            <DialogDescription>
              {editingActivity 
                ? t('activities.editActivityDescription')
                : t('activities.newActivityDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.form.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('activities.form.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jobTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('activities.form.mainJobType')}</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">{t('activities.form.mainJobTypePlaceholder')}</option>
                          {jobTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('activities.form.defaultDuration')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder={t('activities.form.defaultDurationPlaceholder')}
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('activities.form.defaultRate')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('activities.form.defaultRatePlaceholder')}
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('activities.form.defaultCost')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('activities.form.defaultCostPlaceholder')}
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="jobTypeIds"
                render={({ field }) => {
                  console.log("Rendering job types field with:", {
                    fieldValue: field.value,
                    jobTypeOptions: jobTypeOptions,
                    jobTypesData: jobTypes
                  });
                  return (
                    <FormItem>
                      <FormLabel>{t('activities.form.jobTypes')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={jobTypeOptions}
                          placeholder={t('activities.form.jobTypesPlaceholder')}
                          selected={field.value}
                          onChange={field.onChange}
                          onPrimaryChange={(primary) => form.setValue("jobTypeId", primary)}
                          primaryValue={form.watch("jobTypeId")}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="sectorIds"
                render={({ field }) => {
                  console.log("Rendering sectors field with:", {
                    fieldValue: field.value,
                    sectorOptions: sectorOptions,
                    sectorsData: sectors
                  });
                  return (
                    <FormItem>
                      <FormLabel>{t('activities.form.sectors')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={sectorOptions}
                          placeholder={t('activities.form.sectorsPlaceholder')}
                          selected={field.value}
                          onChange={field.onChange}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('activities.form.descriptionPlaceholder')}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="implementationNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.form.implementationNotes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('activities.form.implementationNotesPlaceholder')}
                        {...field}
                        value={field.value || ""}
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
                      <FormLabel>{t('activities.form.isDefault')}</FormLabel>
                      <div className="text-sm text-gray-500">
                        {t('activities.form.isDefaultDescription')}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('activities.form.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? t('admin.activities.form.save')
                    : editingActivity
                    ? t('activities.form.update')
                    : t('activities.form.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}