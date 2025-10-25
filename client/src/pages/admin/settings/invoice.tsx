import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Eye, Download } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  issueDate: string;
  description: string;
  items: InvoiceItem[];
  createdAt: string;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const AdminSettingsInvoicePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock data for now - replace with actual API calls
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        {
          id: 1,
          invoiceNumber: 'INV-2025-001',
          clientId: 1,
          clientName: 'Famiglia Bianchi',
          amount: 1250.00,
          status: 'paid' as const,
          dueDate: '2025-01-15',
          issueDate: '2025-01-01',
          description: 'Riparazione impianto elettrico',
          items: [
            { id: 1, description: 'Riparazione impianto', quantity: 1, unitPrice: 800.00, total: 800.00 },
            { id: 2, description: 'Materiali', quantity: 1, unitPrice: 450.00, total: 450.00 }
          ],
          createdAt: '2025-01-01T10:00:00Z'
        },
        {
          id: 2,
          invoiceNumber: 'INV-2025-002',
          clientId: 2,
          clientName: 'Marco Verdi',
          amount: 750.00,
          status: 'sent' as const,
          dueDate: '2025-02-15',
          issueDate: '2025-01-15',
          description: 'Sostituzione rubinetti',
          items: [
            { id: 1, description: 'Sostituzione rubinetti', quantity: 2, unitPrice: 300.00, total: 600.00 },
            { id: 2, description: 'Manodopera', quantity: 3, unitPrice: 50.00, total: 150.00 }
          ],
          createdAt: '2025-01-15T14:30:00Z'
        }
      ];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      return response.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: t('admin.invoice.status.draft'), className: 'bg-gray-100 text-gray-800' },
      sent: { label: t('admin.invoice.status.sent'), className: 'bg-blue-100 text-blue-800' },
      paid: { label: t('admin.invoice.status.paid'), className: 'bg-green-100 text-green-800' },
      overdue: { label: t('admin.invoice.status.overdue'), className: 'bg-red-100 text-red-800' },
      cancelled: { label: t('admin.invoice.status.cancelled'), className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const handleCreateInvoice = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handleDeleteInvoice = (id: number) => {
    if (confirm(t('admin.invoice.confirmDelete'))) {
      // Implement delete logic
      toast({
        title: t('admin.invoice.invoiceDeleted'),
        description: t('admin.invoice.invoiceDeleted'),
      });
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Implement download logic
    toast({
      title: t('admin.invoice.invoiceDownloaded'),
      description: t('admin.invoice.invoiceDownloaded'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.invoice.title')}</h1>
          <p className="text-muted-foreground">{t('admin.invoice.description')}</p>
        </div>
        <Button onClick={handleCreateInvoice} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('admin.invoice.newInvoice')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.invoice.stats.totalInvoices')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">{t('admin.invoice.stats.totalInvoicesDescription')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.invoice.stats.paidInvoices')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter(inv => inv.status === 'paid').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin.invoice.stats.paidInvoicesDescription')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.invoice.stats.pendingInvoices')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter(inv => inv.status === 'sent').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin.invoice.stats.pendingInvoicesDescription')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.invoice.stats.totalRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount, 0))}</div>
            <p className="text-xs text-muted-foreground">{t('admin.invoice.stats.totalRevenueDescription')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.invoice.invoicesList')}</CardTitle>
          <CardDescription>{t('admin.invoice.invoicesListDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t('admin.invoice.noInvoices')}</p>
              <Button onClick={handleCreateInvoice}>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.invoice.createFirstInvoice')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.invoice.table.invoiceNumber')}</TableHead>
                  <TableHead>{t('admin.invoice.table.client')}</TableHead>
                  <TableHead>{t('admin.invoice.table.amount')}</TableHead>
                  <TableHead>{t('admin.invoice.table.status')}</TableHead>
                  <TableHead>{t('admin.invoice.table.issueDate')}</TableHead>
                  <TableHead>{t('admin.invoice.table.dueDate')}</TableHead>
                  <TableHead>{t('admin.invoice.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.invoice.createInvoice')}</DialogTitle>
            <DialogDescription>{t('admin.invoice.createInvoiceDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">{t('admin.invoice.form.client')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.invoice.form.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">{t('admin.invoice.form.dueDate')}</Label>
                <Input type="date" id="dueDate" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">{t('admin.invoice.form.description')}</Label>
              <Textarea id="description" placeholder={t('admin.invoice.form.descriptionPlaceholder')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => {
                // Implement create logic
                toast({
                  title: t('admin.invoice.invoiceCreated'),
                  description: t('admin.invoice.invoiceCreated'),
                });
                setIsCreateDialogOpen(false);
              }}>
                {t('admin.invoice.createInvoice')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettingsInvoicePage;
