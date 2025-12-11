import { authStorage, logout } from './auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface ApiError {
  message: string;
}

export interface InvoiceIncompleteError {
  success: false;
  code: 'INVOICE_INCOMPLETE';
  message: string;
  errors: Array<{ field: string; message: string }>;
  score: number;
  validationResults: Array<{ field?: string; code: string; severity: string; message: string }>;
  warnings: Array<{ field?: string; code: string; severity: string; message: string }>;
  extractedData: Record<string, unknown>;
  invoiceId: string;
}

export function isInvoiceIncompleteError(error: unknown): error is InvoiceIncompleteError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as InvoiceIncompleteError).code === 'INVOICE_INCOMPLETE'
  );
}

export interface RegisterData {
  email: string;
  password: string;
  companyName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    googleId?: string;
    plan?: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
    quotaUsed?: number;
    quotaLimit?: number;
    quotaResetDate?: string;
    picture?: string;
  };
}

export interface Invoice {
  id: string;
  fileName: string;
  fileUrl?: string;
  status?: string;
  conformityScore?: number;
  errorsList?: string;
  errorsData?: string; // JSON string containing { errors: [], warnings: [] }
  xmlFilename?: string; // Real XML filename for UBL download
  ublFileUrl?: string; // Direct URL for UBL download
}

export interface InvoicesResponse {
  invoices: Invoice[];
  count: number;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 errors differently based on endpoint
    if (response.status === 401) {
      // Don't logout on login/register endpoints - these are auth attempts
      if (!endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register')) {
        logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      // Backend returns {error: "..."} not {message: "..."}
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request<AuthResponse>('/api/auth/me');
  }

  async getInvoices(): Promise<InvoicesResponse> {
    return this.request<InvoicesResponse>('/api/invoices');
  }

  async uploadInvoice(file: File): Promise<Invoice> {
    const data = {
      fileName: file.name,
      fileUrl: `https://storage.example.com/${file.name}`,
      status: 'uploaded',
    };

    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Upload et analyse une facture.
   * - HTTP 200 → facture complète, XML généré
   * - HTTP 422 INVOICE_INCOMPLETE → facture enregistrée mais incomplète (pas de XML)
   * 
   * Dans les DEUX cas, la facture est enregistrée dans Airtable par le backend.
   */
  async uploadAndAnalyzeInvoice(file: File): Promise<Invoice> {
    // Le backend gère maintenant la création de l'invoice ET l'analyse en une seule requête
    const analyzeFormData = new FormData();
    analyzeFormData.append('file', file);

    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/invoices/analyze`, {
      method: 'POST',
      headers,
      body: analyzeFormData,
    });

    const responseData = await response.json();

    // Cas 1: HTTP 422 - Facture incomplète (mais ENREGISTRÉE dans Airtable)
    if (response.status === 422 && responseData.code === 'INVOICE_INCOMPLETE') {
      console.log('📋 [API] Facture incomplète détectée, invoiceId:', responseData.invoiceId);
      
      // Throw une erreur spéciale avec les données de la facture
      const incompleteError: InvoiceIncompleteError = {
        success: false,
        code: 'INVOICE_INCOMPLETE',
        message: responseData.message,
        errors: responseData.errors,
        score: responseData.score,
        validationResults: responseData.validationResults || [],
        warnings: responseData.warnings || [],
        extractedData: responseData.extractedData || {},
        invoiceId: responseData.invoiceId,
      };
      throw incompleteError;
    }

    // Cas 2: Autre erreur HTTP
    if (!response.ok) {
      throw new Error(responseData.error || responseData.message || 'Request failed');
    }

    // Cas 3: HTTP 200 - Succès
    return {
      id: responseData.invoiceId,
      fileName: file.name,
      fileUrl: `/api/uploads/${file.name}`,
      conformityScore: responseData.score,
      status: 'Analysée',
      xmlFilename: responseData.xmlFilename || '',
      ublFileUrl: responseData.ublFileUrl || `/api/invoices/download-ubl/${responseData.invoiceId}`,
    };
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
