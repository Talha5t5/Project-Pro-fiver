import React from 'react';
import { Card, CardContent } from "../../../components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "../../../lib/utils";

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  sign?: string;
  trend?: number;
  trendLabel?: string;
  status?: "positive" | "negative" | "neutral";
  className?: string;
}

export default function DashboardMetricCard({ 
  title, 
  value, 
  icon, 
  sign = "",
  trend, 
  trendLabel,
  status = "neutral",
  className
}: DashboardMetricCardProps) {
  
  // Determina se il trend è positivo/negativo/neutro
  const getTrendDisplay = () => {
    if (trend === undefined) return null;
    
    let trendIcon;
    let trendClass;
    
    if (status === "positive") {
      trendIcon = <TrendingUp className="h-4 w-4" />;
      trendClass = "text-green-600";
    } else if (status === "negative") {
      trendIcon = <TrendingDown className="h-4 w-4" />;
      trendClass = "text-red-600";
    } else {
      trendIcon = <Minus className="h-4 w-4" />;
      trendClass = "text-gray-500";
    }
    
    return (
      <div className={cn("flex items-center gap-1 text-xs font-medium", trendClass)}>
        {trendIcon}
        {trend > 0 ? "+" : ""}{trend}%
        {trendLabel && <span className="text-gray-500 ml-1">vs {trendLabel}</span>}
      </div>
    );
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          {icon && (
            <div className="bg-blue-600/10 p-2 rounded-full">
              {icon}
            </div>
          )}
        </div>
        
        <div className="flex items-baseline">
          {sign && <span className="text-lg mr-1">{sign}</span>}
          <span className="text-2xl font-bold">{value}</span>
        </div>
        
        {getTrendDisplay()}
      </CardContent>
    </Card>
  );
}