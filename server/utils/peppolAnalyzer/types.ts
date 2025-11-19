export interface InvoiceData {
  // En-tête
  invoiceNumber: string;
  issueDate: string;           // Format libre initial
  issueDateISO?: string;       // Converti en YYYY-MM-DD
  currency: string;            // "EUR" par défaut
  
  // Fournisseur
  seller: {
    name: string;
    vatNumber: string;         // Format BE + 10 chiffres
    bceNumber?: string;        // 10 chiffres
    address: {
      street?: string;
      city?: string;
      postalCode?: string;
      country: string;         // "BE" par défaut
    };
  };
  
  // Client
  buyer: {
    name: string;
    vatNumber?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  
  // Références
  buyerReference?: string;
  orderReference?: string;
  
  // Lignes
  lines: InvoiceLine[];
  
  // Totaux
  totals: {
    netAmount: number;         // HT
    taxAmount: number;         // TVA
    grossAmount: number;       // TTC
  };
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;             // 21 par défaut (21%)
  lineTotal: number;
}

export interface ValidationResult {
  field: string;
  code: string;                // Ex: "VAT_INVALID"
  severity: "error" | "warning";
  message: string;
}
