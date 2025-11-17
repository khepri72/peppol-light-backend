import { Response } from 'express';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from '../middlewares/auth';
import { invoiceTemplateSchema } from '../../shared/schema';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

export const getTemplateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const records = await base(TABLES.USER_SETTINGS)
      .select({
        filterByFormula: buildSafeFilterFormula('userId', userId),
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      return res.json({
        primaryColor: '#2563EB',
        companyLogo: null,
        companyAddress: null,
        companyPhone: null,
        footerText: null,
      });
    }

    const settings = records[0];
    res.json({
      id: settings.id,
      primaryColor: settings.fields.primaryColor || '#2563EB',
      companyLogo: settings.fields.companyLogo || null,
      companyAddress: settings.fields.companyAddress || null,
      companyPhone: settings.fields.companyPhone || null,
      footerText: settings.fields.footerText || null,
    });
  } catch (error) {
    console.error('Get template settings error:', error);
    res.status(500).json({ error: 'Failed to fetch template settings' });
  }
};

export const updateTemplateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const validatedData = invoiceTemplateSchema.parse(req.body);

    const existingRecords = await base(TABLES.USER_SETTINGS)
      .select({
        filterByFormula: buildSafeFilterFormula('userId', userId),
        maxRecords: 1,
      })
      .firstPage();

    const fieldsToUpdate: any = {
      updatedAt: new Date().toISOString(),
    };

    if (validatedData.primaryColor !== undefined) {
      fieldsToUpdate.primaryColor = validatedData.primaryColor;
    }
    if (validatedData.companyLogo !== undefined) {
      fieldsToUpdate.companyLogo = validatedData.companyLogo || '';
    }
    if (validatedData.companyAddress !== undefined) {
      fieldsToUpdate.companyAddress = validatedData.companyAddress || '';
    }
    if (validatedData.companyPhone !== undefined) {
      fieldsToUpdate.companyPhone = validatedData.companyPhone || '';
    }
    if (validatedData.footerText !== undefined) {
      fieldsToUpdate.footerText = validatedData.footerText || '';
    }

    let updatedRecord;

    if (existingRecords.length > 0) {
      const [record] = await base(TABLES.USER_SETTINGS).update([
        {
          id: existingRecords[0].id,
          fields: fieldsToUpdate,
        },
      ]);
      updatedRecord = record;
    } else {
      const [record] = await base(TABLES.USER_SETTINGS).create([
        {
          fields: {
            userId,
            ...fieldsToUpdate,
            createdAt: new Date().toISOString(),
          },
        },
      ]);
      updatedRecord = record;
    }

    res.json({
      message: 'Template settings updated successfully',
      settings: {
        id: updatedRecord.id,
        primaryColor: updatedRecord.fields.primaryColor || '#2563EB',
        companyLogo: updatedRecord.fields.companyLogo || null,
        companyAddress: updatedRecord.fields.companyAddress || null,
        companyPhone: updatedRecord.fields.companyPhone || null,
        footerText: updatedRecord.fields.footerText || null,
      },
    });
  } catch (error: any) {
    console.error('Update template settings error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update template settings' });
  }
};
