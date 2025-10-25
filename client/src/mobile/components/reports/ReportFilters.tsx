import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, CalendarDays, ChevronDown, Filter } from "lucide-react";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { Label } from "../../../components/ui/label";
import { Card, CardContent } from "../../../components/ui/card";

export interface ReportFilterOptions {
  year?: number;
  month?: number;
  quarter?: number;
  jobType?: string;
  activityType?: string;
  clientType?: string;
  client?: string;
  collaborator?: string;
  startDate?: Date;
  endDate?: Date;
  timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface ReportFiltersProps {
  onApplyFilters: (filters: ReportFilterOptions) => void;
}

export default function ReportFilters({ onApplyFilters }: ReportFiltersProps) {
  // Stato dei filtri
  const [filters, setFilters] = useState<ReportFilterOptions>({
    timeframe: 'month'
  });

  // Stato per il DateRange
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  // Carica le opzioni di filtro disponibili dal server
  const { data: filterOptions = {
    jobTypes: [],
    activities: [],
    clientTypes: [],
    clients: [],
    collaborators: []
  } } = useQuery({
    queryKey: ['/api/filter-options'],
    refetchOnWindowFocus: false,
  }) as { data: any };

  // Gestisce il cambio di periodo
  const handleTimeframeChange = (value: string) => {
    const resetFilters: ReportFilterOptions = {};
    
    // Imposta il timeframe selezionato
    if (value === 'day' || value === 'week' || value === 'month' || value === 'quarter' || value === 'year') {
      resetFilters.timeframe = value;
    }
    
    // Reset delle date personalizzate quando si seleziona un periodo predefinito
    if (value !== 'custom') {
      resetFilters.startDate = undefined;
      resetFilters.endDate = undefined;
    }
    
    // Imposta i filtri resettando quelli non pertinenti
    setFilters(prev => ({
      ...prev,
      ...resetFilters,
      year: value === 'year' ? new Date().getFullYear() : undefined,
      month: value === 'month' ? new Date().getMonth() + 1 : undefined,
      quarter: value === 'quarter' ? Math.floor(new Date().getMonth() / 3) + 1 : undefined,
    }));
  };

  // Gestisce la selezione delle date personalizzate
  const handleDateRangeSelect = (range: { from: Date; to: Date } | undefined) => {
    setDateRange(range);
    
    if (range && range.from && range.to) {
      setFilters(prev => ({
        ...prev,
        timeframe: 'custom',
        startDate: range.from,
        endDate: range.to
      }));
    }
  };

  // Formatta il range di date per la visualizzazione
  const formatDateRange = () => {
    if (filters.startDate && filters.endDate) {
      return `${format(filters.startDate, 'dd/MM/yyyy')} - ${format(filters.endDate, 'dd/MM/yyyy')}`;
    }
    return '';
  };

  // Gestisce il cambio di altri filtri
  const handleFilterChange = (key: keyof ReportFilterOptions, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Applica i filtri al submit
  const handleApplyFilters = () => {
    onApplyFilters(filters);
  };

  // Effetto per applicare i filtri di default all'avvio
  useEffect(() => {
    handleApplyFilters();
  }, []);

  return (
    <div>
      {/* Card per i filtri rapidi/principali */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Selezione periodo */}
            <div className="flex-grow">
              <Select 
                value={filters.timeframe || 'month'} 
                onValueChange={handleTimeframeChange}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Oggi</SelectItem>
                  <SelectItem value="week">Questa settimana</SelectItem>
                  <SelectItem value="month">Questo mese</SelectItem>
                  <SelectItem value="quarter">Questo trimestre</SelectItem>
                  <SelectItem value="year">Quest'anno</SelectItem>
                  <SelectItem value="custom">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selezione date personalizzate (visibile solo se timeframe = custom) */}
            {filters.timeframe === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-start text-left font-normal w-full sm:w-auto"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDateRange() || "Seleziona date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    locale={it}
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateRangeSelect}
                    className="border rounded-md"
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Pulsante per altri filtri */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtri
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtri report</SheetTitle>
                  <SheetDescription>
                    Personalizza il tuo report con i filtri disponibili
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Tipo di lavoro */}
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Tipo di lavoro</Label>
                    <Select 
                      value={filters.jobType} 
                      onValueChange={(value) => handleFilterChange('jobType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo lavoro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti</SelectItem>
                        {filterOptions.jobTypes?.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tipo di attività */}
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Tipo di attività</Label>
                    <Select 
                      value={filters.activityType} 
                      onValueChange={(value) => handleFilterChange('activityType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo attività" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutte</SelectItem>
                        {filterOptions.activities?.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tipo di cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="clientType">Tipo di cliente</Label>
                    <Select 
                      value={filters.clientType} 
                      onValueChange={(value) => handleFilterChange('clientType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti</SelectItem>
                        {filterOptions.clientTypes?.map((type: any) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Cliente specifico */}
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente</Label>
                    <Select 
                      value={filters.client} 
                      onValueChange={(value) => handleFilterChange('client', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti</SelectItem>
                        {filterOptions.clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Collaboratore */}
                  <div className="space-y-2">
                    <Label htmlFor="collaborator">Collaboratore</Label>
                    <Select 
                      value={filters.collaborator} 
                      onValueChange={(value) => handleFilterChange('collaborator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona collaboratore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti</SelectItem>
                        {filterOptions.collaborators?.map((collaborator: any) => (
                          <SelectItem key={collaborator.id} value={collaborator.id.toString()}>
                            {collaborator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <SheetFooter className="mt-8">
                  <SheetClose asChild>
                    <Button 
                      type="button" 
                      onClick={handleApplyFilters}
                    >
                      Applica filtri
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Tags per i filtri attivi */}
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.jobType && filterOptions.jobTypes?.find((t: any) => t.id.toString() === filters.jobType) && (
              <div className="bg-blue-600/10 text-primary text-xs py-1 px-2 rounded-full">
                Tipo lavoro: {filterOptions.jobTypes.find((t: any) => t.id.toString() === filters.jobType).name}
              </div>
            )}
            
            {filters.activityType && filterOptions.activities?.find((t: any) => t.id.toString() === filters.activityType) && (
              <div className="bg-blue-600/10 text-primary text-xs py-1 px-2 rounded-full">
                Attività: {filterOptions.activities.find((t: any) => t.id.toString() === filters.activityType).name}
              </div>
            )}
            
            {filters.clientType && filterOptions.clientTypes?.find((t: any) => t.value === filters.clientType) && (
              <div className="bg-blue-600/10 text-primary text-xs py-1 px-2 rounded-full">
                Tipo cliente: {filterOptions.clientTypes.find((t: any) => t.value === filters.clientType).label}
              </div>
            )}
            
            {filters.client && filterOptions.clients?.find((c: any) => c.id.toString() === filters.client) && (
              <div className="bg-blue-600/10 text-primary text-xs py-1 px-2 rounded-full">
                Cliente: {filterOptions.clients.find((c: any) => c.id.toString() === filters.client).name}
              </div>
            )}
            
            {filters.collaborator && filterOptions.collaborators?.find((c: any) => c.id.toString() === filters.collaborator) && (
              <div className="bg-blue-600/10 text-primary text-xs py-1 px-2 rounded-full">
                Collaboratore: {filterOptions.collaborators.find((c: any) => c.id.toString() === filters.collaborator).name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}