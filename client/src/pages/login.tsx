import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { loginSchema, LoginUser } from '@shared/schema';
import { Check, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginUser) => {
    try {
      const response = await api.login(data);
      authStorage.setToken(response.token);
      
      toast({
        title: t('login.title'),
        description: `${response.user.email}`,
      });

      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: t('login.errorInvalid'),
        description: error instanceof Error ? error.message : t('login.errorInvalid'),
        variant: 'destructive',
      });
    }
  };

  const languages = [
    { code: 'fr', label: 'FR' },
    { code: 'nl', label: 'NL' },
    { code: 'en', label: 'EN' }
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* HERO SECTION - Visible sur toutes tailles d'écran */}
      <div className="flex flex-col bg-gradient-to-br from-[#1E5AA8] to-[#2A6EC1] text-white lg:flex-1 lg:p-10 xl:p-16 lg:justify-between">
        {/* VERSION MOBILE - Compact */}
        <div className="lg:hidden px-6 py-6 flex flex-col items-center gap-4">
          <img 
            src="/assets/logo_final.jpg" 
            alt="Peppol Light" 
            className="logo-header"
            data-testid="hero-logo-mobile"
          />
          
          {/* Boutons de langue mobile */}
          <div className="flex gap-2" data-testid="language-switcher-mobile">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`
                  px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300
                  ${i18n.language === lang.code 
                    ? 'bg-white text-[#1E5AA8] font-semibold' 
                    : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                  }
                `}
                data-testid={`button-lang-mobile-${lang.code}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          
          {/* Mini-tagline mobile */}
          <p className="text-base font-medium text-center opacity-95" data-testid="hero-tagline-mobile">
            {t('hero.mobileTagline')}
          </p>
        </div>

        {/* VERSION DESKTOP - Complète */}
        <div className="hidden lg:block">
          {/* Header avec logo et boutons langue */}
          <div className="flex justify-between items-start mb-12">
            <img 
              src="/assets/logo_final.jpg" 
              alt="Peppol Light" 
              className="logo-header"
              data-testid="hero-logo-desktop"
            />
            
            {/* Boutons de langue desktop */}
            <div className="flex gap-2" data-testid="language-switcher-desktop">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
                    ${i18n.language === lang.code 
                      ? 'bg-white text-[#1E5AA8] border border-white font-semibold shadow-md' 
                      : 'bg-transparent text-white/70 border border-white/30 hover:text-white/95 hover:border-white/50 hover:bg-white/10'
                    }
                  `}
                  data-testid={`button-lang-desktop-${lang.code}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu Hero central */}
          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <h2 className="text-3xl xl:text-4xl font-semibold mb-10 leading-snug">
              {t('hero.tagline')}
            </h2>

            {/* Liste des bénéfices avec icônes check */}
            <ul className="space-y-5">
              <li className="flex items-center gap-4">
                <span className="flex items-center justify-center w-7 h-7 bg-green-500/90 rounded-full flex-shrink-0">
                  <Check className="w-4 h-4 text-white font-bold" />
                </span>
                <span className="text-lg xl:text-xl">{t('hero.benefit1')}</span>
              </li>
              <li className="flex items-center gap-4">
                <span className="flex items-center justify-center w-7 h-7 bg-green-500/90 rounded-full flex-shrink-0">
                  <Check className="w-4 h-4 text-white font-bold" />
                </span>
                <span className="text-lg xl:text-xl">{t('hero.benefit2')}</span>
              </li>
              <li className="flex items-center gap-4">
                <span className="flex items-center justify-center w-7 h-7 bg-green-500/90 rounded-full flex-shrink-0">
                  <Check className="w-4 h-4 text-white font-bold" />
                </span>
                <span className="text-lg xl:text-xl">{t('hero.benefit3')}</span>
              </li>
            </ul>
          </div>

          {/* Bandeau de réassurance en bas */}
          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center mt-12">
            <p className="text-sm font-medium opacity-95">
              {t('hero.reassurance')}
            </p>
          </div>
        </div>
      </div>

      {/* PARTIE FORMULAIRE */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 pt-4 sm:pt-6 pb-12 sm:pb-16 bg-gray-50">

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-[#1E5AA8] mb-3 text-center">
            {t('login.title')}
          </h2>
          <p className="text-gray-600 mb-8 text-center leading-relaxed">
            {t('login.subtitle')}
          </p>

          <div className="mb-6">
            <GoogleSignInButton />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500 font-medium">{t('login.orSeparator')}</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700" data-testid="label-email">
                      {t('login.emailLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        className="h-12 px-4 border-2 border-gray-200 focus:border-[#1E5AA8] focus:ring-[#1E5AA8]/10 rounded-lg transition-all"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-email" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700" data-testid="label-password">
                      {t('login.passwordLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('login.passwordPlaceholder')}
                        className="h-12 px-4 border-2 border-gray-200 focus:border-[#1E5AA8] focus:ring-[#1E5AA8]/10 rounded-lg transition-all"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-password" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-14 bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] hover:from-[#FF6B35] hover:to-[#FF8C5A] text-white font-semibold text-base rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300 mt-2"
                data-testid="button-login"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('login.signingIn')}
                  </>
                ) : (
                  t('login.button')
                )}
              </Button>

              <p className="text-center text-[13px] text-gray-400 mt-3 font-normal leading-relaxed" data-testid="text-reassurance">
                {t('login.reassurance')}
              </p>

              <div className="text-center text-sm pt-4">
                <span className="text-gray-600">{t('login.noAccount')} </span>
                <button
                  type="button"
                  onClick={() => setLocation('/register')}
                  className="text-[#FF6B35] hover:text-[#FF8C5A] font-semibold hover:underline transition-colors"
                  data-testid="link-register"
                >
                  {t('login.createAccount')}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
