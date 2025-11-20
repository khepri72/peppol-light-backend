import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

interface QuotaLimits {
  limit: number;
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
    FREE: 'Free',
    STARTER: 'Starter',
    PRO: 'Pro',
    BUSINESS: 'Business',
  };
  
  return names[plan] || 'Free';
}

/**
 * Get plan price
 */
function getPlanPrice(plan: Plan): string {
  const prices: Record<Plan, string> = {
    FREE: '0€',
    STARTER: '29€',
    PRO: '99€',
    BUSINESS: '299€',
  };
  
  return prices[plan] || '0€';
}

/**
 * Hook to manage user quotas
 */
export function useQuotas() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => api.getProfile(),
  });

  if (isLoading || !profile) {
    return {
      limit: 0,
      used: 0,
      remaining: 0,
      isUnlimited: false,
      canUpload: false,
      planName: 'Free',
      price: '0€',
      isLoading: true,
    };
  }

  const plan = (profile.user.plan || 'FREE') as Plan;
  const quotaLimit = profile.user.quotaLimit !== undefined ? profile.user.quotaLimit : 1;
  const quotaUsed = profile.user.quotaUsed || 0;
  const isUnlimited = quotaLimit === -1;
  
  const remaining = isUnlimited ? Infinity : Math.max(0, quotaLimit - quotaUsed);
  const canUpload = isUnlimited || remaining > 0;

  const quotaData: QuotaLimits = {
    limit: quotaLimit,
    used: quotaUsed,
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
