import fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * Détecte l'index de la première ligne de données (pas les en-têtes dupliqués)
 * Critères: >= 5 valeurs non vides, <= 1 valeur ressemblant à un en-tête
 */
function detectDataRowIndex(rows: any[]): number {
  const headerPatterns = /^(supplier|customer|client|fournisseur|invoice|facture|vat|tva|date|amount|total|net|tax|buyer|seller|numéro|numero)/i;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, any>;
    const keys = Object.keys(row);
    const values = keys.map(k => String(row[k] || '').trim()).filter(v => v !== '');
    
    const nonEmptyCount = values.length;
    
    // Compte les valeurs qui ressemblent à des noms d'en-têtes
    const headerLikeCount = values.filter(v => headerPatterns.test(v)).length;
    
    // Compte les valeurs qui sont très similaires aux noms de colonnes (ex: valeur "SupplierName" pour clé "SupplierName")
    const sameAsKeyCount = values.filter(v => {
      const vNorm = v.toLowerCase().replace(/[^a-z0-9]/g, '');
      return keys.some(k => {
        const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return vNorm === kNorm || (vNorm.length > 3 && kNorm.includes(vNorm)) || (kNorm.length > 3 && vNorm.includes(kNorm));
      });
    }).length;
    
    console.log(`[EXTRACT EXCEL] Row ${i}: nonEmpty=${nonEmptyCount}, headerLike=${headerLikeCount}, sameAsKey=${sameAsKeyCount}`);
    
    // Ligne de données: beaucoup de valeurs, peu qui ressemblent à des en-têtes
    if (nonEmptyCount >= 5 && headerLikeCount <= 1 && sameAsKeyCount <= 1) {
      return i;
    }
  }
  
  // Fallback: première ligne si aucune ne correspond
  console.warn('[EXTRACT EXCEL] ⚠️ Aucune ligne de données détectée, fallback sur row 0');
  return 0;
}

export function extractExcelData(filePath: string) {
  console.log('[EXTRACT EXCEL] Start:', filePath);
  
  const buffer = fs.readFileSync(filePath);

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  console.log('[EXTRACT EXCEL] Total rows:', rows.length);

  if (!rows.length) {
    throw new Error('Fichier Excel vide');
  }

  const dataRowIndex = detectDataRowIndex(rows);
  const row = rows[dataRowIndex] as Record<string, any>;
  
  console.log('[EXTRACT EXCEL] Selected row index:', dataRowIndex);
  const sampleValues = Object.entries(row)
    .filter(([, v]) => String(v || '').trim() !== '')
    .slice(0, 5)
    .map(([k, v]) => `${k}="${v}"`)
    .join(', ');
  console.log('[EXTRACT EXCEL] Sample values:', sampleValues);

  const norm = (v: any) => String(v || '').trim();
  const vat = (v: any) => norm(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const amt = (v: any) =>
    Number(
      norm(v)
        .replace(/[^\d,.-]/g, '')
        .replace(',', '.')
    ) || 0;

  // Fonction pour chercher une valeur avec plusieurs noms de colonnes possibles
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
        return row[k];
      }
    }
    return '';
  };

  // ========================================
  // EXTRACTION CHAMPS (mapping étendu FR/EN)
  // ========================================
  const invoiceNumber = norm(getVal(
    'InvoiceNumber', 'Invoice Number', 'Invoice', 'Numéro', 'Numero', 'Facture', 
    'N° Facture', 'NumeroFacture', 'FactureNo'
  ));
  
  const issueDate = norm(getVal(
    'InvoiceDate', 'Invoice Date', 'Date', 'DateFacture', 'Date Facture', 
    'IssueDate', 'Datum'
  ));
  
  const sellerName = norm(getVal(
    'SupplierName', 'Supplier Name', 'Supplier', 'SellerName', 'Seller Name', 'Seller',
    'Fournisseur', 'Nom Fournisseur', 'NomFournisseur', 'Vendeur'
  ));
  
  const sellerVat = vat(getVal(
    'SupplierVAT', 'Supplier VAT', 'SupplierVatNumber', 'SellerVAT', 'Seller VAT',
    'TVA Fournisseur', 'TVAFournisseur', 'VATFournisseur', 'NumeroTVA'
  ));
  
  const sellerBce = norm(getVal(
    'SupplierBCE', 'BCE', 'BCEFournisseur', 'CompanyNumber'
  ));
  
  const buyerName = norm(getVal(
    'CustomerName', 'Customer Name', 'Customer', 'BuyerName', 'Buyer Name', 'Buyer',
    'Client', 'Nom Client', 'NomClient', 'Acheteur'
  ));
  
  const buyerVat = vat(getVal(
    'CustomerVAT', 'Customer VAT', 'CustomerVatNumber', 'BuyerVAT', 'Buyer VAT',
    'TVA Client', 'TVAClient', 'VATClient'
  ));
  
  const buyerReference = norm(getVal(
    'BuyerReference', 'Buyer Reference', 'Reference', 'Référence', 'RefClient',
    'CustomerReference', 'YourReference'
  ));
  
  const orderReference = norm(getVal(
    'OrderReference', 'Order Reference', 'PO', 'PurchaseOrder', 'Commande',
    'NumeroCommande', 'OrderNumber'
  ));
  
  const currency = norm(getVal(
    'Currency', 'Devise', 'Valuta'
  ));
  
  const netAmount = amt(getVal(
    'NetAmount', 'Net Amount', 'Net', 'TotalHT', 'Total HT', 'HT',
    'Subtotal', 'SubTotal', 'ExclVAT', 'ExclTax'
  ));
  
  const taxAmount = amt(getVal(
    'TaxAmount', 'Tax Amount', 'Tax', 'VAT', 'VATAmount', 'TVA', 
    'MontantTVA', 'Montant TVA'
  ));
  
  const grossAmount = amt(getVal(
    'GrossAmount', 'Gross Amount', 'Gross', 'TotalTTC', 'Total TTC', 'TTC',
    'Total', 'GrandTotal', 'InclVAT', 'InclTax'
  )) || (netAmount + taxAmount);

  // ========================================
  // LOGS DE DEBUG
  // ========================================
  console.log('[EXTRACT EXCEL] Extracted values:');
  console.log('  invoiceNumber:', invoiceNumber);
  console.log('  issueDate:', issueDate);
  console.log('  sellerName:', sellerName);
  console.log('  sellerVat:', sellerVat);
  console.log('  buyerName:', buyerName);
  console.log('  buyerVat:', buyerVat);
  console.log('  netAmount:', netAmount);
  console.log('  taxAmount:', taxAmount);
  console.log('  grossAmount:', grossAmount);

  // ========================================
  // CONSTRUCTION STRUCTURE FINALE
  // ========================================
  const invoiceData = {
    invoiceNumber: invoiceNumber || `EXCEL-${Date.now()}`,
    issueDate: issueDate || new Date().toISOString().slice(0, 10),
    issueDateISO: issueDate || undefined,
    currency: currency || 'EUR',
    buyerReference: buyerReference || `AUTO-REF-${Date.now()}`,
    orderReference: orderReference || undefined,
    seller: {
      name: sellerName,
      vatNumber: sellerVat,
      bceNumber: sellerBce || undefined,
      address: { country: 'BE' }
    },
    buyer: {
      name: buyerName,
      vatNumber: buyerVat,
      address: { country: 'BE' }
    },
    lines: [{
      id: '1',
      description: 'Articles/Services (Excel)',
      quantity: 1,
      unitPrice: netAmount > 0 ? netAmount : grossAmount,
      vatRate: 21,
      lineTotal: netAmount > 0 ? netAmount : grossAmount
    }],
    totals: {
      netAmount: netAmount,
      taxAmount: taxAmount,
      grossAmount: grossAmount
    }
  };

  console.log('[EXTRACT EXCEL] FINAL STRUCTURE', JSON.stringify(invoiceData, null, 2));

  return invoiceData;
}
