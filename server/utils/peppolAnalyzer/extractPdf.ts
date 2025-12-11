import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import { InvoiceData } from './types';

/**
 * Normalise un montant (string) en nombre
 * Gère les formats: 6,31 | 6.31 | 1.234,56 | 1,234.56
 */
function normalizeAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove all types of spaces, apostrophes (regular, typographic), and currency symbols
  let cleaned = amountStr
    .replace(/[\s\u00A0\u2009\u202F'\u2019\u02BC]/g, '')
    .replace(/[€$£EUR]/gi, '')
    .trim();
  
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
  
  const result = parseFloat(cleaned) || 0;
  console.log(`[EXTRACT] normalizeAmount: "${amountStr}" → ${result}`);
  return result;
}

/**
 * Convertit une date DD/MM/YYYY ou DD-MM-YYYY en ISO YYYY-MM-DD
 */
function convertToISODate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Already ISO format?
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const match = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = (parseInt(year) > 50 ? '19' : '20') + year;
    }
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

/**
 * Normalise un numéro de TVA belge
 * Formats acceptés: BE0123.456.789, BE 0123 456 789, BE0123456789
 * Retourne: BE0123456789 (format sans points ni espaces)
 */
function normalizeVatNumber(vatStr: string): string {
  if (!vatStr) return '';
  
  // Remove all spaces, dots, and dashes
  let cleaned = vatStr.replace(/[\s.\-]/g, '').toUpperCase();
  
  // Ensure it starts with BE
  if (!cleaned.startsWith('BE')) {
    cleaned = 'BE' + cleaned;
  }
  
  return cleaned;
}

/**
 * Extrait les données d'une facture PDF
 * Avec logging détaillé pour debug
 */
export async function extractPdfData(pdfPath: string): Promise<InvoiceData> {
  console.log('[EXTRACT] ========================================');
  console.log('[EXTRACT] Début extraction PDF:', pdfPath);
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  const text = pdfData.text;
  
  // ========================================
  // DEBUG: Afficher le texte brut extrait
  // ========================================
  console.log('[EXTRACT] RAW TEXT START');
  console.log(text);
  console.log('[EXTRACT] RAW TEXT END');
  console.log('[EXTRACT] ----------------------------------------');
  
  // ========================================
  // EXTRACTION: Numéro de facture
  // ========================================
  // Patterns: "Facture n° XXX", "Invoice: XXX", "Numero de facture : XXX", etc.
  const invoiceNumberPatterns = [
    /(?:Num[ée]ro\s*de\s*facture|Facture\s*n[°o]?|Invoice\s*(?:number|n[°o])?|N[°o]\s*facture)[:\s]*([A-Z0-9\-\/]+)/i,
    /(?:Facture|Invoice)[:\s]*([A-Z0-9\-\/]+)/i,
  ];
  
  let invoiceNumber = '';
  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      invoiceNumber = match[1].trim();
      console.log(`[EXTRACT] invoiceNumber trouvé avec pattern: ${pattern}`);
      break;
    }
  }
  console.log(`[EXTRACT] invoiceNumber: "${invoiceNumber}"`);
  
  // ========================================
  // EXTRACTION: Date de facture
  // ========================================
  const datePatterns = [
    /(?:Date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  let issueDate = '';
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      issueDate = match[1].trim();
      console.log(`[EXTRACT] date trouvée avec pattern: ${pattern}`);
      break;
    }
  }
  const issueDateISO = convertToISODate(issueDate);
  console.log(`[EXTRACT] issueDate: "${issueDate}" → ISO: "${issueDateISO}"`);
  
  // ========================================
  // EXTRACTION: Fournisseur (Seller)
  // ========================================
  // Nom du fournisseur
  const sellerNamePatterns = [
    /(?:Fournisseur|Vendeur|Seller|From)[:\s]*([^\n\r]+)/i,
    /(?:FACTURE\s*FOURNISSEUR)[^\n]*\n+([^\n]+)/i,
  ];
  
  let sellerName = '';
  for (const pattern of sellerNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sellerName = match[1].trim();
      // Nettoyer si le nom contient des infos supplémentaires
      sellerName = sellerName.split(/\s*[-–]\s*/)[0].trim();
      if (sellerName.length > 3 && !sellerName.match(/^(TVA|BE|Client)/i)) {
        console.log(`[EXTRACT] sellerName trouvé avec pattern: ${pattern}`);
        break;
      }
      sellerName = '';
    }
  }
  console.log(`[EXTRACT] sellerName: "${sellerName}"`);
  
  // TVA Fournisseur
  const sellerVatPatterns = [
    /(?:TVA\s*Fournisseur|TVA\s*Vendeur|Seller\s*VAT|VAT\s*Seller)[:\s]*(BE[\s\d.\-]+)/i,
    /(?:Fournisseur|Vendeur|Seller)[^]*?(?:TVA|VAT)[:\s]*(BE[\s\d.\-]+)/i,
  ];
  
  let sellerVat = '';
  for (const pattern of sellerVatPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sellerVat = normalizeVatNumber(match[1]);
      console.log(`[EXTRACT] sellerVat trouvé avec pattern: ${pattern}`);
      break;
    }
  }
  
  // Fallback: premier numéro TVA trouvé si pas de TVA fournisseur explicite
  if (!sellerVat) {
    const firstVatMatch = text.match(/BE\s*0?[\d.\s\-]{9,14}/i);
    if (firstVatMatch) {
      sellerVat = normalizeVatNumber(firstVatMatch[0]);
      console.log('[EXTRACT] sellerVat fallback (premier TVA trouvé)');
    }
  }
  console.log(`[EXTRACT] sellerVat: "${sellerVat}"`);
  
  // ========================================
  // EXTRACTION: Client (Buyer)
  // ========================================
  // Nom du client
  const buyerNamePatterns = [
    /(?:Client|Acheteur|Buyer|To|Destinataire)[:\s]*([^\n\r]+)/i,
  ];
  
  let buyerName = '';
  for (const pattern of buyerNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      buyerName = match[1].trim();
      // Nettoyer
      buyerName = buyerName.split(/\s*[-–]\s*/)[0].trim();
      if (buyerName.length > 2 && !buyerName.match(/^(TVA|BE)/i)) {
        console.log(`[EXTRACT] buyerName trouvé avec pattern: ${pattern}`);
        break;
      }
      buyerName = '';
    }
  }
  console.log(`[EXTRACT] buyerName: "${buyerName}"`);
  
  // TVA Client
  const buyerVatPatterns = [
    /(?:TVA\s*Client|TVA\s*Acheteur|Buyer\s*VAT|VAT\s*Client|VAT\s*Buyer)[:\s]*(BE[\s\d.\-]+)/i,
    /(?:Client|Acheteur|Buyer)[^]*?(?:TVA|VAT)[:\s]*(BE[\s\d.\-]+)/i,
  ];
  
  let buyerVat = '';
  for (const pattern of buyerVatPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      buyerVat = normalizeVatNumber(match[1]);
      console.log(`[EXTRACT] buyerVat trouvé avec pattern: ${pattern}`);
      break;
    }
  }
  console.log(`[EXTRACT] buyerVat: "${buyerVat}"`);
  
  // ========================================
  // EXTRACTION: Références
  // ========================================
  const buyerRefMatch = text.match(/(?:R[ée]f[ée]rence\s*client|Client\s*reference|BuyerReference)[:\s]*([A-Z0-9\-\/\._]+)/i);
  const buyerReference = buyerRefMatch?.[1]?.trim() || undefined;
  
  const orderRefMatch = text.match(/(?:R[ée]f[ée]rence\s*commande|Order\s*reference|OrderReference|Commande)[:\s]*([A-Z0-9\-\/\._]+)/i);
  const orderReference = orderRefMatch?.[1]?.trim() || undefined;
  
  console.log(`[EXTRACT] buyerReference: "${buyerReference || 'N/A'}"`);
  console.log(`[EXTRACT] orderReference: "${orderReference || 'N/A'}"`);
  
  // ========================================
  // EXTRACTION: BCE Number
  // ========================================
  const bceMatch = text.match(/(?:BCE|Num[ée]ro\s*BCE|N[°o]\s*BCE)[:\s]*([0-9]{10})/i);
  const bceNumber = bceMatch?.[1] || undefined;
  console.log(`[EXTRACT] bceNumber: "${bceNumber || 'N/A'}"`);
  
  // ========================================
  // EXTRACTION: Montants
  // ========================================
  // Total HT (Net Amount)
  const netAmountPatterns = [
    /(?:Total\s*HT|Total\s*hors\s*taxe|Net\s*Amount|Sous-total\s*HT)[:\s]*([0-9\s.,€$£]+)/i,
  ];
  
  let netAmountStr = '';
  for (const pattern of netAmountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      netAmountStr = match[1];
      console.log(`[EXTRACT] netAmount trouvé avec pattern: ${pattern}`);
      break;
    }
  }
  
  // TVA (Tax Amount)
  const taxAmountPatterns = [
    /(?:TVA\s*\(\d+%?\)|TVA\s*\d+%?|VAT|Montant\s*TVA)[:\s]*([0-9\s.,€$£]+)/i,
    /(?:TVA)[:\s]*([0-9\s.,€$£]+)/i,
  ];
  
  let taxAmountStr = '';
  for (const pattern of taxAmountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Éviter de matcher "TVA Client" ou "TVA Fournisseur"
      if (!match[0].match(/TVA\s*(Client|Fournisseur|Vendeur|Buyer|Seller)/i)) {
        taxAmountStr = match[1];
        console.log(`[EXTRACT] taxAmount trouvé avec pattern: ${pattern}`);
        break;
      }
    }
  }
  
  // Total TTC (Gross Amount)
  const grossAmountPatterns = [
    /(?:Total\s*TTC|Total\s*toutes\s*taxes|Gross\s*Amount|Montant\s*total|Total\s*[àa]\s*payer)[:\s]*([0-9\s.,€$£]+)/i,
    /(?:Total)[:\s]*([0-9\s.,€$£]+)(?:\s*EUR)?$/im,
  ];
  
  let grossAmountStr = '';
  for (const pattern of grossAmountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      grossAmountStr = match[1];
      console.log(`[EXTRACT] grossAmount trouvé avec pattern: ${pattern}`);
      break;
    }
  }
  
  let netAmount = normalizeAmount(netAmountStr);
  let taxAmount = normalizeAmount(taxAmountStr);
  let grossAmount = normalizeAmount(grossAmountStr);
  
  console.log(`[EXTRACT] Montants bruts: HT="${netAmountStr}" TVA="${taxAmountStr}" TTC="${grossAmountStr}"`);
  console.log(`[EXTRACT] Montants normalisés: HT=${netAmount} TVA=${taxAmount} TTC=${grossAmount}`);
  
  // Si on a TTC mais pas HT, calculer HT
  if (grossAmount > 0 && netAmount === 0 && taxAmount > 0) {
    netAmount = grossAmount - taxAmount;
    console.log(`[EXTRACT] HT calculé: ${grossAmount} - ${taxAmount} = ${netAmount}`);
  }
  
  // Si on a HT et TVA mais pas TTC, calculer TTC
  if (netAmount > 0 && taxAmount > 0 && grossAmount === 0) {
    grossAmount = netAmount + taxAmount;
    console.log(`[EXTRACT] TTC calculé: ${netAmount} + ${taxAmount} = ${grossAmount}`);
  }
  
  // ========================================
  // CONSTRUCTION: Lignes de facture
  // ========================================
  const lines = [];
  if (netAmount > 0 || grossAmount > 0) {
    const effectiveNetAmount = netAmount > 0 ? netAmount : (grossAmount / 1.21);
    const vatRate = (netAmount > 0 && taxAmount > 0) 
      ? Math.round((taxAmount / netAmount) * 100) 
      : 21;
    
    lines.push({
      id: '1',
      description: 'Services / Produits (extrait du PDF)',
      quantity: 1,
      unitPrice: effectiveNetAmount,
      vatRate,
      lineTotal: effectiveNetAmount
    });
  }
  
  // ========================================
  // CONSTRUCTION: Objet InvoiceData final
  // ========================================
  const invoiceData: InvoiceData = {
    invoiceNumber,
    issueDate,
    issueDateISO,
    currency: 'EUR',
    buyerReference,
    orderReference,
    seller: {
      name: sellerName || 'Fournisseur non identifié',
      vatNumber: sellerVat,
      bceNumber,
      address: { country: 'BE' }
    },
    buyer: {
      name: buyerName || 'Client non identifié',
      vatNumber: buyerVat || undefined,
      address: { country: 'BE' }
    },
    lines,
    totals: {
      netAmount,
      taxAmount,
      grossAmount
    }
  };
  
  // ========================================
  // DEBUG: Afficher l'objet final
  // ========================================
  console.log('[EXTRACT] ----------------------------------------');
  console.log('[EXTRACT] INVOICE DATA:');
  console.log(JSON.stringify(invoiceData, null, 2));
  console.log('[EXTRACT] ========================================');
  
  return invoiceData;
}
