import { InvoiceData } from './types';

/**
 * Erreur de validation pour champ manquant/invalide
 */
export interface InvoiceValidationError {
  field: string;
  message: string;
}

/**
 * Valide que tous les champs critiques sont présents pour générer un XML Peppol conforme.
 * @param invoice - Les données extraites de la facture
 * @returns Liste des erreurs de validation (vide si tout est OK)
 */
export function validateInvoiceForPeppol(invoice: InvoiceData): InvoiceValidationError[] {
  const errors: InvoiceValidationError[] = [];

  // Fournisseur
  if (!invoice.seller?.name || invoice.seller.name.trim() === '') {
    errors.push({ 
      field: 'supplierName', 
      message: 'Nom du fournisseur manquant.' 
    });
  }

  if (!invoice.seller?.vatNumber || invoice.seller.vatNumber.trim() === '') {
    errors.push({ 
      field: 'supplierVat', 
      message: 'Numéro de TVA du fournisseur manquant.' 
    });
  }

  // Client
  if (!invoice.buyer?.name || invoice.buyer.name.trim() === '') {
    errors.push({ 
      field: 'customerName', 
      message: 'Nom du client manquant.' 
    });
  }

  // Note: customerVat est optionnel dans Peppol pour certains cas (B2C)
  // mais on peut l'ajouter comme warning si nécessaire

  // Numéro et date de facture
  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
    errors.push({ 
      field: 'invoiceNumber', 
      message: 'Numéro de facture manquant.' 
    });
  }

  if (!invoice.issueDate || invoice.issueDate.trim() === '') {
    errors.push({ 
      field: 'invoiceDate', 
      message: 'Date de facture manquante.' 
    });
  }

  // Totaux
  const totalAmount = invoice.totals?.grossAmount;
  if (totalAmount == null || isNaN(totalAmount)) {
    errors.push({ 
      field: 'totalAmount', 
      message: 'Montant total TTC manquant ou invalide.' 
    });
  }

  const vatAmount = invoice.totals?.taxAmount;
  if (vatAmount == null || isNaN(vatAmount)) {
    errors.push({ 
      field: 'vatAmount', 
      message: 'Montant de TVA manquant ou invalide.' 
    });
  }

  // Montant HT (optionnel mais recommandé)
  const netAmount = invoice.totals?.netAmount;
  if (netAmount == null || isNaN(netAmount)) {
    errors.push({ 
      field: 'netAmount', 
      message: 'Montant HT manquant ou invalide.' 
    });
  }

  return errors;
}

