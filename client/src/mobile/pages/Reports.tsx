import React from "react";
import MobileLayout from "../components/MobileLayout";
import { Card, CardContent } from "../../components/ui/card";
import { 
  BarChart3, 
  Clock, 
  DollarSign, 
  LineChart 
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const reports = [
    {
      id: "performance",
      title: t('mobile.reports.performanceReport.title'),
      description: t('mobile.reports.performanceReport.title'),
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
      path: "/mobile/reports/performance"
    },
    {
      id: "time",
      title: t('mobile.reports.timeReport.title'),
      description: t('mobile.reports.timeReport.title'),
      icon: <Clock className="h-12 w-12 text-primary" />,
      path: "/mobile/reports/time"
    },
    {
      id: "financial",
      title: t('mobile.reports.financialReport.title'),
      description: t('mobile.reports.financialReport.title'),
      icon: <DollarSign className="h-12 w-12 text-primary" />,
      path: "/mobile/reports/financial"
    },
    {
      id: "efficiency",
      title: t('mobile.reports.efficiencyReport.title'),
      description: t('mobile.reports.efficiencyReport.title'),
      icon: <LineChart className="h-12 w-12 text-primary" />,
      path: "/mobile/reports/efficiency"
    }
  ];

  const handleReportClick = (path: string) => {
    setLocation(path);
  };

  return (
    <MobileLayout title={t('mobile.reports.title')} showBackButton={false}>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card 
              key={report.id} 
              className="hover:border-primary cursor-pointer transition-all"
              onClick={() => handleReportClick(report.path)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="mb-3 mt-2">{report.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{report.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}