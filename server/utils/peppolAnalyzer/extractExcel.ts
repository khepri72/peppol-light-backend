import fs from 'fs';
import * as XLSX from 'xlsx';

export function extractExcelData(filePath: string) {
  const buffer = fs.readFileSync(filePath);

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (!rows.length) {
    throw new Error('Fichier Excel vide');
  }

  const row = rows[0] as Record<string, any>;

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
