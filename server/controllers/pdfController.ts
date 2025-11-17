import { Response } from 'express';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from '../middlewares/auth';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

export const generateInvoicePDFEndpoint = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const invoiceRecord = await base(TABLES.INVOICES).find(id);

    if (invoiceRecord.fields.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    const userRecord = await base(TABLES.USERS).find(userId);

    const settingsRecords = await base(TABLES.USER_SETTINGS)
      .select({
        filterByFormula: buildSafeFilterFormula('userId', userId),
        maxRecords: 1,
      })
      .firstPage();

    const settings = settingsRecords.length > 0 ? {
      primaryColor: settingsRecords[0].fields.primaryColor as string || undefined,
      companyAddress: settingsRecords[0].fields.companyAddress as string || undefined,
      companyPhone: settingsRecords[0].fields.companyPhone as string || undefined,
      footerText: settingsRecords[0].fields.footerText as string || undefined,
    } : undefined;

    const invoice = {
      id: invoiceRecord.id,
      userId: invoiceRecord.fields.userId as string,
      invoiceNumber: invoiceRecord.fields.invoiceNumber as string,
      clientName: invoiceRecord.fields.clientName as string,
      clientEmail: invoiceRecord.fields.clientEmail as string,
      amount: invoiceRecord.fields.amount as number,
      currency: invoiceRecord.fields.currency as string,
      status: invoiceRecord.fields.status as 'draft' | 'sent' | 'paid' | 'overdue',
      dueDate: invoiceRecord.fields.dueDate as string,
      items: JSON.parse((invoiceRecord.fields.items as string) || '[]'),
      notes: invoiceRecord.fields.notes as string | undefined,
      pdfUrl: invoiceRecord.fields.pdfUrl as string | undefined,
      createdAt: invoiceRecord.fields.createdAt as string,
      updatedAt: invoiceRecord.fields.updatedAt as string,
    };

    const doc = generateInvoicePDF({
      invoice,
      companyName: (userRecord.fields.companyName as string) || 'Your Company',
      settings,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    console.error('Generate PDF error:', error);

    if (error.statusCode === 404 || error.message?.includes('NOT_FOUND')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
