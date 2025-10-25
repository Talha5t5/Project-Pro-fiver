import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/use-toast";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
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
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../../../components/ui/language-selector";
import { Badge } from "../../../components/ui/badge";

// Schema per la validazione del form
const sectorSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

type SectorFormValues = z.infer<typeof sectorSchema>;

export default function SectorsPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);

  // Query per ottenere i settori
  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ["/api/sectors"],
    queryFn: () => apiRequest("GET", "/api/sectors").then(res => res.json()).catch(() => []),
  });

  // Definiamo il form con React Hook Form
  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Mutation per creare un nuovo settore
  const createMutation = useMutation({
    mutationFn: (data: SectorFormValues) => apiRequest("POST", "/api/sectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: t("sectors.sectorCreated"),
        description: t("sectors.sectorCreatedDescription"),
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("sectors.errorCreatingSector")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un settore esistente
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SectorFormValues }) => 
      apiRequest("PATCH", `/api/sectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: t("sectors.sectorUpdated"),
        description: t("sectors.sectorUpdatedDescription"),
      });
      setIsDialogOpen(false);
      setEditingSector(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("sectors.errorUpdatingSector")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un settore
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: t("sectors.sectorDeleted"),
        description: t("sectors.sectorDeletedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("admin.common.error"),
        description: `${t("sectors.errorDeletingSector")}: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Funzione per aprire il dialog di creazione
  const openCreateDialog = () => {
    form.reset({
      name: "",
      description: "",
      isActive: true,
    });
    setEditingSector(null);
    setIsDialogOpen(true);
  };

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (sector: any) => {
    form.reset({
      name: sector.name,
      description: sector.description || "",
      isActive: sector.isActive === null ? true : sector.isActive,
    });
    setEditingSector(sector);
    setIsDialogOpen(true);
  };

  // Gestione del submit del form
  const onSubmit = (data: SectorFormValues) => {
    if (editingSector) {
      updateMutation.mutate({ id: editingSector.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Funzione per eliminare un settore
  const handleDelete = (id: number) => {
    if (confirm(t("sectors.confirmDeleteSector"))) {
      deleteMutation.mutate(id);
    }
  };

  // Gestione dell'apertura del dialog per la modifica
  const handleEdit = (sector: any) => {
    setEditingSector(sector);
    form.reset({
      name: sector.name,
      description: sector.description || "",
      isActive: sector.isActive,
    });
    setIsDialogOpen(true);
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
            {t('sectors.backToSettings')}
          </Button>
          <h1 className="text-3xl font-bold">{t('sectors.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t('sectors.newSector')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sectors.title')}</CardTitle>
          <CardDescription>
            {t('sectors.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('sectors.loadingSectors')}</p>
          ) : sectors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">{t('sectors.noSectorsAvailable')}</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                {t('sectors.createFirstSector')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sectors.table.name')}</TableHead>
                  <TableHead>{t('sectors.table.sectorDescription')}</TableHead>
                  <TableHead>{t('sectors.table.sectorStatus')}</TableHead>
                  <TableHead>{t('sectors.table.sectorClients')}</TableHead>
                  <TableHead className="text-right">{t('sectors.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((sector: any) => (
                  <TableRow key={sector.id}>
                    <TableCell className="font-medium">{sector.name}</TableCell>
                    <TableCell>{sector.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={sector.isActive ? "default" : "secondary"}>
                        {sector.isActive ? t('sectors.table.active') : t('sectors.table.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>0</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(sector)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sector.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSector ? t('sectors.editSector') : t('sectors.newSector')}
            </DialogTitle>
            <DialogDescription>
              {editingSector 
                ? t('sectors.editSectorDescription')
                : t('sectors.newSectorDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sectors.form.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('sectors.form.namePlaceholder')} {...field} />
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
                    <FormLabel>{t('sectors.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('sectors.form.descriptionPlaceholder')}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t('sectors.form.isActive')}</FormLabel>
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
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('sectors.form.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSector 
                    ? t('sectors.form.update')
                    : t('sectors.form.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}