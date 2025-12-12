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

  const invoiceNumber = norm(row['Numéro'] || row['Invoice'] || row['Facture']);
  const issueDate = norm(row['Date'] || row['Invoice Date']);
  const sellerName = norm(row['Fournisseur'] || row['Seller']);
  const sellerVat = vat(row['TVA Fournisseur'] || row['Seller VAT']);
  const buyerName = norm(row['Client'] || row['Buyer']);
  const buyerVat = vat(row['TVA Client'] || row['Buyer VAT']);

  const netAmount = amt(row['Total HT'] || row['Net']);
  const taxAmount = amt(row['TVA'] || row['Tax']);
  const grossAmount =
    amt(row['Total TTC'] || row['Total']) || netAmount + taxAmount;

  return {
    invoiceNumber: invoiceNumber || `EXCEL-${Date.now()}`,
    issueDate,
    currency: 'EUR',

    seller: {
      name: sellerName || '',
      vatNumber: sellerVat || '',
      address: { country: 'BE' }
    },

    buyer: {
      name: buyerName || '',
      vatNumber: buyerVat || '',
      address: { country: 'BE' }
    },

    lines: netAmount
      ? [
          {
            id: '1',
            description: 'Import Excel',
            quantity: 1,
            unitPrice: netAmount,
            vatRate: 21,
            lineTotal: netAmount
          }
        ]
      : [],

    totals: {
      netAmount,
      taxAmount,
      grossAmount
    }
  };
}
