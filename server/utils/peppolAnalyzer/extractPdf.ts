import * as pdfParse from 'pdf-parse';
import fs from 'fs';
import { InvoiceData } from './types';

function normalizeAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove all types of spaces, apostrophes (regular, typographic), and currency symbols
  let cleaned = amountStr
    .replace(/[\s\u00A0\u2009\u202F'\u2019\u02BC]/g, '')
    .replace(/[€$£]/g, '');
  
  // Detect format: if last comma before last dot, it's EU format (1.234,56)
  // Otherwise if last dot before last comma, it's US format (1,234.56)
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  
  if (lastComma > lastDot) {
    // EU format: 1.234,56 or 1234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma >= 0 && lastDot < 0) {
    // Only comma: assume EU decimal (1234,56)
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
}

export async function extractPdfData(pdfPath: string): Promise<InvoiceData> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await (pdfParse as any)(dataBuffer);
  const text = pdfData.text;
  
  // Extraction par regex (patterns simples)
  const invoiceNumber = text.match(/(?:Facture|Invoice)\s*n?[°o]?\s*:?\s*([A-Z0-9\-\/]+)/i)?.[1]?.trim() || '';
  
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/);
  const issueDate = dateMatch?.[1]?.trim() || '';
  
  const vatMatch = text.match(/BE\s*0?\d{9,10}/i);
  const sellerVat = vatMatch?.[0]?.replace(/\s/g, '') || '';
  
  // Extract buyer/order reference (relaxed patterns)
  const buyerRefMatch = text.match(/(?:Référence\s*client|Client\s*reference|BuyerReference)[:\s]*([A-Z0-9\-\/\._]+)/i);
  const buyerReference = buyerRefMatch?.[1]?.trim() || undefined;
  
  const orderRefMatch = text.match(/(?:Référence\s*commande|Order\s*reference|OrderReference)[:\s]*([A-Z0-9\-\/\._]+)/i);
  const orderReference = orderRefMatch?.[1]?.trim() || undefined;
  
  // Extract BCE number
  const bceMatch = text.match(/(?:BCE|Numéro\s*BCE|N°\s*BCE)[:\s]*([0-9]{10})/i);
  const bceNumber = bceMatch?.[1] || undefined;
  
  // Extraction montants (chercher "Total HT", "TVA", "Total TTC")
  const netAmountMatch = text.match(/(?:Total\s*HT|Net\s*Amount)[:\s]*([0-9\s.,€$£]+)/i);
  const taxAmountMatch = text.match(/(?:TVA|VAT|Tax)[:\s]*([0-9\s.,€$£]+)/i);
  const grossAmountMatch = text.match(/(?:Total\s*TTC|Gross\s*Amount|Total)[:\s]*([0-9\s.,€$£]+)/i);
  
  let netAmount = normalizeAmount(netAmountMatch?.[1] || '0');
  let taxAmount = normalizeAmount(taxAmountMatch?.[1] || '0');
  let grossAmount = normalizeAmount(grossAmountMatch?.[1] || '0');
  
  // Create at least one line if totals exist (simplified for prototype)
  const lines = [];
  if (netAmount > 0 || grossAmount > 0) {
    // If only gross exists, back-calculate net assuming 21% VAT
    if (netAmount === 0 && grossAmount > 0) {
      netAmount = grossAmount / 1.21;
      taxAmount = grossAmount - netAmount;
    }
    
    lines.push({
      id: '1',
      description: 'Services (extracted from PDF)',
      quantity: 1,
      unitPrice: netAmount,
      vatRate: taxAmount > 0 ? Math.round((taxAmount / netAmount) * 100) : 21,
      lineTotal: netAmount
    });
  }
  
  return {
    invoiceNumber,
    issueDate,
    currency: 'EUR',
    buyerReference,
    orderReference,
    seller: {
      name: 'Extracted Seller',
      vatNumber: sellerVat,
      bceNumber,
      address: { country: 'BE' }
    },
    buyer: {
      name: 'Extracted Buyer'
    },
    lines,
    totals: {
      netAmount,
      taxAmount,
      grossAmount
    }
  };
}
