const TOKEN_KEY = 'peppol_auth_token';

export interface User {
  id: string;
  email: string;
  companyName: string;
  googleId?: string;
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  quotaUsed?: number;
  quotaLimit?: number;
  quotaResetDate?: string;
  picture?: string;
}

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};

export const logout = () => {
  authStorage.removeToken();
  window.location.href = '/login';
};
