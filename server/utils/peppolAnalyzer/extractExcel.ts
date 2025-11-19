import XLSX from 'xlsx';
import { InvoiceData } from './types';

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
    seller: {
      name: '',
      vatNumber: firstRow['TVA Fournisseur'] || '',
      address: { country: 'BE' }
    },
    buyer: {
      name: firstRow['Client'] || ''
    },
    lines: rows.map((row: any, index) => ({
      id: String(index + 1),
      description: row['Description'] || '',
      quantity: parseFloat(row['Quantité'] || row['Quantity'] || '1'),
      unitPrice: parseFloat(row['Prix unitaire'] || row['Unit Price'] || '0'),
      vatRate: parseFloat(row['TVA %'] || row['VAT %'] || '21'),
      lineTotal: parseFloat(row['Total ligne'] || '0')
    })),
    totals: {
      netAmount: parseFloat(firstRow['Total HT'] || '0'),
      taxAmount: parseFloat(firstRow['TVA'] || '0'),
      grossAmount: parseFloat(firstRow['Total TTC'] || '0')
    }
  };
}
