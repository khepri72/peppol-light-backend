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
  };
}

export interface Invoice {
  id: string;
  fileName: string;
  fileUrl?: string;
  status?: string;
  conformityScore?: number;
  errorsList?: string;
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
      logout();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'Request failed');
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
    return this.request<{ user: { id: string; email: string; companyName: string } }>('/api/auth/me');
  }

  async getInvoices(): Promise<InvoicesResponse> {
    return this.request<InvoicesResponse>('/api/invoices');
  }

  async uploadInvoice(file: File): Promise<Invoice> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<Invoice>('/api/invoices', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteInvoice(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
