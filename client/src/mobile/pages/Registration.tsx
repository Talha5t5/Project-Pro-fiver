import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart2, Calendar, Filter, Search, Plus } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export default function Registration() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Interfacce per tipizzare i dati
  interface Job {
    id: number;
    title: string;
    client: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    date: string;
    type: string;
    jobType: string;
  }
  
  interface JobType {
    id: number;
    name: string;
  }

  // Query per ottenere i lavori
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/mobile/all-jobs"],
    queryFn: async () => {
      const response = await mobileApiCall('GET', '/all-jobs');
      if (!response.ok) throw new Error('Errore nel recuperare i lavori');
      return response.json();
    }
  });

  // Query per ottenere i tipi di lavoro
  const { data: jobTypes } = useQuery<JobType[]>({
    queryKey: ["/api/jobtypes"],
  });

  // Filtriamo i lavori
  const filteredJobs = jobs?.filter((job: any) => {
    let matchesSearch = true;
    let matchesJobType = true;
    let matchesStatus = true;

    if (searchTerm) {
      matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     job.client.toLowerCase().includes(searchTerm.toLowerCase());
    }

    if (jobTypeFilter !== "all") {
      matchesJobType = job.type === jobTypeFilter;
    }

    if (statusFilter !== "all") {
      matchesStatus = job.status === statusFilter;
    }

    return matchesSearch && matchesJobType && matchesStatus;
  });

  return (
    <MobileLayout title={t('mobile.navigation.registration')}>
      <div className="p-4">
        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder={t('mobile.jobs.search.placeholder')}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <div className="flex-1 min-w-[120px]">
            <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('mobile.jobs.form.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mobile.jobs.filter.allTypes')}</SelectItem>
                {jobTypes?.map((type: any) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[120px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('mobile.jobs.form.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mobile.jobs.filter.allStatuses')}</SelectItem>
                <SelectItem value="planned">{t('mobile.jobs.status.scheduled')}</SelectItem>
                <SelectItem value="in_progress">{t('mobile.jobs.status.in_progress')}</SelectItem>
                <SelectItem value="completed">{t('mobile.jobs.status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('mobile.jobs.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" className="flex-shrink-0 gap-1">
            <Calendar size={16} />
            <span>{t('mobile.jobs.filter.period')}</span>
          </Button>
        </div>
        
        {/* Jobs list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">{t('mobile.common.loading')}</div>
          ) : filteredJobs?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('mobile.jobs.noJobsFound')}
            </div>
          ) : (
            filteredJobs?.map((job: any) => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    job.status === 'planned' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {job.status === 'completed' ? t('mobile.jobs.status.completed') :
                     job.status === 'in_progress' ? t('mobile.jobs.status.in_progress') :
                     job.status === 'planned' ? t('mobile.jobs.status.scheduled') :
                     t('mobile.jobs.status.cancelled')}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3">{job.client}</p>
                
                <div className="flex flex-wrap gap-y-1 mb-3 text-sm text-gray-500">
                  <div className="w-1/2 flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{job.date}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {job.jobType}
                  </span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-600/90 text-white">
                    {t('mobile.jobs.register')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Add button (fixed) */}
        <button className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </MobileLayout>
  );
}