import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";

interface PerformanceGaugeProps {
  title: string;
  value: number;
  indicator: "red" | "yellow" | "green";
  description?: string;
}

export default function PerformanceGauge({
  title,
  value,
  indicator,
  description
}: PerformanceGaugeProps) {
  
  // Determine color based on indicator
  const getColor = () => {
    switch (indicator) {
      case "red": return "#ef4444"; // Red
      case "yellow": return "#f59e0b"; // Amber
      case "green": return "#10b981"; // Green
      default: return "#d1d5db"; // Gray
    }
  };
  
  // Calculate the proportion for gauge arc
  const calculateRotation = () => {
    // Ensure value is between 0 and 100
    const safeValue = Math.max(0, Math.min(100, value));
    // Convert to a rotation between -90 and 90 degrees
    return -90 + (safeValue * 1.8);
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[2/1] flex items-center justify-center">
          {/* Background gauge */}
          <div className="absolute h-full w-full overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 h-full bg-gray-100 rounded-t-full"
              style={{clipPath: 'polygon(0% 50%, 100% 50%, 100% 0%, 0% 0%)'}}
            />
          </div>
          
          {/* Gauge needle */}
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 origin-bottom"
            style={{
              height: '95%',
              width: '2px',
              backgroundColor: getColor(),
              transform: `translateX(-50%) rotate(${calculateRotation()}deg)`
            }}
          >
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full"
              style={{backgroundColor: getColor()}}
            />
          </div>
          
          {/* Indicator values */}
          <div className="absolute bottom-0 w-full flex justify-between px-4 text-xs text-gray-500">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
          
          {/* Value display */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-2xl font-bold">
            {value}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}