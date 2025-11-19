import XLSX from 'xlsx';
import { InvoiceData } from './types';

function normalizeAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value);
  // Remove all types of spaces, apostrophes (regular, typographic), and currency symbols
  let cleaned = str
    .replace(/[\s\u00A0\u2009\u202F'\u2019\u02BC]/g, '')
    .replace(/[€$£]/g, '');
  
  // Detect format
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  
  if (lastComma > lastDot) {
    // EU format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma >= 0 && lastDot < 0) {
    // Only comma: assume EU decimal
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
}

export function extractExcelData(excelPath: string): InvoiceData {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  // Supposer colonnes type :
  // "Numéro facture", "Date", "Client", "Description", "Quantité", "Prix unitaire", "TVA %", "Total HT", "Total TTC"
  
  const firstRow = rows[0] as any;
  
  return {
    invoiceNumber: firstRow['Numéro facture'] || firstRow['Invoice Number'] || '',
    issueDate: firstRow['Date'] || '',
    currency: 'EUR',
    buyerReference: firstRow['Référence client'] || firstRow['Buyer Reference'] || undefined,
    orderReference: firstRow['Référence commande'] || firstRow['Order Reference'] || undefined,
    seller: {
      name: firstRow['Nom fournisseur'] || firstRow['Seller Name'] || 'Seller',
      vatNumber: firstRow['TVA Fournisseur'] || firstRow['Seller VAT'] || '',
      bceNumber: firstRow['BCE Fournisseur'] || firstRow['Seller BCE'] || undefined,
      address: { country: 'BE' }
    },
    buyer: {
      name: firstRow['Client'] || firstRow['Buyer Name'] || ''
    },
    lines: rows.map((row: any, index) => ({
      id: String(index + 1),
      description: row['Description'] || '',
      quantity: normalizeAmount(row['Quantité'] || row['Quantity'] || '1'),
      unitPrice: normalizeAmount(row['Prix unitaire'] || row['Unit Price'] || '0'),
      vatRate: normalizeAmount(row['TVA %'] || row['VAT %'] || '21'),
      lineTotal: normalizeAmount(row['Total ligne'] || '0')
    })),
    totals: {
      netAmount: normalizeAmount(firstRow['Total HT'] || '0'),
      taxAmount: normalizeAmount(firstRow['TVA'] || '0'),
      grossAmount: normalizeAmount(firstRow['Total TTC'] || '0')
    }
  };
}
