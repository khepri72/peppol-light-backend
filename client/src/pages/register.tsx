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
import { insertUserSchema, InsertUser } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: '',
      password: '',
      companyName: '',
    },
  });

  const onSubmit = async (data: InsertUser) => {
    try {
      const response = await api.register(data);
      authStorage.setToken(response.token);
      
      toast({
        title: t('register.successMessage'),
        description: t('common.peppolLight'),
      });

      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: t('register.errorEmailExists'),
        description: error instanceof Error ? error.message : t('register.errorNetwork'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
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
            <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
            <CardDescription>
              {t('register.subtitle')}
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
                      <FormLabel data-testid="label-email">{t('register.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('register.emailPlaceholder')}
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
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-company">{t('register.companyName')}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={t('register.companyPlaceholder')}
                          data-testid="input-company"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage data-testid="error-company" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-password">{t('register.password')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('register.passwordPlaceholder')}
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
                  data-testid="button-register"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('register.signingUp')}
                    </>
                  ) : (
                    t('register.signUp')
                  )}
                </Button>

                <div className="text-center text-sm">
                  {t('register.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setLocation('/login')}
                    className="text-[#1E5AA8] hover:underline font-medium"
                    data-testid="link-login"
                  >
                    {t('register.signIn')}
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
