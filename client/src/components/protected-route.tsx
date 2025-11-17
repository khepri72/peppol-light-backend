import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { authStorage } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      setLocation('/login');
    }
  }, [setLocation]);

  if (!authStorage.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
