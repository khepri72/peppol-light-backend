import { authStorage, logout } from './auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface ApiError {
  message: string;
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

  async uploadAndAnalyzeInvoice(file: File): Promise<Invoice> {
    try {
      // Step 1: Upload du fichier
      const uploadFormData = new FormData();
      uploadFormData.append('pdf', file);
      
      const uploadResponse = await this.request<{ url: string; filename: string }>('/api/upload/pdf', {
        method: 'POST',
        body: uploadFormData,
      });

      // Step 2: Créer record Airtable IMMÉDIATEMENT → obtenir invoiceId
      const initialInvoiceData = {
        fileName: file.name,
        fileUrl: uploadResponse.url,
        status: 'uploaded',
        conformityScore: 0,
        errorsList: '',
        errorsData: '',
        xmlFilename: '',
        ublFileUrl: '',
      };

      const createdInvoice = await this.request<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(initialInvoiceData),
      });

      // Step 3: Analyser la facture EN PASSANT invoiceId au backend
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', file);
      analyzeFormData.append('invoiceId', createdInvoice.id); // AJOUT CRITIQUE

      const analysisResult = await this.request<{
        success: boolean;
        score: number;
        errors: Array<{ field?: string; code: string; severity: string; message: string }>;
        warnings: Array<{ field?: string; code: string; severity: string; message: string }>;
        xmlFilename: string | null;
        ublFileUrl: string | null;
      }>('/api/invoices/analyze', {
        method: 'POST',
        body: analyzeFormData,
      });

      // Step 4: Retourner l'invoice avec les données d'analyse
      // Note: ublFileUrl utilise maintenant l'invoiceId (compatible Render)
      return {
        ...createdInvoice,
        conformityScore: analysisResult.score,
        status: analysisResult.score >= 80 ? 'checked' : 'uploaded',
        xmlFilename: analysisResult.xmlFilename || '',
        ublFileUrl: `/api/invoices/download-ubl/${createdInvoice.id}`,
      };
    } catch (error) {
      console.error('uploadAndAnalyzeInvoice error:', error);
      // Re-throw with more context if error message is generic
      if (error instanceof Error) {
        if (error.message === 'Request failed' || error.message === 'An error occurred') {
          throw new Error('Failed to process invoice. Please ensure the file is a valid PDF or Excel invoice.');
        }
      }
      throw error;
    }
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
