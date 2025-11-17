import { Request, Response } from 'express';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from '../middlewares/auth';
import { updateUserProfileSchema } from '../../shared/schema';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await base(TABLES.USERS).find(userId);

    res.json({
      id: user.id,
      email: user.fields.email,
      companyName: user.fields.companyName || '',
      createdAt: user.fields.createdAt,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const validatedData = updateUserProfileSchema.parse(req.body);

    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // If email is being updated, check if it's already in use
    if (validatedData.email) {
      const existingUsers = await base(TABLES.USERS)
        .select({
          filterByFormula: buildSafeFilterFormula('email', validatedData.email),
          maxRecords: 2,
        })
        .firstPage();

      // Check if another user already has this email
      const otherUserWithEmail = existingUsers.find(u => u.id !== userId);
      if (otherUserWithEmail) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    const fieldsToUpdate: any = {};
    if (validatedData.email !== undefined) {
      fieldsToUpdate.email = validatedData.email;
    }
    if (validatedData.companyName !== undefined) {
      fieldsToUpdate.companyName = validatedData.companyName || '';
    }

    const updatedRecords = await base(TABLES.USERS).update([
      {
        id: userId,
        fields: fieldsToUpdate,
      },
    ]);

    const updatedUser = updatedRecords[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.fields.email,
        companyName: updatedUser.fields.companyName || '',
      },
    });
  } catch (error: any) {
    console.error('Update user profile error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};
