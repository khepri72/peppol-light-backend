import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { authenticateWithGoogle } from '@/lib/googleAuth';
import { authStorage } from '@/lib/auth';

// Google Identity Services TypeScript Definitions
interface CredentialResponse {
  credential: string;
  select_by?: string;
}

interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: IdConfiguration) => void;
          renderButton: (
            parent: HTMLElement,
            options: GsiButtonConfiguration
          ) => void;
          prompt: (callback?: (notification: any) => void) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const initializedRef = useRef(false);
  const promptShownRef = useRef(false);

  useEffect(() => {
    if (!googleButtonRef.current) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('⚠️ VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }

    const handleCredentialResponse = async (response: CredentialResponse) => {
      try {
        const authResponse = await authenticateWithGoogle(response.credential);
        
        // CRITICAL: Store token in localStorage to persist session
        authStorage.setToken(authResponse.token);
        
        // Update React Query cache with user data including quota fields
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.setQueryData(['/api/auth/me'], {
          token: authResponse.token,
          user: authResponse.user
        });
        
        toast({
          title: t('common.success'),
          description: `${authResponse.user.email}`,
        });

        setLocation('/dashboard');
        onSuccess?.();
      } catch (error) {
        console.error('Google auth error:', error);
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('login.errorNetwork'),
          variant: 'destructive',
        });
        onError?.(error instanceof Error ? error : new Error('Google auth failed'));
      }
    };

    const initializeGoogleButton = () => {
      if (!googleButtonRef.current || initializedRef.current) return;
      if (typeof window === 'undefined' || !window.google) return;

      try {
        // Prevent duplicate initialization
        initializedRef.current = true;

        // Initialize Google One Tap
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the button with custom styling to match the design
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: googleButtonRef.current.offsetWidth || 300,
            text: 'continue_with',
            shape: 'rectangular',
          }
        );

        console.log('✅ Google Sign-In button rendered successfully');

        // Show One Tap prompt for better UX (optional, won't block if dismissed)
        if (!promptShownRef.current) {
          promptShownRef.current = true;
          
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              console.log('ℹ️ One Tap not displayed (user dismissed or blocked)');
            } else if (notification.isSkippedMoment()) {
              console.log('ℹ️ One Tap skipped (user previously closed)');
            }
          });
        }
      } catch (error) {
        console.error('Failed to initialize Google One Tap:', error);
        initializedRef.current = false;
        promptShownRef.current = false;
      }
    };

    // Define global callback for Google SDK (called when script loads)
    const onGoogleLibraryLoad = () => {
      console.log('🔄 Google Identity Services SDK loaded');
      initializeGoogleButton();
    };

    // Check if Google SDK is already loaded
    if (window.google) {
      initializeGoogleButton();
    } else {
      // Wait for Google SDK to load via global callback
      // Google calls window.onGoogleLibraryLoad when ready
      (window as any).onGoogleLibraryLoad = onGoogleLibraryLoad;

      // Fallback: also poll for window.google in case onGoogleLibraryLoad doesn't fire
      const checkInterval = setInterval(() => {
        if (window.google) {
          clearInterval(checkInterval);
          if (!initializedRef.current) {
            console.log('🔄 Google SDK detected via polling fallback');
            initializeGoogleButton();
          }
        }
      }, 200);

      // Keep polling indefinitely (no timeout) to handle slow connections
      return () => {
        clearInterval(checkInterval);
        delete (window as any).onGoogleLibraryLoad;
      };
    }
  }, [t, toast, setLocation, onSuccess, onError]);

  return (
    <div 
      ref={googleButtonRef} 
      className="w-full"
      data-testid="google-signin-button"
    />
  );
}
