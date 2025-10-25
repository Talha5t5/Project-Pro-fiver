import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { PromotionalSpot } from "@shared/schema";

interface PromoSpotListProps {
  onEdit: (spot: PromotionalSpot) => void;
}

export default function PromoSpotList({ onEdit }: PromoSpotListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSpot, setSelectedSpot] = useState<PromotionalSpot | null>(null);

  // Carica gli spot promozionali
  const { data: spots, isLoading, error } = useQuery({
    queryKey: ['/api/admin/promotional-spots'],
    queryFn: async () => {
      const res = await fetch('/api/admin/promotional-spots');
      if (!res.ok) {
        throw new Error(t('admin.settings.loadingPromotionalSpots'));
      }
      return res.json() as Promise<PromotionalSpot[]>;
    }
  });

  // Mutation per eliminare uno spot
  const deleteSpotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/promotional-spots/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t('admin.settings.promotionalSpotDeleted'),
        description: t('admin.settings.promotionalSpotDeletedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotional-spots'] });
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.spotError'),
        description: `${t('admin.settings.errorDuringDeletion')} ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation per cambiare lo stato di uno spot
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'active' | 'inactive' }) => {
      await apiRequest('PATCH', `/api/admin/promotional-spots/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: t('admin.settings.statusUpdated'),
        description: t('admin.settings.statusUpdatedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotional-spots'] });
    },
    onError: (error) => {
      toast({
        title: t('admin.settings.spotError'),
        description: `${t('admin.settings.errorDuringStatusUpdate')} ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm(t('admin.settings.confirmDelete'))) {
      deleteSpotMutation.mutate(id);
    }
  };

  const handleToggleStatus = (spot: PromotionalSpot) => {
    const newStatus = spot.status === 'active' ? 'inactive' : 'active';
    toggleStatusMutation.mutate({ id: spot.id, status: newStatus });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">{t('admin.settings.loadingPromotionalSpots')}</div>;
  }

  if (error) {
    return <div className="text-red-500 p-8">{t('admin.settings.spotError')}: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.settings.promotionalSpotManagement')}</h1>
        <Button className="flex items-center gap-2" onClick={() => onEdit(undefined)}>
          <Plus size={16} />
          <span>{t('admin.settings.newSpot')}</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.settings.spotList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {spots && spots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.settings.spotTitle')}</TableHead>
                  <TableHead>{t('admin.settings.spotPosition')}</TableHead>
                  <TableHead>{t('admin.settings.spotValidity')}</TableHead>
                  <TableHead>{t('admin.settings.spotStatus')}</TableHead>
                  <TableHead>{t('admin.settings.spotCreationDate')}</TableHead>
                  <TableHead className="text-right">{t('admin.settings.spotActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spots.map((spot) => (
                  <TableRow key={spot.id}>
                    <TableCell className="font-medium">{spot.title}</TableCell>
                    <TableCell>{spot.position}</TableCell>
                    <TableCell>
                      {(spot.startDate || spot.endDate) ? (
                        <div className="flex flex-col gap-1 text-xs">
                          {spot.startDate && (
                            <div>{t('admin.settings.spotFrom')}: {format(new Date(spot.startDate), "dd/MM/yyyy")}</div>
                          )}
                          {spot.endDate && (
                            <div>{t('admin.settings.spotTo')}: {format(new Date(spot.endDate), "dd/MM/yyyy")}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">{t('admin.settings.spotNoDateSet')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={spot.status === 'active' ? "success" : "secondary"}>
                        {spot.status === 'active' ? t('admin.settings.spotActive') : t('admin.settings.spotInactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {spot.createdAt && format(new Date(spot.createdAt), "dd/MM/yyyy", { locale: it })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleStatus(spot)}
                          title={spot.status === 'active' ? t('admin.settings.spotDeactivate') : t('admin.settings.spotActivate')}
                        >
                          {spot.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(spot)}
                          title={t('admin.settings.spotEdit')}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(spot.id)}
                          title={t('admin.settings.spotDelete')}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('admin.settings.noPromotionalSpotsAvailable')}</p>
              <Button className="mt-4" onClick={() => onEdit(undefined)}>{t('admin.settings.createFirstSpot')}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}