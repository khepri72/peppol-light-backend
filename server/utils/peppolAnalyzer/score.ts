import { ValidationResult } from './types';

export function calculateConformityScore(validations: ValidationResult[]): number {
  let score = 100;
  
  for (const validation of validations) {
    if (validation.severity === 'error') {
      score -= 10;
    } else if (validation.severity === 'warning') {
      score -= 5;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}
