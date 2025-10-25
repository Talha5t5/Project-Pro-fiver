import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Calendar, Clock, MapPin, User, Briefcase, AlertCircle, CheckCircle, Pause, Play } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

// Job type definition
type Job = {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  clientId: number;
  clientName?: string;
  startDate: Date;
  endDate: Date | null;
  estimatedDuration: number | null; // in hours
  actualDuration: number | null; // in hours
  location: string | null;
  assignedTo: string | null;
  materials: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Form validation schema
const jobSchema = z.object({
  title: z.string().min(1, "Titolo lavoro richiesto"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled", "on_hold"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  clientId: z.number().min(1, "Cliente richiesto"),
  startDate: z.string().min(1, "Data inizio richiesta"),
  endDate: z.string().optional(),
  estimatedDuration: z.number().min(0, "Durata stimata non può essere negativa").optional(),
  location: z.string().optional(),
  assignedTo: z.string().optional(),
  materials: z.string().optional(),
  cost: z.number().min(0, "Costo non può essere negativo").optional(),
  notes: z.string().optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function JobsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form setup
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      clientId: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      estimatedDuration: 0,
      location: "",
      assignedTo: "",
      materials: "",
      cost: 0,
      notes: "",
    },
  });

  // Fetch jobs data
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs").then(res => res.json()),
    enabled: true,
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then(res => res.json()),
    enabled: true,
  });

     // Create job mutation
   const createJobMutation = useMutation({
     mutationFn: (data: JobFormData) => 
       apiRequest("POST", "/api/jobs", data).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
       toast({
         title: t('jobs.messages.created'),
         description: t('jobs.messages.created'),
       });
       setIsCreateDialogOpen(false);
       form.reset();
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('jobs.messages.createError'),
         variant: "destructive",
       });
     },
   });

     // Update job mutation
   const updateJobMutation = useMutation({
     mutationFn: ({ id, data }: { id: number; data: JobFormData }) =>
       apiRequest("PUT", `/api/jobs/${id}`, data).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
       toast({
         title: t('jobs.messages.updated'),
         description: t('jobs.messages.updated'),
       });
       setEditingJob(null);
       form.reset();
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('jobs.messages.updateError'),
         variant: "destructive",
       });
     },
   });

   // Delete job mutation
   const deleteJobMutation = useMutation({
     mutationFn: (id: number) =>
       apiRequest("DELETE", `/api/jobs/${id}`).then(res => res.json()),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
       toast({
         title: t('jobs.messages.deleted'),
         description: t('jobs.messages.deleted'),
       });
     },
     onError: (error) => {
       toast({
         title: t('common.error'),
         description: t('jobs.messages.deleteError'),
         variant: "destructive",
       });
     },
   });

  // Handle form submission
  const onSubmit = (data: JobFormData) => {
    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, data });
    } else {
      createJobMutation.mutate(data);
    }
  };

  // Handle edit job
  const handleEdit = (job: Job) => {
    setEditingJob(job);
    form.reset({
      title: job.title,
      description: job.description || "",
      status: job.status,
      priority: job.priority,
      clientId: job.clientId,
      startDate: new Date(job.startDate).toISOString().split('T')[0],
      endDate: job.endDate ? new Date(job.endDate).toISOString().split('T')[0] : "",
      estimatedDuration: job.estimatedDuration || 0,
      location: job.location || "",
      assignedTo: job.assignedTo || "",
      materials: job.materials || "",
      cost: job.cost || 0,
      notes: job.notes || "",
    });
  };

     // Handle delete job
   const handleDelete = (id: number) => {
     if (confirm(t('jobs.actions.deleteConfirm'))) {
       deleteJobMutation.mutate(id);
     }
   };

  // Filter jobs based on search term and filters
  const filteredJobs = jobs.filter((job: Job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

     // Get status info
   const getStatusInfo = (status: string) => {
     switch (status) {
       case "pending":
         return { icon: Clock, label: t('jobs.statuses.pending'), color: "bg-yellow-100 text-yellow-800" };
       case "in_progress":
         return { icon: Play, label: t('jobs.statuses.in_progress'), color: "bg-blue-100 text-blue-800" };
       case "completed":
         return { icon: CheckCircle, label: t('jobs.statuses.completed'), color: "bg-green-100 text-green-800" };
       case "cancelled":
         return { icon: AlertCircle, label: t('jobs.statuses.cancelled'), color: "bg-red-100 text-red-800" };
       case "on_hold":
         return { icon: Pause, label: t('jobs.statuses.on_hold'), color: "bg-gray-100 text-gray-800" };
       default:
         return { icon: Clock, label: status, color: "bg-gray-100 text-gray-800" };
     }
   };

   // Get priority info
   const getPriorityInfo = (priority: string) => {
     switch (priority) {
       case "low":
         return { label: t('jobs.priorities.low'), color: "bg-gray-100 text-gray-800" };
       case "medium":
         return { label: t('jobs.priorities.medium'), color: "bg-blue-100 text-blue-800" };
       case "high":
         return { label: t('jobs.priorities.high'), color: "bg-orange-100 text-orange-800" };
       case "urgent":
         return { label: t('jobs.priorities.urgent'), color: "bg-red-100 text-red-800" };
       default:
         return { label: priority, color: "bg-gray-100 text-gray-800" };
     }
   };

     if (error) {
     return (
       <div className="p-6">
         <Card className="border-red-200 bg-red-50">
           <CardContent className="p-4">
             <p className="text-red-800">{t('jobs.error')}</p>
           </CardContent>
         </Card>
       </div>
     );
   }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('jobs.title')}</h1>
            <p className="text-gray-600">{t('jobs.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")}>
              {t('jobs.backToDashboard')}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('jobs.newJob')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingJob ? t('jobs.editJob') : t('jobs.newJob')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingJob 
                      ? t('jobs.form.editDescription')
                      : t('jobs.form.description')
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="title"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.jobTitle')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('jobs.form.jobTitlePlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="clientId"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.client')}</FormLabel>
                             <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                               <FormControl>
                                 <SelectTrigger>
                                   <SelectValue placeholder={t('jobs.form.selectClient')} />
                                 </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                                 {clients.map((client: any) => (
                                   <SelectItem key={client.id} value={client.id.toString()}>
                                     {client.name}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <FormField
                       control={form.control}
                       name="description"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('jobs.form.description')}</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder={t('jobs.form.descriptionPlaceholder')} 
                               className="min-h-[100px]"
                               {...field} 
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="status"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.status')}</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                               <FormControl>
                                 <SelectTrigger>
                                   <SelectValue placeholder={t('jobs.form.selectStatus')} />
                                 </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                                 <SelectItem value="pending">{t('jobs.statuses.pending')}</SelectItem>
                                 <SelectItem value="in_progress">{t('jobs.statuses.in_progress')}</SelectItem>
                                 <SelectItem value="completed">{t('jobs.statuses.completed')}</SelectItem>
                                 <SelectItem value="cancelled">{t('jobs.statuses.cancelled')}</SelectItem>
                                 <SelectItem value="on_hold">{t('jobs.statuses.on_hold')}</SelectItem>
                               </SelectContent>
                             </Select>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="priority"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.priority')}</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                               <FormControl>
                                 <SelectTrigger>
                                   <SelectValue placeholder={t('jobs.form.selectPriority')} />
                                 </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                                 <SelectItem value="low">{t('jobs.priorities.low')}</SelectItem>
                                 <SelectItem value="high">{t('jobs.priorities.high')}</SelectItem>
                                 <SelectItem value="medium">{t('jobs.priorities.medium')}</SelectItem>
                                 <SelectItem value="urgent">{t('jobs.priorities.urgent')}</SelectItem>
                               </SelectContent>
                             </Select>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="startDate"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.startDate')}</FormLabel>
                             <FormControl>
                               <Input type="date" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="endDate"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.endDate')}</FormLabel>
                             <FormControl>
                               <Input type="date" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="estimatedDuration"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.estimatedDuration')}</FormLabel>
                             <FormControl>
                               <Input 
                                 type="number" 
                                 placeholder={t('jobs.form.estimatedDurationPlaceholder')} 
                                 {...field}
                                 onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="cost"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.cost')}</FormLabel>
                             <FormControl>
                               <Input 
                                 type="number" 
                                 placeholder={t('jobs.form.costPlaceholder')} 
                                 {...field}
                                 onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                         name="location"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.location')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('jobs.form.locationPlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="assignedTo"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t('jobs.form.assignedTo')}</FormLabel>
                             <FormControl>
                               <Input placeholder={t('jobs.form.assignedToPlaceholder')} {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>

                                         <FormField
                       control={form.control}
                       name="materials"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('jobs.form.materials')}</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder={t('jobs.form.materialsPlaceholder')} 
                               className="min-h-[80px]"
                               {...field} 
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="notes"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('jobs.form.notes')}</FormLabel>
                           <FormControl>
                             <Textarea 
                               placeholder={t('jobs.form.notesPlaceholder')} 
                               className="min-h-[80px]"
                               {...field} 
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                                         <div className="flex justify-end space-x-2 pt-4">
                       <Button 
                         type="button" 
                         variant="outline" 
                         onClick={() => {
                           setIsCreateDialogOpen(false);
                           setEditingJob(null);
                           form.reset();
                         }}
                       >
                         {t('jobs.form.cancel')}
                       </Button>
                       <Button 
                         type="submit" 
                         disabled={createJobMutation.isPending || updateJobMutation.isPending}
                       >
                         {createJobMutation.isPending || updateJobMutation.isPending 
                           ? (editingJob ? t('jobs.form.updating') : t('jobs.form.creating'))
                           : editingJob ? t('jobs.form.save') : t('jobs.form.save')
                         }
                       </Button>
                     </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
                 {/* Search and Filters */}
         <Card className="mb-6">
           <CardContent className="p-4">
             <div className="flex flex-col md:flex-row gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                 <Input
                   placeholder={t('jobs.searchPlaceholder')}
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10"
                 />
               </div>
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger className="w-full md:w-40">
                   <SelectValue placeholder={t('jobs.filters.status')} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">{t('jobs.filters.allStatuses')}</SelectItem>
                   <SelectItem value="pending">{t('jobs.statuses.pending')}</SelectItem>
                   <SelectItem value="in_progress">{t('jobs.statuses.in_progress')}</SelectItem>
                   <SelectItem value="completed">{t('jobs.statuses.completed')}</SelectItem>
                   <SelectItem value="cancelled">{t('jobs.statuses.cancelled')}</SelectItem>
                   <SelectItem value="on_hold">{t('jobs.statuses.on_hold')}</SelectItem>
                 </SelectContent>
               </Select>
               <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                 <SelectTrigger className="w-full md:w-40">
                   <SelectValue placeholder={t('jobs.filters.priority')} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">{t('jobs.filters.allPriorities')}</SelectItem>
                   <SelectItem value="low">{t('jobs.priorities.low')}</SelectItem>
                   <SelectItem value="medium">{t('jobs.priorities.medium')}</SelectItem>
                   <SelectItem value="high">{t('jobs.priorities.high')}</SelectItem>
                   <SelectItem value="urgent">{t('jobs.priorities.urgent')}</SelectItem>
                 </SelectContent>
               </Select>
               <Badge variant="outline" className="self-center">
                 {filteredJobs.length} {t('jobs.jobsCount')}
               </Badge>
             </div>
           </CardContent>
         </Card>

        {/* Jobs List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
                 ) : filteredJobs.length === 0 ? (
           <Card>
             <CardContent className="p-8 text-center">
               <div className="text-gray-400 mb-4">
                 <Briefcase className="h-16 w-16 mx-auto" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">
                 {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                   ? t('jobs.noJobsFound')
                   : t('jobs.noJobs')
                 }
               </h3>
               <p className="text-gray-500 mb-4">
                 {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                   ? t('jobs.searchModify')
                   : t('jobs.startCreating')
                 }
               </p>
               {!searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                 <Button onClick={() => setIsCreateDialogOpen(true)}>
                   <Plus className="h-4 w-4 mr-2" />
                   {t('jobs.createFirstJob')}
                 </Button>
               )}
             </CardContent>
           </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job: Job) => {
              const statusInfo = getStatusInfo(job.status);
              const priorityInfo = getPriorityInfo(job.priority);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusIcon className="h-4 w-4 text-gray-500" />
                          <Badge variant="outline" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline" className={priorityInfo.color}>
                            {priorityInfo.label}
                          </Badge>
                        </div>
                      </div>
                                             <div className="flex items-center gap-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEdit(job)}
                           title={t('jobs.actions.edit')}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(job.id)}
                           className="text-red-600 hover:text-red-700"
                           title={t('jobs.actions.delete')}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {job.description && (
                        <div className="text-gray-600">
                          <p className="line-clamp-2">{job.description}</p>
                        </div>
                      )}
                      {job.clientName && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-3 w-3" />
                          <span>{job.clientName}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{job.location}</span>
                        </div>
                      )}
                                             {job.assignedTo && (
                         <div className="text-gray-600">
                           <span className="font-medium">{t('jobs.form.assignedTo')}:</span> {job.assignedTo}
                         </div>
                       )}
                      <div className="flex items-center gap-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(job.startDate).toLocaleDateString('it-IT')}</span>
                        </div>
                        {job.estimatedDuration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{job.estimatedDuration}h</span>
                          </div>
                        )}
                      </div>
                      {job.cost && (
                        <div className="text-gray-600">
                          <span className="font-medium">Costo stimato:</span> €{job.cost}
                        </div>
                      )}
                      {job.materials && (
                        <div className="text-gray-600 pt-2 border-t">
                          <span className="font-medium">Materiali:</span>
                          <p className="line-clamp-2 mt-1">{job.materials}</p>
                        </div>
                      )}
                      {job.notes && (
                        <div className="text-gray-600 pt-2 border-t">
                          <span className="font-medium">Note:</span>
                          <p className="line-clamp-2 mt-1">{job.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Aggiornato il {new Date(job.updatedAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 