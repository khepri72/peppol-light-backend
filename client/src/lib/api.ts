import { authStorage, logout } from './auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface ApiError {
  message: string;
}

/**
 * Résultat d'upload de facture
 * ⚠️ IMPORTANT: Cette interface représente TOUS les résultats possibles (200 ET 422)
 * L'API ne throw JAMAIS pour un 422 - elle retourne toujours cet objet.
 */
export interface UploadResult {
  status: 200 | 422;
  invoice: Invoice;
  isIncomplete: boolean;
  incompleteErrors?: Array<{ field: string; message: string }>;
  score?: number;
  message?: string;
}

/**
 * Type guard pour vérifier si le résultat est une facture incomplète (422)
 * Utiliser cette fonction au lieu de vérifier manuellement le status
 */
export function isIncompleteResult(result: UploadResult): boolean {
  return result.status === 422 || result.isIncomplete === true;
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
    userPlan?: string;
    invoicesThisMonth?: number;
    maxInvoicesPerMonth?: number | null;
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
  errorsData?: string;
  xmlFilename?: string;
  ublFileUrl?: string;
  issueDate?: string;
  createdAt?: string;
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

    if (response.status === 401) {
      if (!endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register')) {
        logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
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
   * 
   * ⚠️ RÈGLE CRITIQUE: Cette fonction NE THROW JAMAIS pour un HTTP 422.
   * 
   * - HTTP 200 → facture complète, XML généré → UploadResult { status: 200 }
   * - HTTP 422 → facture incomplète, pas de XML → UploadResult { status: 422 }
   * - Autres erreurs (400, 401, 403, 500...) → throw Error (géré par le catch)
   * 
   * Dans les cas 200 ET 422, la facture EST enregistrée dans Airtable.
   */
  async uploadAndAnalyzeInvoice(file: File): Promise<UploadResult> {
    const analyzeFormData = new FormData();
    analyzeFormData.append('file', file);

    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    let responseData: any;

    try {
      response = await fetch(`${API_URL}/api/invoices/analyze`, {
        method: 'POST',
        headers,
        body: analyzeFormData,
      });

      responseData = await response.json().catch(() => ({}));
    } catch (networkError) {
      // Erreur réseau
      console.error('❌ [API] Network error:', networkError);
      throw new Error('Erreur réseau. Vérifiez votre connexion internet.');
    }

    // ========================================
    // CAS 1: HTTP 422 - Facture incomplète
    // ⚠️ JAMAIS de throw ici - toujours return
    // ========================================
    if (response.status === 422) {
      console.log('📋 [API] HTTP 422 - Facture incomplète');
      console.log('📋 [API] Response data:', JSON.stringify(responseData).substring(0, 200));
      
      // Construire un UploadResult valide même si les données sont partielles
      return {
        status: 422,
        isIncomplete: true,
        invoice: {
          id: responseData.invoiceId || `temp-${Date.now()}`,
          fileName: file.name,
          fileUrl: `/api/uploads/${file.name}`,
          conformityScore: responseData.score ?? 0,
          status: 'Incomplète',
          errorsList: responseData.errors?.map((e: any) => e.message).join(', ') || '',
        },
        incompleteErrors: responseData.errors || [],
        score: responseData.score ?? 0,
        message: responseData.message || 'Facture incomplète',
      };
    }

    // ========================================
    // CAS 2: Autre erreur HTTP (400, 401, 403, 500...)
    // → throw pour que le catch dans Dashboard le gère
    // ========================================
    if (!response.ok) {
      console.error('❌ [API] HTTP Error:', response.status, responseData);
      
      // For QUOTA_EXCEEDED, preserve the full error data
      if (response.status === 403 && responseData.code === 'QUOTA_EXCEEDED') {
        const quotaError: any = new Error(responseData.error || responseData.message || 'Quota exceeded');
        quotaError.isQuotaExceeded = true;
        quotaError.quotaData = {
          code: responseData.code,
          limit: responseData.limit,
          used: responseData.used,
          plan: responseData.plan,
        };
        throw quotaError;
      }
      
      throw new Error(responseData.error || responseData.message || `Erreur serveur (${response.status})`);
    }

    // ========================================
    // CAS 3: HTTP 200 - Succès complet
    // ========================================
    console.log('✅ [API] HTTP 200 - Facture analysée avec succès');
    console.log('✅ [API] Invoice ID:', responseData.invoiceId);
    
    return {
      status: 200,
      isIncomplete: false,
      invoice: {
        id: responseData.invoiceId || `temp-${Date.now()}`,
        fileName: file.name,
        fileUrl: `/api/uploads/${file.name}`,
        conformityScore: responseData.score ?? 100,
        status: 'Analysée',
        xmlFilename: responseData.xmlFilename || '',
        ublFileUrl: responseData.ublFileUrl || `/api/invoices/download-ubl/${responseData.invoiceId}`,
      },
      score: responseData.score ?? 100,
    };
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create a Stripe Checkout Session for subscription
   * @param plan - The plan to subscribe to (starter, pro, business)
   * @returns The Stripe Checkout URL
   */
  async createCheckoutSession(plan: 'starter' | 'pro' | 'business'): Promise<{ url: string }> {
    return this.request<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }
}

export const api = new ApiClient();
