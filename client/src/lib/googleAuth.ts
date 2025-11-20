import { authStorage } from './auth';

interface GoogleAuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    googleId: string;
    plan: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
    quotaUsed: number;
    quotaLimit: number;
    quotaResetDate: string;
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

/**
 * Handle Google Login with popup
 */
export async function handleGoogleLogin(): Promise<GoogleAuthResponse> {
  const clientId = getGoogleClientId();
  
  if (!clientId) {
    throw new Error('Google Client ID not configured');
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google SDK not loaded'));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const authResponse = await authenticateWithGoogle(response.credential);
          resolve(authResponse);
        } catch (error) {
          reject(error);
        }
      },
    });

    window.google.accounts.id.prompt((notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error('Google One Tap was not displayed or was skipped'));
      }
    });
  });
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: (callback: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => void;
        };
      };
    };
  }
}
