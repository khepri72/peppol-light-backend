import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Download, Zap, Infinity } from 'lucide-react';

/**
 * Composant pour afficher le quota de téléchargements de l'utilisateur
 * À intégrer dans le header du dashboard
 */
export function QuotaDisplay() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return null;
  }

  const isUnlimited = userProfile.downloads_quota === -1;
  const remaining = userProfile.downloads_quota - userProfile.downloads_used_this_month;
  const percentUsed = isUnlimited
    ? 0
    : (userProfile.downloads_used_this_month / userProfile.downloads_quota) * 100;

  // Couleur selon le quota restant
  const getQuotaColor = () => {
    if (isUnlimited) return 'text-green-600 bg-green-50 border-green-200';
    if (remaining === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (remaining <= 2) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all
        ${getQuotaColor()}
      `}
      data-testid="quota-display"
    >
      {/* Icône */}
      <div className="flex-shrink-0">
        {isUnlimited ? (
          <Infinity className="w-5 h-5" data-testid="icon-unlimited" />
        ) : (
          <Download className="w-5 h-5" data-testid="icon-download" />
        )}
      </div>

      {/* Texte quota */}
      <div className="flex flex-col">
        {isUnlimited ? (
          <span className="text-sm font-semibold" data-testid="text-quota-unlimited">
            Téléchargements illimités
          </span>
        ) : (
          <>
            <span className="text-sm font-semibold" data-testid="text-quota-remaining">
              {remaining}/{userProfile.downloads_quota} téléchargements restants
            </span>
            {remaining > 0 && (
              <span className="text-xs opacity-75" data-testid="text-quota-month">
                ce mois-ci
              </span>
            )}
          </>
        )}
      </div>

      {/* Barre de progression (seulement si quota limité) */}
      {!isUnlimited && (
        <div className="hidden sm:flex flex-col gap-1 ml-2">
          <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-current transition-all duration-300"
              style={{ width: `${percentUsed}%` }}
              data-testid="quota-progress-bar"
            />
          </div>
        </div>
      )}

      {/* Bouton upgrade si quota épuisé */}
      {!isUnlimited && remaining === 0 && (
        <Link href="/pricing">
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] hover:from-[#FF6B35] hover:to-[#FF8C5A] text-white ml-2"
            data-testid="button-upgrade"
          >
            <Zap className="w-4 h-4 mr-1" />
            Passer à PRO
          </Button>
        </Link>
      )}
    </div>
  );
}
