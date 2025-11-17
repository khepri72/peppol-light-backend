import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
        title: 'Account created',
        description: 'Welcome to Peppol Light!',
      });

      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E5AA8] to-[#0F3D7A] p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">Peppol Light</h1>
          <p className="text-white/90 text-lg">
            Professional invoice verification for modern businesses
          </p>
        </div>
        <div className="text-white/80 text-sm">
          <p>Verify Peppol invoices with confidence</p>
          <p className="mt-2">Get instant conformity scores and error detection</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Enter your details to get started with Peppol Light
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
                      <FormLabel data-testid="label-email">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your.email@company.com"
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
                      <FormLabel data-testid="label-company">Company Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Your Company Ltd"
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
                      <FormLabel data-testid="label-password">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
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
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>

                <div className="text-center text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setLocation('/login')}
                    className="text-[#1E5AA8] hover:underline font-medium"
                    data-testid="link-login"
                  >
                    Sign in
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
