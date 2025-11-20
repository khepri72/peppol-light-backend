import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginGoogle() {
  const [, setLocation] = useLocation();
  const { user, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user && !loading) {
      setLocation('/dashboard');
    }
  }, [user, loading, setLocation]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // La redirection est gérée automatiquement par Supabase OAuth
    } catch (error) {
      console.error('Erreur login Google:', error);
      toast({
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter avec Google. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E5AA8] to-[#2A6EC1]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E5AA8] to-[#2A6EC1] px-4">
      <div className="w-full max-w-md">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/assets/logo_final.jpg" 
              alt="Peppol Light" 
              className="h-16 w-auto"
            />
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Bienvenue sur Peppol Light
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Connectez-vous pour accéder à votre espace sécurisé
          </p>

          {/* Bouton Google OAuth */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-base border-2 border-gray-300 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
            data-testid="button-google-login"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </Button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Lien vers login classique (existant) */}
          <div className="text-center">
            <button
              onClick={() => setLocation('/login')}
              className="text-[#1E5AA8] hover:text-[#2A6EC1] font-semibold hover:underline transition-colors"
              data-testid="link-classic-login"
            >
              Se connecter avec email et mot de passe
            </button>
          </div>

          {/* Informations légales */}
          <p className="text-center text-xs text-gray-500 mt-8">
            En vous connectant, vous acceptez nos{' '}
            <a href="/terms" className="underline hover:text-gray-700">
              Conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a href="/privacy" className="underline hover:text-gray-700">
              Politique de confidentialité
            </a>
          </p>
        </div>

        {/* CTA inscription */}
        <div className="text-center mt-6">
          <p className="text-white text-sm">
            Nouveau sur Peppol Light ?{' '}
            <button
              onClick={() => setLocation('/register')}
              className="font-semibold underline hover:text-gray-200 transition-colors"
              data-testid="link-register"
            >
              Créer un compte gratuitement
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
