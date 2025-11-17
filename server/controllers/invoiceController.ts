import { Request, Response } from 'express';
import { base, TABLES } from '../config/airtable';
import { insertInvoiceSchema, updateInvoiceSchema } from '../../shared/schema';
import { AuthRequest } from '../middlewares/auth';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const validatedData = insertInvoiceSchema.parse(req.body);

    const records = await base(TABLES.INVOICES).create([
      {
        fields: {
          userId,
          invoiceNumber: validatedData.invoiceNumber,
          clientName: validatedData.clientName,
          clientEmail: validatedData.clientEmail,
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: validatedData.status,
          dueDate: validatedData.dueDate,
          items: JSON.stringify(validatedData.items),
          notes: validatedData.notes || '',
          pdfUrl: validatedData.pdfUrl || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ]);

    const invoice = records[0];

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: {
        id: invoice.id,
        ...invoice.fields,
        items: JSON.parse(invoice.fields.items as string),
      },
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { status } = req.query;

    // Build filter formula
    let filterFormula = buildSafeFilterFormula('userId', userId);
    
    // Add status filter if provided
    if (status !== undefined) {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue'];
      const statusArray = Array.isArray(status) ? status : [status];
      
      // Validate all status values - reject nested arrays/objects
      const validatedStatuses: string[] = [];
      for (const s of statusArray) {
        // Strict type check: must be a plain string, not array or object
        if (typeof s !== 'string' || Array.isArray(s)) {
          return res.status(400).json({ 
            error: 'Invalid status parameter. All status values must be plain strings.' 
          });
        }
        if (!validStatuses.includes(s)) {
          return res.status(400).json({ 
            error: `Invalid status "${s}". Must be one of: draft, sent, paid, overdue` 
          });
        }
        // Only add if not already in the array (deduplicate)
        if (!validatedStatuses.includes(s)) {
          validatedStatuses.push(s);
        }
      }
      
      // Ensure we have at least one valid status after validation
      if (validatedStatuses.length === 0) {
        return res.status(400).json({ 
          error: 'At least one valid status must be provided' 
        });
      }
      
      // Build OR formula for multiple statuses
      if (validatedStatuses.length === 1) {
        filterFormula = `AND(${filterFormula}, ${buildSafeFilterFormula('status', validatedStatuses[0])})`;
      } else {
        const statusFilters = validatedStatuses.map(s => buildSafeFilterFormula('status', s));
        filterFormula = `AND(${filterFormula}, OR(${statusFilters.join(',')}))`;
      }
    }

    const records = await base(TABLES.INVOICES)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'createdAt', direction: 'desc' }],
      })
      .all();

    const invoices = records.map((record) => ({
      id: record.id,
      ...record.fields,
      items: JSON.parse((record.fields.items as string) || '[]'),
    }));

    res.json({ invoices, count: invoices.length });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const record = await base(TABLES.INVOICES).find(id);

    if (record.fields.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    const invoice = {
      id: record.id,
      ...record.fields,
      items: JSON.parse((record.fields.items as string) || '[]'),
    };

    res.json({ invoice });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    
    if (error.statusCode === 404 || error.message?.includes('NOT_FOUND')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const validatedData = updateInvoiceSchema.parse(req.body);

    const record = await base(TABLES.INVOICES).find(id);

    if (record.fields.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    const updateFields: any = {
      updatedAt: new Date().toISOString(),
    };

    if (validatedData.invoiceNumber) updateFields.invoiceNumber = validatedData.invoiceNumber;
    if (validatedData.clientName) updateFields.clientName = validatedData.clientName;
    if (validatedData.clientEmail) updateFields.clientEmail = validatedData.clientEmail;
    if (validatedData.amount !== undefined) updateFields.amount = validatedData.amount;
    if (validatedData.currency) updateFields.currency = validatedData.currency;
    if (validatedData.status) updateFields.status = validatedData.status;
    if (validatedData.dueDate) updateFields.dueDate = validatedData.dueDate;
    if (validatedData.items) updateFields.items = JSON.stringify(validatedData.items);
    if (validatedData.notes !== undefined) updateFields.notes = validatedData.notes;
    if (validatedData.pdfUrl !== undefined) updateFields.pdfUrl = validatedData.pdfUrl;

    const updatedRecords = await base(TABLES.INVOICES).update([
      {
        id,
        fields: updateFields,
      },
    ]);

    const updatedInvoice = updatedRecords[0];

    res.json({
      message: 'Invoice updated successfully',
      invoice: {
        id: updatedInvoice.id,
        ...updatedInvoice.fields,
        items: JSON.parse((updatedInvoice.fields.items as string) || '[]'),
      },
    });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    
    if (error.statusCode === 404 || error.message?.includes('NOT_FOUND')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const record = await base(TABLES.INVOICES).find(id);

    if (record.fields.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    await base(TABLES.INVOICES).destroy([id]);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    
    // Check if error is due to record not found
    if (error.statusCode === 404 || error.message?.includes('NOT_FOUND')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};
