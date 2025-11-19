import * as pdfParse from 'pdf-parse';
import fs from 'fs';
import { InvoiceData } from './types';

export async function extractPdfData(pdfPath: string): Promise<InvoiceData> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await (pdfParse as any)(dataBuffer);
  const text = pdfData.text;
  
  // Extraction par regex (patterns simples)
  const invoiceNumber = text.match(/(?:Facture|Invoice)\s*n?[°o]?\s*:?\s*([A-Z0-9\-\/]+)/i)?.[1] || '';
  
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  const issueDate = dateMatch?.[1] || '';
  
  const vatMatch = text.match(/BE\s*0?\d{9,10}/i);
  const sellerVat = vatMatch?.[0]?.replace(/\s/g, '') || '';
  
  // Extraction montants (chercher "Total HT", "TVA", "Total TTC")
  const netAmountMatch = text.match(/(?:Total\s*HT|Net\s*Amount)[:\s]*([0-9.,]+)/i);
  const taxAmountMatch = text.match(/(?:TVA|VAT|Tax)[:\s]*([0-9.,]+)/i);
  const grossAmountMatch = text.match(/(?:Total\s*TTC|Gross\s*Amount|Total)[:\s]*([0-9.,]+)/i);
  
  return {
    invoiceNumber,
    issueDate,
    currency: 'EUR',
    seller: {
      name: '', // À améliorer avec parsing plus avancé
      vatNumber: sellerVat,
      address: { country: 'BE' }
    },
    buyer: {
      name: ''
    },
    lines: [], // Extraction lignes = complexe, à améliorer
    totals: {
      netAmount: parseFloat(netAmountMatch?.[1]?.replace(',', '.') || '0'),
      taxAmount: parseFloat(taxAmountMatch?.[1]?.replace(',', '.') || '0'),
      grossAmount: parseFloat(grossAmountMatch?.[1]?.replace(',', '.') || '0')
    }
  };
}
