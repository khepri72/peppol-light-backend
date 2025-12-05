import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
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
import { Upload, FileText, Trash2, LogOut, Loader2, AlertCircle, AlertTriangle, Download } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { translateErrorsList, type ValidationError } from '@/utils/errorTranslations';
import { useQuotas } from '@/hooks/useQuotas';

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

  const quotas = useQuotas();

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

    // Vérifier le quota avant l'upload
    if (!quotas.canUpload) {
      toast({
        title: quotas.isUnlimited 
          ? t('common.error')
          : t('quotas.exceeded.title'),
        description: quotas.isUnlimited
          ? t('common.error')
          : t('quotas.exceeded.description', { 
              used: quotas.used, 
              limit: quotas.limit 
            }),
        variant: 'destructive',
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/pricing')}
            data-testid="button-quota-upgrade"
          >
            {t('quotas.upgradePlan')}
          </Button>
        ),
      });
      return;
    }

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
      
      // Reset file input AVANT d'invalider les queries pour éviter conflits DOM
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalider les queries SEQUENTIELLEMENT pour éviter les conflits de rendu
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      // Petit délai avant la deuxième invalidation pour éviter les conflits
      await new Promise(resolve => setTimeout(resolve, 50));
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: t('dashboard.uploadSection.uploadSuccess'),
        description: t('dashboard.uploadSection.analysisComplete'),
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Display user-friendly error message
      toast({
        title: t('dashboard.uploadSection.uploadError'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: 'destructive',
      });
      
      // Reset file input even on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    // score === 0 est un score valide (0%), !== undefined pour vérifier si défini
    if (score === undefined || score === null) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTranslatedErrors = (invoice: Invoice): string => {
    // Try to use structured errorsData first (for i18n translation)
    if (invoice.errorsData) {
      try {
        const parsed = JSON.parse(invoice.errorsData) as {
          errors?: ValidationError[];
          warnings?: ValidationError[];
        };
        // Guard against missing arrays
        const errors = parsed.errors || [];
        const warnings = parsed.warnings || [];
        return translateErrorsList(errors, warnings, t);
      } catch (e) {
        // If parsing fails, fallback to errorsList
        return invoice.errorsList || '';
      }
    }
    
    // Fallback to legacy errorsList (for backward compatibility)
    return invoice.errorsList || '';
  };

  // État pour gérer le téléchargement en cours
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  /**
   * Téléchargement UBL - Version 100% sans manipulation DOM
   * Utilise window.open() pour ouvrir le blob dans un nouvel onglet
   * AUCUN: document.createElement, appendChild, removeChild, insertBefore
   */
  const downloadUbl = async (invoice: Invoice) => {
    console.log('📥 [downloadUbl] START - Invoice:', invoice.id);
    setDownloadingId(invoice.id);
    
    try {
      const invoiceId = invoice.id;
      
      const token = authStorage.getToken();
      const response = await fetch(`/api/invoices/download-ubl/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        console.error('❌ [downloadUbl] Failed:', response.status, errorData);
        throw new Error(errorData.error || `Download failed: ${response.status}`);
      }
      
      // Créer le blob et l'URL
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      console.log('📥 [downloadUbl] Blob URL created, opening in new tab');
      
      // Ouvrir dans un nouvel onglet (100% sans manipulation DOM)
      // Le navigateur affichera le XML ou proposera de le télécharger
      const newWindow = window.open(url, '_blank');
      
      // Si le popup est bloqué, informer l'utilisateur
      if (!newWindow) {
        console.warn('📥 [downloadUbl] Popup blocked by browser');
        toast({
          title: t('common.warning', 'Attention'),
          description: t('dashboard.popupBlocked', 'Autorisez les popups pour télécharger le fichier, ou cliquez à nouveau.'),
          variant: 'destructive',
        });
        // Alternative: navigation directe (remplace la page actuelle)
        // window.location.href = url;
      } else {
        toast({
          title: t('common.success'),
          description: t('dashboard.ublDownloaded'),
        });
      }
      
      // Révoquer l'URL après un délai
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        console.log('📥 [downloadUbl] URL revoked');
      }, 10000);
      
      console.log('📥 [downloadUbl] END');
    } catch (error: any) {
      console.error('❌ [downloadUbl] ERROR:', error);
      toast({
        title: t('common.error'),
        description: `${t('dashboard.ublDownloadError')}: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
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
            {!quotas.isLoading && (
              <Badge 
                variant={quotas.canUpload ? "default" : "destructive"}
                className="text-sm px-3 py-1.5"
                data-testid="badge-quota"
              >
                {quotas.isUnlimited 
                  ? t('quotas.unlimited')
                  : t('quotas.used', { used: quotas.used, limit: quotas.limit })
                }
              </Badge>
            )}
            <Button
              variant="ghost"
              asChild
              data-testid="button-pricing"
            >
              <Link href="/pricing">{t('nav.pricing')}</Link>
            </Button>
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
                    <TableHead className="text-center">{t('dashboard.ublColumn')}</TableHead>
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
                        {(() => {
                          const translatedErrors = getTranslatedErrors(invoice);
                          const hasErrors = translatedErrors && translatedErrors.trim().length > 0;
                          const scoreIsLow = invoice.conformityScore !== undefined && invoice.conformityScore < 100;
                          
                          if (hasErrors) {
                            return (
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-[#FF6B35] mt-0.5 flex-shrink-0" />
                                <span className="text-sm whitespace-pre-line" data-testid={`text-errors-${invoice.id}`}>
                                  {translatedErrors}
                                </span>
                              </div>
                            );
                          } else if (scoreIsLow) {
                            // Score < 100% mais pas d'erreurs stockées = facture uploadée avant le fix
                            return (
                              <span className="text-muted-foreground text-sm italic">
                                {t('dashboard.invoiceList.noErrorsStored', 'Re-uploadez pour voir les erreurs')}
                              </span>
                            );
                          } else {
                            // Score = 100% ou non défini
                            return (
                              <span className="text-green-600 text-sm">
                                {t('dashboard.invoiceList.noErrors', 'Aucune erreur')}
                              </span>
                            );
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        {(invoice.xmlFilename || invoice.ublFileUrl || invoice.fileUrl) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadUbl(invoice)}
                            disabled={downloadingId === invoice.id}
                            data-testid={`button-download-ubl-${invoice.id}`}
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            {t('dashboard.downloadUbl')}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t('dashboard.noUbl')}
                          </span>
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
            <AlertDialogCancel data-testid="button-cancel-delete">{t('dashboard.invoiceList.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoiceId && deleteMutation.mutate(deleteInvoiceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t('dashboard.invoiceList.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
