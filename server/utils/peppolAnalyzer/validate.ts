import validator from 'validator';
import { InvoiceData, ValidationResult } from './types';

export function validatePeppolRules(data: InvoiceData): ValidationResult[] {
  const errors: ValidationResult[] = [];
  
  // Règle 1 : Date convertible YYYY-MM-DD
  if (!data.issueDate) {
    errors.push({
      field: 'issueDate',
      code: 'DATE_MISSING',
      severity: 'error',
      message: 'Date de facture manquante'
    });
  } else {
    try {
      // Tenter conversion simple (à améliorer)
      const dateISO = convertToISO(data.issueDate);
      data.issueDateISO = dateISO;
      if (!validator.isISO8601(dateISO)) {
        errors.push({
          field: 'issueDate',
          code: 'DATE_INVALID_FORMAT',
          severity: 'error',
          message: 'Date doit être au format YYYY-MM-DD'
        });
      }
    } catch {
      errors.push({
        field: 'issueDate',
        code: 'DATE_CONVERSION_ERROR',
        severity: 'error',
        message: 'Impossible de convertir la date'
      });
    }
  }
  
  // Règle 2 : TVA fournisseur format BE + 10 chiffres
  const vatRegex = /^BE[0-9]{10}$/;
  if (!data.seller.vatNumber) {
    errors.push({
      field: 'seller.vatNumber',
      code: 'VAT_MISSING',
      severity: 'error',
      message: 'Numéro TVA fournisseur manquant'
    });
  } else if (!vatRegex.test(data.seller.vatNumber)) {
    errors.push({
      field: 'seller.vatNumber',
      code: 'VAT_INVALID_FORMAT',
      severity: 'error',
      message: 'Numéro TVA doit être au format BE + 10 chiffres'
    });
  }
  
  // Règle 3 : Au moins 1 ligne valide
  const validLines = data.lines.filter(line => 
    line.quantity > 0 && line.unitPrice > 0
  );
  if (validLines.length === 0) {
    errors.push({
      field: 'lines',
      code: 'NO_VALID_LINES',
      severity: 'error',
      message: 'Aucune ligne de facturation valide (quantité et prix > 0)'
    });
  }
  
  // Règle 4 : Cohérence montants (tolérance 0.01€)
  const calculatedGross = data.totals.netAmount + data.totals.taxAmount;
  const diff = Math.abs(calculatedGross - data.totals.grossAmount);
  if (diff > 0.01) {
    errors.push({
      field: 'totals',
      code: 'AMOUNTS_INCONSISTENT',
      severity: 'error',
      message: `Incohérence montants : HT(${data.totals.netAmount}) + TVA(${data.totals.taxAmount}) ≠ TTC(${data.totals.grossAmount})`
    });
  }
  
  // Règle 5 : BuyerReference OU OrderReference
  if (!data.buyerReference && !data.orderReference) {
    errors.push({
      field: 'references',
      code: 'REFERENCE_MISSING',
      severity: 'error',
      message: 'BuyerReference ou OrderReference obligatoire (règle Peppol R003)'
    });
  }
  
  // Règle 6 : BCE fournisseur (10 chiffres) - Warning si manquant
  if (!data.seller.bceNumber || !/^\d{10}$/.test(data.seller.bceNumber)) {
    errors.push({
      field: 'seller.bceNumber',
      code: 'BCE_MISSING',
      severity: 'warning',
      message: 'Numéro BCE fournisseur manquant ou invalide (10 chiffres)'
    });
  }
  
  return errors;
}

function convertToISO(dateStr: string): string {
  // Trim whitespace and newlines first
  const cleaned = dateStr.trim();
  
  // Check if already ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Try to parse various formats
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    // If first part is 4 digits, assume year-first format
    if (parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Otherwise assume DD/MM/YYYY format
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return cleaned;
}
