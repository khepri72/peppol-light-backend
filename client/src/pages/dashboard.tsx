import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
import { Upload, FileText, Trash2, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
        title: 'Invoice deleted',
        description: 'The invoice has been removed successfully.',
      });
      setDeleteInvoiceId(null);
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      await api.uploadInvoice(file);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      toast({
        title: 'Invoice uploaded',
        description: 'Your invoice has been uploaded and is being verified.',
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'checked':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100" data-testid={`badge-status-${status}`}>Verified</Badge>;
      case 'uploaded':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100" data-testid={`badge-status-${status}`}>Pending</Badge>;
      case 'converted':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100" data-testid={`badge-status-${status}`}>Converted</Badge>;
      case 'sent':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100" data-testid={`badge-status-${status}`}>Sent</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-unknown">{status || 'Unknown'}</Badge>;
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
                Peppol Light
              </h1>
              {profile && (
                <p className="text-sm text-muted-foreground" data-testid="text-company-name">
                  {profile.user.companyName}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Invoice Verification
          </h2>
          <p className="text-muted-foreground">
            Upload and manage your Peppol invoices
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Invoice</CardTitle>
            <CardDescription>
              Upload a PDF invoice to verify its Peppol conformity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
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
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose PDF File
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Only PDF files are accepted
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Invoices</CardTitle>
            <CardDescription>
              {invoicesData ? `${invoicesData.count} invoice${invoicesData.count !== 1 ? 's' : ''} total` : 'Loading...'}
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
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conformity Score</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          <span className="text-muted-foreground text-sm">No errors</span>
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
                  No invoices yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload your first PDF invoice to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteInvoiceId} onOpenChange={() => setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoiceId && deleteMutation.mutate(deleteInvoiceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
