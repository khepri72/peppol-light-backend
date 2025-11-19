/**
 * Mapping des codes de règles d'erreur Peppol vers clés de traduction i18n
 * Les codes correspondent aux valeurs de "rule" renvoyées par le backend
 */
export const ERROR_RULE_TO_I18N: Record<string, string> = {
  'Rule 1': 'validation.errors.date_invalid',
  'Rule 2': 'validation.errors.vat_invalid',
  'Rule 3': 'validation.errors.no_valid_lines',
  'Rule 4': 'validation.errors.amounts_inconsistent',
  'Rule 5': 'validation.errors.reference_missing',
  'Rule 6': 'validation.errors.bce_missing',
};

/**
 * Structure d'une erreur de validation backend
 */
export interface ValidationError {
  rule: string;
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
  const i18nKey = ERROR_RULE_TO_I18N[error.rule];
  
  // Si clé de traduction trouvée, l'utiliser avec paramètres éventuels
  if (i18nKey) {
    return t(i18nKey, error.messageParams || {});
  }
  
  // Fallback : message original si code inconnu
  return error.message || error.rule;
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
