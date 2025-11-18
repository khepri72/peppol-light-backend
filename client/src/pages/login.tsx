import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

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

  return (
    <div className="min-h-screen flex">
      {/* BOUTON DE TEST - À SUPPRIMER */}
      <button
        onClick={() => alert('✅ Test OK - Les clics fonctionnent!')}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 9999,
          padding: '10px 20px',
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
        data-testid="button-test-click"
      >
        🔴 TEST CLIC ICI
      </button>
      
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E5AA8] to-[#0F3D7A] p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">{t('common.peppolLight')}</h1>
          <p className="text-white/90 text-lg">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="absolute top-8 right-8">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8 lg:hidden">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
            <CardDescription>
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-email">{t('login.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('login.emailPlaceholder')}
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
                      <FormLabel data-testid="label-password">{t('login.password')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('login.passwordPlaceholder')}
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
                  className="w-full h-12"
                  disabled={form.formState.isSubmitting}
                  data-testid="button-login"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('login.signingIn')}
                    </>
                  ) : (
                    t('login.signIn')
                  )}
                </Button>

                <div className="text-center text-sm">
                  {t('login.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setLocation('/register')}
                    className="text-[#1E5AA8] hover:underline font-medium"
                    data-testid="link-register"
                  >
                    {t('login.createOne')}
                  </button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
