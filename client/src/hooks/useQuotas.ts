import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Plan = 'free' | 'starter' | 'pro' | 'business';

interface QuotaLimits {
  limit: number | null;
  used: number;
  remaining: number;
  isUnlimited: boolean;
  canUpload: boolean;
  planName: string;
  price: string;
}

/**
 * Get plan display name
 */
function getPlanName(plan: Plan): string {
  const names: Record<Plan, string> = {
    free: 'Gratuit',
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
  };
  
  return names[plan] || 'Gratuit';
}

/**
 * Get plan price
 */
function getPlanPrice(plan: Plan): string {
  const prices: Record<Plan, string> = {
    free: '0€',
    starter: '14,90€',
    pro: '29,90€',
    business: '79,90€',
  };
  
  return prices[plan] || '0€';
}

/**
 * Hook to manage user quotas
 * Uses the new Airtable field names: userPlan, invoicesThisMonth, maxInvoicesPerMonth
 */
export function useQuotas() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => api.getProfile(),
  });

  if (isLoading || !profile) {
    return {
      limit: 3,
      used: 0,
      remaining: 3,
      isUnlimited: false,
      canUpload: true,
      planName: 'Gratuit',
      price: '0€',
      isLoading: true,
    };
  }

  // Use new field names from backend
  const plan = (profile.user.userPlan || 'free') as Plan;
  const maxInvoicesPerMonth = profile.user.maxInvoicesPerMonth;
  const invoicesThisMonth = profile.user.invoicesThisMonth || 0;
  
  // null means unlimited (Business plan)
  const isUnlimited = maxInvoicesPerMonth === null;
  
  const remaining = isUnlimited ? Infinity : Math.max(0, (maxInvoicesPerMonth || 3) - invoicesThisMonth);
  const canUpload = isUnlimited || remaining > 0;

  const quotaData: QuotaLimits = {
    limit: maxInvoicesPerMonth,
    used: invoicesThisMonth,
    remaining,
    isUnlimited,
    canUpload,
    planName: getPlanName(plan),
    price: getPlanPrice(plan),
  };

  return {
    ...quotaData,
    isLoading: false,
  };
}

/**
 * Check if user can upload (throws error if not)
 */
export function checkQuotaOrThrow(quotas: QuotaLimits): void {
  if (!quotas.canUpload) {
    throw new Error(
      `Quota limit reached. You have used ${quotas.used}/${quotas.limit} uploads this month. Upgrade your plan to continue.`
    );
  }
}
