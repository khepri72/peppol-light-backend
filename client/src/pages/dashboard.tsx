import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { api, Invoice } from '@/lib/api';
import { authStorage, logout } from '@/lib/auth';
import { Upload, FileText, Trash2, LogOut, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => api.getProfile(),
  });

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: () => api.getInvoices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: t('dashboard.invoiceList.deleteSuccess'),
        description: t('dashboard.invoiceList.deleteSuccess'),
      });
      setDeleteInvoiceId(null);
    },
    onError: (error) => {
      toast({
        title: t('dashboard.invoiceList.deleteError'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type: PDF or Excel
    const fileName = file.name.toLowerCase();
    const isValidFile = fileName.endsWith('.pdf') || 
                       fileName.endsWith('.xlsx') || 
                       fileName.endsWith('.xls');
    
    if (!isValidFile) {
      toast({
        title: t('common.error'),
        description: t('dashboard.uploadSection.invalidFormat'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      await api.uploadAndAnalyzeInvoice(file);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      toast({
        title: t('dashboard.uploadSection.uploadSuccess'),
        description: t('dashboard.uploadSection.analysisComplete'),
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: t('dashboard.uploadSection.uploadError'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'checked':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100" data-testid={`badge-status-${status}`}>{t('status.checked')}</Badge>;
      case 'uploaded':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100" data-testid={`badge-status-${status}`}>{t('status.uploaded')}</Badge>;
      case 'converted':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100" data-testid={`badge-status-${status}`}>{t('status.converted')}</Badge>;
      case 'sent':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100" data-testid={`badge-status-${status}`}>{t('status.sent')}</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-unknown">{status || t('status.pending')}</Badge>;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  if (!authStorage.isAuthenticated()) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-[#1E5AA8]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-app-title">
                {t('common.peppolLight')}
              </h1>
              {profile && (
                <p className="text-sm text-muted-foreground" data-testid="text-company-name">
                  {profile.user.companyName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button
              variant="outline"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('dashboard.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('dashboard.uploadSection.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.uploadSection.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('dashboard.uploadSection.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('dashboard.uploadSection.chooseFile')}
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('dashboard.uploadSection.acceptedFormats')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-8 bg-amber-50 border-amber-200" data-testid="alert-disclaimer">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 font-semibold">
            {t('dashboard.disclaimer.title')}
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            {t('dashboard.disclaimer.message')}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.invoiceList.title')}</CardTitle>
            <CardDescription>
              {invoicesData ? t('dashboard.invoiceList.total', { count: invoicesData.count }) : t('common.loading')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : invoicesData && invoicesData.invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.invoiceList.columns.fileName')}</TableHead>
                    <TableHead>{t('dashboard.invoiceList.columns.status')}</TableHead>
                    <TableHead>{t('dashboard.invoiceList.columns.conformityScore')}</TableHead>
                    <TableHead>{t('dashboard.invoiceList.columns.errors')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.invoiceList.columns.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.invoices.map((invoice: Invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-medium" data-testid={`text-filename-${invoice.id}`}>
                        {invoice.fileName}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        {invoice.conformityScore !== undefined ? (
                          <span className={`font-semibold ${getScoreColor(invoice.conformityScore)}`} data-testid={`text-score-${invoice.id}`}>
                            {invoice.conformityScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.errorsList ? (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-[#FF6B35]" />
                            <span className="text-sm" data-testid={`text-errors-${invoice.id}`}>
                              {invoice.errorsList}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('dashboard.invoiceList.columns.errors')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteInvoiceId(invoice.id)}
                          data-testid={`button-delete-${invoice.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4" data-testid="text-no-invoices">
                  {t('dashboard.invoiceList.empty')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.uploadSection.subtitle')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteInvoiceId} onOpenChange={() => setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.invoiceList.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.invoiceList.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('dashboard.invoiceList.columns.actions')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoiceId && deleteMutation.mutate(deleteInvoiceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t('dashboard.invoiceList.deleteSuccess')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
