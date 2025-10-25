import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Download, Printer, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

interface ReportChartCardProps {
  title: string;
  subtitle?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'radar' | 'scatter';
  children: React.ReactNode;
  className?: string;
}

export default function ReportChartCard({ 
  title, 
  subtitle, 
  chartType = 'line',
  children,
  className
}: ReportChartCardProps) {
  
  // Funzione di esempio per simulare l'esportazione del grafico
  const handleExport = (format: string) => {
    console.log(`Esportazione grafico in formato ${format}...`);
    // Qui andrà implementata la logica di esportazione effettiva
  };
  
  // Funzione di esempio per la stampa
  const handlePrint = () => {
    console.log('Invio del grafico alla stampante...');
    // Qui andrà implementata la logica di stampa effettiva
  };
  
  return (
    <Card className={`mb-6 ${className || ''}`}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium mb-1">{title}</CardTitle>
          {subtitle && (
            <CardDescription className="text-sm text-gray-500">{subtitle}</CardDescription>
          )}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Esporta Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Esporta PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('png')}>
                <Download className="h-4 w-4 mr-2" />
                Esporta Immagine
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: chartType === 'pie' ? '300px' : '400px' }}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}