import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { base, TABLES } from '../config/airtable';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface GooglePayload {
  email: string;
  name: string;
  sub: string; // Google ID
  picture?: string;
}

/**
 * Verify Google OAuth2 token and authenticate user
 * POST /api/auth/google
 */
export async function googleAuth(req: Request, res: Response) {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ 
      error: 'Missing Google credential' 
    });
  }

  try {
    // 1. Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GooglePayload;
    const { email, name, sub: googleId, picture } = payload;

    if (!email || !googleId) {
      return res.status(400).json({ 
        error: 'Invalid Google token payload' 
      });
    }

    // 2. Find or create user in Airtable
    const usersTable = base(TABLES.USERS);
    
    // Search for existing user by googleId or email
    const existingUsers = await usersTable
      .select({
        filterByFormula: `OR({googleId} = '${googleId}', {email} = '${email}')`,
        maxRecords: 1
      })
      .firstPage();

    let userId: string;
    let user: any;

    if (existingUsers.length > 0) {
      // User exists - update googleId if not set
      const existingUser = existingUsers[0];
      userId = existingUser.id;
      
      const updateData: any = {};
      if (!existingUser.fields.googleId) {
        updateData.googleId = googleId;
      }
      if (picture && !existingUser.fields.picture) {
        updateData.picture = picture;
      }

      if (Object.keys(updateData).length > 0) {
        await usersTable.update(userId, updateData);
      }

      user = {
        id: userId,
        email: existingUser.fields.email,
        companyName: existingUser.fields.companyName || name,
        googleId: existingUser.fields.googleId || googleId,
        plan: existingUser.fields.plan || 'FREE',
        quotaUsed: existingUser.fields.quotaUsed || 0,
        picture: existingUser.fields.picture || picture
      };
    } else {
      // Create new user
      const newUser = await usersTable.create({
        email,
        companyName: name,
        googleId,
        plan: 'FREE',
        quotaUsed: 0,
        quotaResetDate: new Date().toISOString(),
        picture: picture || '',
        // No password needed for Google auth
      });

      userId = newUser.id;
      user = {
        id: userId,
        email,
        companyName: name,
        googleId,
        plan: 'FREE',
        quotaUsed: 0,
        picture
      };
    }

    // 3. Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { 
        userId, 
        email,
        googleId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        plan: user.plan,
        quotaUsed: user.quotaUsed,
        picture: user.picture
      }
    });

  } catch (error: any) {
    console.error('❌ Google auth error:', error);
    
    if (error.message?.includes('Invalid token')) {
      return res.status(401).json({ 
        error: 'Invalid Google token' 
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
}
