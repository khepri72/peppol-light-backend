import { authStorage } from './auth';

interface GoogleAuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    plan: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
    quotaUsed: number;
    picture?: string;
  };
}

/**
 * Send Google credential to backend for verification
 */
export async function authenticateWithGoogle(
  credential: string
): Promise<GoogleAuthResponse> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google authentication failed');
  }

  const data: GoogleAuthResponse = await response.json();
  
  // Store token in localStorage
  authStorage.setToken(data.token);
  
  return data;
}

/**
 * Get Google Client ID from environment
 */
export function getGoogleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error('⚠️ VITE_GOOGLE_CLIENT_ID not set in environment variables');
    return '';
  }
  
  return clientId;
}
