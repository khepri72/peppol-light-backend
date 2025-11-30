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
    const token = authStorage.getToken();

    // 1️⃣ UPLOAD DU FICHIER
    const formData = new FormData();
    formData.append("pdf", file);

    const uploadResponse = await fetch("/api/upload/pdf", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload file');
    }

    const uploadData = await uploadResponse.json();
    console.log("📤 Upload OK:", uploadData.filename);

    // 2️⃣ CRÉATION DU RECORD AIRTABLE (pour obtenir invoiceId + quota)
    const createResponse = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName: file.name,
        fileUrl: uploadData.url,
        status: "uploaded"
      })
    });

    if (!createResponse.ok) {
      const err = await createResponse.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create invoice record');
    }

    const createdInvoice = await createResponse.json();
    const invoiceId = createdInvoice.id;
    console.log("📌 Invoice ID:", invoiceId);

    // 3️⃣ ANALYSE AVEC invoiceId (le backend met à jour Airtable automatiquement)
    const analyzeFormData = new FormData();
    analyzeFormData.append("file", file);
    analyzeFormData.append("invoiceId", invoiceId);

    const analyzeResponse = await fetch("/api/invoices/analyze", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: analyzeFormData
    });

    if (!analyzeResponse.ok) {
      const err = await analyzeResponse.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to analyze invoice');
    }

    const result = await analyzeResponse.json();
    console.log("✅ Analyse OK | Score:", result.score, "| XML:", result.xmlFilename);

    // Le backend a déjà mis à jour Airtable avec tous les champs
    // On retourne les données de l'analyse
    return {
      id: invoiceId,
      fileName: file.name,
      fileUrl: uploadData.url,
      status: result.score >= 80 ? 'checked' : 'pending',
      conformityScore: result.score,
      errorsList: result.errorsList,
      errorsData: result.errorsData,
      xmlFilename: result.xmlFilename,
      ublFileUrl: result.ublFileUrl
    };
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
