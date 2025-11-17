import { Request, Response } from 'express';
import { base, TABLES } from '../config/airtable';
import { AuthRequest } from '../middlewares/auth';

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
    const { companyName } = req.body;

    if (companyName === undefined) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updatedRecords = await base(TABLES.USERS).update([
      {
        id: userId,
        fields: {
          companyName: companyName || '',
        },
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
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};
