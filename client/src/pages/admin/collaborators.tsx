import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Plus, Search, Edit, Trash2, User, Shield, Smartphone, Eye, EyeOff, Users, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

// Types for Collaborators
type Collaborator = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  mobilePermissions: {
    // Client Management
    canViewClients: boolean;
    canEditClients: boolean;
    canCreateClients: boolean;
    canDeleteClients: boolean;
    canViewClientDetails: boolean;
    canViewClientSensitiveData: boolean; // Address, financial info, etc.
    
    // Job Management
    canViewJobs: boolean;
    canEditJobs: boolean;
    canCreateJobs: boolean;
    canDeleteJobs: boolean;
    canViewJobDetails: boolean;
    canViewJobFinancials: boolean; // Pricing, costs, etc.
    canUpdateJobStatus: boolean;
    canAddJobNotes: boolean;
    canUploadJobPhotos: boolean;
    
    // Reports & Analytics
    canViewReports: boolean;
    canCreateReports: boolean;
    canExportReports: boolean;
    canViewFinancialReports: boolean;
    canViewPerformanceMetrics: boolean;
    
    // Invoicing & Financials
    canViewInvoices: boolean;
    canEditInvoices: boolean;
    canCreateInvoices: boolean;
    canDeleteInvoices: boolean;
    canViewInvoiceAmounts: boolean;
    canViewPaymentHistory: boolean;
    
    // Time & Activity Tracking
    canTrackTime: boolean;
    canViewTimeEntries: boolean;
    canEditTimeEntries: boolean;
    canViewActivityLogs: boolean;
    
    // Material & Inventory
    canViewMaterials: boolean;
    canEditMaterials: boolean;
    canViewInventory: boolean;
    canUpdateInventory: boolean;
    
    // Communication & Notifications
    canSendNotifications: boolean;
    canViewMessages: boolean;
    canSendMessages: boolean;
    canViewSystemAlerts: boolean;
  };
  rolePermissions: {
    roleId: number;
    roleName: string;
    description: string;
    permissions: string[];
  }[];
  workSchedule: {
    monday: { start: string; end: string; isWorking: boolean };
    tuesday: { start: string; end: string; isWorking: boolean };
    wednesday: { start: string; end: string; isWorking: boolean };
    thursday: { start: string; end: string; isWorking: boolean };
    friday: { start: string; end: string; isWorking: boolean };
    saturday: { start: string; end: string; isWorking: boolean };
    sunday: { start: string; end: string; isWorking: boolean };
  };
  notificationSettings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    jobAssignments: boolean;
    statusUpdates: boolean;
    deadlineReminders: boolean;
    systemAlerts: boolean;
  };
  createdAt: Date;
  notes: string | null;
  lastActive: Date | null;
  totalJobsCompleted: number;
  averageRating: number;
  skills: string[];
  certifications: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
};

// Form validation schema
const collaboratorSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 characters").optional().or(z.literal("")),
  role: z.string().min(1, "Role is required"),
  isActive: z.boolean(),
  mobilePermissions: z.object({
    // Client Management
    canViewClients: z.boolean(),
    canEditClients: z.boolean(),
    canCreateClients: z.boolean(),
    canDeleteClients: z.boolean(),
    canViewClientDetails: z.boolean(),
    canViewClientSensitiveData: z.boolean(),
    
    // Job Management
    canViewJobs: z.boolean(),
    canEditJobs: z.boolean(),
    canCreateJobs: z.boolean(),
    canDeleteJobs: z.boolean(),
    canViewJobDetails: z.boolean(),
    canViewJobFinancials: z.boolean(),
    canUpdateJobStatus: z.boolean(),
    canAddJobNotes: z.boolean(),
    canUploadJobPhotos: z.boolean(),
    
    // Reports & Analytics
    canViewReports: z.boolean(),
    canCreateReports: z.boolean(),
    canExportReports: z.boolean(),
    canViewFinancialReports: z.boolean(),
    canViewPerformanceMetrics: z.boolean(),
    
    // Invoicing & Financials
    canViewInvoices: z.boolean(),
    canEditInvoices: z.boolean(),
    canCreateInvoices: z.boolean(),
    canDeleteInvoices: z.boolean(),
    canViewInvoiceAmounts: z.boolean(),
    canViewPaymentHistory: z.boolean(),
    
    // Time & Activity Tracking
    canTrackTime: z.boolean(),
    canViewTimeEntries: z.boolean(),
    canEditTimeEntries: z.boolean(),
    canViewActivityLogs: z.boolean(),
    
    // Material & Inventory
    canViewMaterials: z.boolean(),
    canEditMaterials: z.boolean(),
    canViewInventory: z.boolean(),
    canUpdateInventory: z.boolean(),
    
    // Communication & Notifications
    canSendNotifications: z.boolean(),
    canViewMessages: z.boolean(),
    canSendMessages: z.boolean(),
    canViewSystemAlerts: z.boolean(),
  }),
  workSchedule: z.object({
    monday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    tuesday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    wednesday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    thursday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    friday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    saturday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
    sunday: z.object({ start: z.string(), end: z.string(), isWorking: z.boolean() }),
  }),
  notificationSettings: z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    jobAssignments: z.boolean(),
    statusUpdates: z.boolean(),
    deadlineReminders: z.boolean(),
    systemAlerts: z.boolean(),
  }),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional().nullable(),
  notes: z.string().optional(),
});

type CollaboratorFormData = z.infer<typeof collaboratorSchema>;

export default function CollaboratorsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form setup
  const form = useForm<CollaboratorFormData>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "",
      isActive: true,
      mobilePermissions: {
        // Client Management
        canViewClients: false,
        canEditClients: false,
        canCreateClients: false,
        canDeleteClients: false,
        canViewClientDetails: false,
        canViewClientSensitiveData: false,
        
        // Job Management
        canViewJobs: false,
        canEditJobs: false,
        canCreateJobs: false,
        canDeleteJobs: false,
        canViewJobDetails: false,
        canViewJobFinancials: false,
        canUpdateJobStatus: false,
        canAddJobNotes: false,
        canUploadJobPhotos: false,
        
        // Reports & Analytics
        canViewReports: false,
        canCreateReports: false,
        canExportReports: false,
        canViewFinancialReports: false,
        canViewPerformanceMetrics: false,
        
        // Invoicing & Financials
        canViewInvoices: false,
        canEditInvoices: false,
        canCreateInvoices: false,
        canDeleteInvoices: false,
        canViewInvoiceAmounts: false,
        canViewPaymentHistory: false,
        
        // Time & Activity Tracking
        canTrackTime: false,
        canViewTimeEntries: false,
        canEditTimeEntries: false,
        canViewActivityLogs: false,
        
        // Material & Inventory
        canViewMaterials: false,
        canEditMaterials: false,
        canViewInventory: false,
        canUpdateInventory: false,
        
        // Communication & Notifications
        canSendNotifications: false,
        canViewMessages: false,
        canSendMessages: false,
        canViewSystemAlerts: false,
      },
      workSchedule: {
        monday: { start: "09:00", end: "17:00", isWorking: true },
        tuesday: { start: "09:00", end: "17:00", isWorking: true },
        wednesday: { start: "09:00", end: "17:00", isWorking: true },
        thursday: { start: "09:00", end: "17:00", isWorking: true },
        friday: { start: "09:00", end: "17:00", isWorking: true },
        saturday: { start: "09:00", end: "13:00", isWorking: false },
        sunday: { start: "09:00", end: "17:00", isWorking: false },
      },
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        jobAssignments: true,
        statusUpdates: true,
        deadlineReminders: true,
        systemAlerts: false,
      },
      skills: [],
      certifications: [],
      emergencyContact: null,
      notes: "",
    },
  });

  // Permission management functions
  const setAllPermissions = (value: boolean) => {
    const permissions = form.getValues("mobilePermissions");
    const updatedPermissions = Object.keys(permissions).reduce((acc, key) => {
      acc[key as keyof typeof permissions] = value;
      return acc;
    }, {} as typeof permissions);
    form.setValue("mobilePermissions", updatedPermissions);
  };

  const setCategoryPermissions = (category: string, value: boolean) => {
    const permissions = form.getValues("mobilePermissions");
    const categoryKeys = Object.keys(permissions).filter(key => 
      key.toLowerCase().includes(category.toLowerCase())
    );
    
    const updatedPermissions = { ...permissions };
    categoryKeys.forEach(key => {
      updatedPermissions[key as keyof typeof permissions] = value;
    });
    form.setValue("mobilePermissions", updatedPermissions);
  };

  // Helper function to ensure collaborator has all required properties
  const ensureCollaboratorProperties = (collaborator: any): Collaborator => {
    return {
      id: collaborator.id || 0,
      fullName: collaborator.fullName || collaborator.name || 'Unknown',
      email: collaborator.email || null,
      phone: collaborator.phone || null,
      role: collaborator.role || 'Worker',
      isActive: collaborator.isActive || false,
      mobilePermissions: {
        // Client Management
        canViewClients: collaborator.mobilePermissions?.canViewClients || false,
        canEditClients: collaborator.mobilePermissions?.canEditClients || false,
        canCreateClients: collaborator.mobilePermissions?.canCreateClients || false,
        canDeleteClients: collaborator.mobilePermissions?.canDeleteClients || false,
        canViewClientDetails: collaborator.mobilePermissions?.canViewClientDetails || false,
        canViewClientSensitiveData: collaborator.mobilePermissions?.canViewClientSensitiveData || false,
        
        // Job Management
        canViewJobs: collaborator.mobilePermissions?.canViewJobs || false,
        canEditJobs: collaborator.mobilePermissions?.canEditJobs || false,
        canCreateJobs: collaborator.mobilePermissions?.canCreateJobs || false,
        canDeleteJobs: collaborator.mobilePermissions?.canDeleteJobs || false,
        canViewJobDetails: collaborator.mobilePermissions?.canViewJobDetails || false,
        canViewJobFinancials: collaborator.mobilePermissions?.canViewJobFinancials || false,
        canUpdateJobStatus: collaborator.mobilePermissions?.canUpdateJobStatus || false,
        canAddJobNotes: collaborator.mobilePermissions?.canAddJobNotes || false,
        canUploadJobPhotos: collaborator.mobilePermissions?.canUploadJobPhotos || false,
        
        // Reports & Analytics
        canViewReports: collaborator.mobilePermissions?.canViewReports || false,
        canCreateReports: collaborator.mobilePermissions?.canCreateReports || false,
        canExportReports: collaborator.mobilePermissions?.canExportReports || false,
        canViewFinancialReports: collaborator.mobilePermissions?.canViewFinancialReports || false,
        canViewPerformanceMetrics: collaborator.mobilePermissions?.canViewPerformanceMetrics || false,
        
        // Invoicing & Financials
        canViewInvoices: collaborator.mobilePermissions?.canViewInvoices || false,
        canEditInvoices: collaborator.mobilePermissions?.canEditInvoices || false,
        canCreateInvoices: collaborator.mobilePermissions?.canCreateInvoices || false,
        canDeleteInvoices: collaborator.mobilePermissions?.canDeleteInvoices || false,
        canViewInvoiceAmounts: collaborator.mobilePermissions?.canViewInvoiceAmounts || false,
        canViewPaymentHistory: collaborator.mobilePermissions?.canViewPaymentHistory || false,
        
        // Time & Activity Tracking
        canTrackTime: collaborator.mobilePermissions?.canTrackTime || false,
        canViewTimeEntries: collaborator.mobilePermissions?.canViewTimeEntries || false,
        canEditTimeEntries: collaborator.mobilePermissions?.canEditTimeEntries || false,
        canViewActivityLogs: collaborator.mobilePermissions?.canViewActivityLogs || false,
        
        // Material & Inventory
        canViewMaterials: collaborator.mobilePermissions?.canViewMaterials || false,
        canEditMaterials: collaborator.mobilePermissions?.canEditMaterials || false,
        canViewInventory: collaborator.mobilePermissions?.canViewInventory || false,
        canUpdateInventory: collaborator.mobilePermissions?.canUpdateInventory || false,
        
        // Communication & Notifications
        canSendNotifications: collaborator.mobilePermissions?.canSendNotifications || false,
        canViewMessages: collaborator.mobilePermissions?.canViewMessages || false,
        canSendMessages: collaborator.mobilePermissions?.canSendMessages || false,
        canViewSystemAlerts: collaborator.mobilePermissions?.canViewSystemAlerts || false,
      },
      rolePermissions: collaborator.rolePermissions || [],
      workSchedule: collaborator.workSchedule || {
        monday: { start: "09:00", end: "17:00", isWorking: true },
        tuesday: { start: "09:00", end: "17:00", isWorking: true },
        wednesday: { start: "09:00", end: "17:00", isWorking: true },
        thursday: { start: "09:00", end: "17:00", isWorking: true },
        friday: { start: "09:00", end: "17:00", isWorking: true },
        saturday: { start: "09:00", end: "13:00", isWorking: false },
        sunday: { start: "09:00", end: "17:00", isWorking: false },
      },
      notificationSettings: collaborator.notificationSettings || {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        jobAssignments: true,
        statusUpdates: true,
        deadlineReminders: true,
        systemAlerts: false,
      },
      createdAt: collaborator.createdAt ? new Date(collaborator.createdAt) : new Date(),
      notes: collaborator.notes || null,
      lastActive: collaborator.lastActive ? new Date(collaborator.lastActive) : null,
      totalJobsCompleted: collaborator.totalJobsCompleted || 0,
      averageRating: collaborator.averageRating || 0,
      skills: collaborator.skills || [],
      certifications: collaborator.certifications || [],
      emergencyContact: collaborator.emergencyContact || null,
    };
  };



  // Fetch collaborators
  const { data: collaborators, isLoading, error } = useQuery({
    queryKey: ["/api/collaborators"],
    queryFn: () => apiRequest("GET", "/api/collaborators").then(res => res.json()),
    enabled: true
  });

  // Filter collaborators
  const filteredCollaborators = collaborators?.filter((collaborator: any) => {
    const matchesSearch = (collaborator.fullName || collaborator.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (collaborator.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (collaborator.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || collaborator.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && collaborator.isActive) ||
                         (statusFilter === "inactive" && !collaborator.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }).map(ensureCollaboratorProperties) || [];

  // Create collaborator mutation
  const createCollaboratorMutation = useMutation({
    mutationFn: (data: CollaboratorFormData) => 
      apiRequest("POST", "/api/collaborators", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: t('collaborators.messages.created'),
        description: t('collaborators.messages.created'),
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('collaborators.messages.createError'),
        variant: "destructive",
      });
    },
  });

  // Update collaborator mutation
  const updateCollaboratorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CollaboratorFormData }) =>
      apiRequest("PUT", `/api/collaborators/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: t('collaborators.messages.updated'),
        description: t('collaborators.messages.updated'),
      });
      setEditingCollaborator(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('collaborators.messages.updateError'),
        variant: "destructive",
      });
    },
  });

  // Delete collaborator mutation
  const deleteCollaboratorMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/collaborators/${id}`).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: t('collaborators.messages.deleted'),
        description: t('collaborators.messages.deleted'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('collaborators.messages.deleteError'),
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CollaboratorFormData) => {
    if (editingCollaborator) {
      updateCollaboratorMutation.mutate({ id: editingCollaborator.id, data });
    } else {
      createCollaboratorMutation.mutate(data);
    }
  };

  // Handle edit
  const handleEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    form.reset({
      fullName: collaborator.fullName,
      email: collaborator.email || "",
      phone: collaborator.phone || "",
      role: collaborator.role,
      isActive: collaborator.isActive,
      mobilePermissions: collaborator.mobilePermissions,
      workSchedule: collaborator.workSchedule,
      notificationSettings: collaborator.notificationSettings,
      skills: collaborator.skills || [],
      certifications: collaborator.certifications || [],
      emergencyContact: collaborator.emergencyContact,
      notes: collaborator.notes || "",
    });
    setIsCreateDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm(t('collaborators.actions.deleteConfirm'))) {
      deleteCollaboratorMutation.mutate(id);
    }
  };

  // Get role info
  const getRoleInfo = (role: string) => {
    switch (role) {
      case "admin":
        return { label: t('collaborators.roles.admin'), color: "bg-red-100 text-red-800" };
      case "manager":
        return { label: t('collaborators.roles.manager'), color: "bg-blue-100 text-blue-800" };
      case "worker":
        return { label: t('collaborators.roles.worker'), color: "bg-green-100 text-green-800" };
      case "apprentice":
        return { label: t('collaborators.roles.apprentice'), color: "bg-yellow-100 text-yellow-800" };
      default:
        return { label: role, color: "bg-gray-100 text-gray-800" };
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">{t('collaborators.error')}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">{t('collaborators.title')}</h1>
            <p className="text-gray-600">{t('collaborators.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setLocation("/admin/artisan-dashboard")}>
              {t('collaborators.backToDashboard')}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('collaborators.newCollaborator')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCollaborator ? t('collaborators.editCollaborator') : t('collaborators.newCollaborator')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCollaborator 
                      ? t('collaborators.form.editDescription')
                      : t('collaborators.form.description')
                    }
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">{t('collaborators.form.fullName')}</Label>
                      <Input
                        id="fullName"
                        placeholder={t('collaborators.form.fullNamePlaceholder')}
                        {...form.register("fullName")}
                      />
                      {form.formState.errors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.fullName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="role">{t('collaborators.form.role')}</Label>
                      <Select onValueChange={(value) => form.setValue("role", value)} value={form.watch("role")}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('collaborators.form.selectRole')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('collaborators.roles.admin')}</SelectItem>
                          <SelectItem value="manager">{t('collaborators.roles.manager')}</SelectItem>
                          <SelectItem value="worker">{t('collaborators.roles.worker')}</SelectItem>
                          <SelectItem value="apprentice">{t('collaborators.roles.apprentice')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.role && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.role.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">{t('collaborators.form.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('collaborators.form.emailPlaceholder')}
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('collaborators.form.phone')}</Label>
                      <Input
                        id="phone"
                        placeholder={t('collaborators.form.phonePlaceholder')}
                        {...form.register("phone")}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Mobile Permissions */}
                  <div className="border-t pt-4">
                    <Label className="text-lg font-medium">{t('collaborators.mobilePermissions.title')}</Label>
                    <p className="text-sm text-gray-600 mb-4">{t('collaborators.mobilePermissions.description')}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('collaborators.mobilePermissions.clients')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="canViewClients"
                              {...form.register("mobilePermissions.canViewClients")}
                              className="rounded"
                            />
                            <Label htmlFor="canViewClients" className="text-sm">{t('collaborators.mobilePermissions.view')}</Label>
                            <input
                              type="checkbox"
                              id="canEditClients"
                              {...form.register("mobilePermissions.canEditClients")}
                              className="rounded"
                            />
                            <Label htmlFor="canEditClients" className="text-sm">{t('collaborators.mobilePermissions.edit')}</Label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {t('collaborators.mobilePermissions.jobs')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="canViewJobs"
                              {...form.register("mobilePermissions.canViewJobs")}
                              className="rounded"
                            />
                            <Label htmlFor="canViewJobs" className="text-sm">{t('collaborators.mobilePermissions.view')}</Label>
                            <input
                              type="checkbox"
                              id="canEditJobs"
                              {...form.register("mobilePermissions.canEditJobs")}
                              className="rounded"
                            />
                            <Label htmlFor="canEditJobs" className="text-sm">{t('collaborators.mobilePermissions.edit')}</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {t('collaborators.mobilePermissions.reports')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="canViewReports"
                              {...form.register("mobilePermissions.canViewReports")}
                              className="rounded"
                            />
                            <Label htmlFor="canViewReports" className="text-sm">{t('collaborators.mobilePermissions.view')}</Label>
                            <input
                              type="checkbox"
                              id="canCreateReports"
                              {...form.register("mobilePermissions.canCreateReports")}
                              className="rounded"
                            />
                            <Label htmlFor="canCreateReports" className="text-sm">{t('collaborators.mobilePermissions.create')}</Label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {t('collaborators.mobilePermissions.invoices')}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="canViewInvoices"
                              {...form.register("mobilePermissions.canViewInvoices")}
                              className="rounded"
                            />
                            <Label htmlFor="canViewInvoices" className="text-sm">{t('collaborators.mobilePermissions.view')}</Label>
                            <input
                              type="checkbox"
                              id="canEditInvoices"
                              {...form.register("mobilePermissions.canEditInvoices")}
                              className="rounded"
                            />
                            <Label htmlFor="canEditInvoices" className="text-sm">{t('collaborators.mobilePermissions.edit')}</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status and Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          {...form.register("isActive")}
                          className="rounded"
                        />
                        {t('collaborators.form.isActive')}
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">{t('collaborators.form.notes')}</Label>
                    <Textarea
                      id="notes"
                      placeholder={t('collaborators.form.notesPlaceholder')}
                      className="min-h-[80px]"
                      {...form.register("notes")}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingCollaborator(null);
                        form.reset();
                      }}
                    >
                      {t('collaborators.form.cancel')}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCollaboratorMutation.isPending || updateCollaboratorMutation.isPending}
                    >
                      {createCollaboratorMutation.isPending || updateCollaboratorMutation.isPending 
                        ? (editingCollaborator ? t('collaborators.form.updating') : t('collaborators.form.creating'))
                        : t('collaborators.form.save')
                      }
                    </Button>
                  </div>
                </form>
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
                  placeholder={t('collaborators.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder={t('collaborators.filters.role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('collaborators.filters.allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('collaborators.roles.admin')}</SelectItem>
                  <SelectItem value="manager">{t('collaborators.roles.manager')}</SelectItem>
                  <SelectItem value="worker">{t('collaborators.roles.worker')}</SelectItem>
                  <SelectItem value="apprentice">{t('collaborators.roles.apprentice')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder={t('collaborators.filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('collaborators.filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('collaborators.filters.active')}</SelectItem>
                  <SelectItem value="inactive">{t('collaborators.filters.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="self-center">
                {filteredCollaborators.length} {t('collaborators.collaboratorsCount')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Collaborators List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{t('common.loading')}</p>
            </CardContent>
          </Card>
        ) : filteredCollaborators.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Users className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                  ? t('collaborators.noCollaboratorsFound')
                  : t('collaborators.noCollaborators')
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? t('collaborators.searchModify')
                  : t('collaborators.startCreating')
                }
              </p>
              {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('collaborators.createFirstCollaborator')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredCollaborators.map((collaborator: Collaborator) => (
              <Card key={collaborator.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{collaborator.fullName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getRoleInfo(collaborator.role).color}>
                            {getRoleInfo(collaborator.role).label}
                          </Badge>
                          <Badge variant={collaborator.isActive ? "default" : "secondary"}>
                            {collaborator.isActive ? t('collaborators.status.active') : t('collaborators.status.inactive')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {collaborator.email && (
                            <span>{collaborator.email}</span>
                          )}
                          {collaborator.phone && (
                            <span>{collaborator.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(collaborator)}
                        title={t('collaborators.actions.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(collaborator.id)}
                        className="text-red-600 hover:text-red-700"
                        title={t('collaborators.actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Permissions Summary */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('collaborators.mobilePermissions.summary')}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{t('collaborators.mobilePermissions.clients')}:</span>
                        <Badge variant="outline" className="text-xs">
                          {collaborator.mobilePermissions?.canViewClients ? t('collaborators.mobilePermissions.view') : t('collaborators.mobilePermissions.none')}
                          {collaborator.mobilePermissions?.canEditClients && ` + ${t('collaborators.mobilePermissions.edit')}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>{t('collaborators.mobilePermissions.jobs')}:</span>
                        <Badge variant="outline" className="text-xs">
                          {collaborator.mobilePermissions?.canViewJobs ? t('collaborators.mobilePermissions.view') : t('collaborators.mobilePermissions.none')}
                          {collaborator.mobilePermissions?.canEditJobs && ` + ${t('collaborators.mobilePermissions.edit')}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{t('collaborators.mobilePermissions.reports')}:</span>
                        <Badge variant="outline" className="text-xs">
                          {collaborator.mobilePermissions?.canViewReports ? t('collaborators.mobilePermissions.view') : t('collaborators.mobilePermissions.none')}
                          {collaborator.mobilePermissions?.canCreateReports && ` + ${t('collaborators.mobilePermissions.create')}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>{t('collaborators.mobilePermissions.invoices')}:</span>
                        <Badge variant="outline" className="text-xs">
                          {collaborator.mobilePermissions?.canViewInvoices ? t('collaborators.mobilePermissions.view') : t('collaborators.mobilePermissions.none')}
                          {collaborator.mobilePermissions?.canEditInvoices && ` + ${t('collaborators.mobilePermissions.edit')}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 