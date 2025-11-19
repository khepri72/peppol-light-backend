/**
 * Mapping des codes de règles d'erreur Peppol vers clés de traduction i18n
 * Les codes correspondent aux valeurs de "code" renvoyées par le backend
 */
export const ERROR_CODE_TO_I18N: Record<string, string> = {
  // Date errors
  'DATE_MISSING': 'validation.errors.date_invalid',
  'DATE_INVALID_FORMAT': 'validation.errors.date_invalid',
  'DATE_CONVERSION_ERROR': 'validation.errors.date_invalid',
  
  // VAT errors
  'VAT_MISSING': 'validation.errors.vat_invalid',
  'VAT_INVALID_FORMAT': 'validation.errors.vat_invalid',
  
  // Line items
  'NO_VALID_LINES': 'validation.errors.no_valid_lines',
  
  // Amounts
  'AMOUNTS_INCONSISTENT': 'validation.errors.amounts_inconsistent',
  
  // References
  'REFERENCE_MISSING': 'validation.errors.reference_missing',
  
  // BCE
  'BCE_MISSING': 'validation.errors.bce_missing',
};

/**
 * Structure d'une erreur de validation backend
 */
export interface ValidationError {
  field?: string;
  code: string;
  severity: 'error' | 'warning';
  message: string;
  messageParams?: {
    net?: number;
    vat?: number;
    gross?: number;
    [key: string]: any;
  };
}

/**
 * Fonction helper pour traduire une erreur de validation
 * @param error - L'objet erreur du backend
 * @param t - La fonction de traduction i18n
 * @returns Le message d'erreur traduit
 */
export function translateValidationError(
  error: ValidationError,
  t: (key: string, params?: any) => string
): string {
  const i18nKey = ERROR_CODE_TO_I18N[error.code];
  
  // Si clé de traduction trouvée, l'utiliser avec paramètres éventuels
  if (i18nKey) {
    // Pour AMOUNTS_INCONSISTENT, extraire les montants du message
    if (error.code === 'AMOUNTS_INCONSISTENT') {
      const match = error.message.match(/HT\(([\d.]+)\).*TVA\(([\d.]+)\).*TTC\(([\d.]+)\)/);
      if (match) {
        return t(i18nKey, {
          net: match[1],
          vat: match[2],
          gross: match[3]
        });
      }
    }
    return t(i18nKey);
  }
  
  // Fallback : message original si code inconnu
  return error.message || error.code;
}

/**
 * Traduit un tableau d'erreurs et warnings
 * @param errors - Tableau d'erreurs
 * @param warnings - Tableau de warnings
 * @param t - La fonction de traduction i18n
 * @returns Chaîne formatée avec toutes les erreurs traduites
 */
export function translateErrorsList(
  errors: ValidationError[],
  warnings: ValidationError[],
  t: (key: string, params?: any) => string
): string {
  const translatedErrors = errors.map(e => 
    `${t('validation.severity.error')}: ${translateValidationError(e, t)}`
  );
  
  const translatedWarnings = warnings.map(w => 
    `${t('validation.severity.warning')}: ${translateValidationError(w, t)}`
  );
  
  return [...translatedErrors, ...translatedWarnings].join('\n');
}
