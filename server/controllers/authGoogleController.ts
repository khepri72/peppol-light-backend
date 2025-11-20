import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { base, TABLES } from '../config/airtable';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

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
    
    // Build safe filter formula to prevent injection
    const googleIdFilter = buildSafeFilterFormula('googleId', googleId);
    const emailFilter = buildSafeFilterFormula('email', email);
    
    // Search for existing user by googleId or email
    const existingUsers = await usersTable
      .select({
        filterByFormula: `OR(${googleIdFilter}, ${emailFilter})`,
        maxRecords: 1
      })
      .firstPage();

    let userId: string;
    let user: any;

    if (existingUsers.length > 0) {
      // User exists - update googleId and quota fields if not set
      const existingUser = existingUsers[0];
      userId = existingUser.id;
      
      // Extract quota fields with defaults for legacy users
      const plan = existingUser.fields.plan || 'FREE';
      const quotaUsed = existingUser.fields.quotaUsed !== undefined ? existingUser.fields.quotaUsed : 0;
      const quotaLimit = existingUser.fields.quotaLimit !== undefined ? existingUser.fields.quotaLimit : 1;
      const quotaResetDate = existingUser.fields.quotaResetDate || new Date().toISOString();

      const updateData: any = {};
      if (!existingUser.fields.googleId) {
        updateData.googleId = googleId;
      }
      if (picture && !existingUser.fields.picture) {
        updateData.picture = picture;
      }
      // Persist defaults to Airtable for legacy users
      if (!existingUser.fields.plan) updateData.plan = plan;
      if (existingUser.fields.quotaUsed === undefined) updateData.quotaUsed = quotaUsed;
      if (existingUser.fields.quotaLimit === undefined) updateData.quotaLimit = quotaLimit;
      if (!existingUser.fields.quotaResetDate) updateData.quotaResetDate = quotaResetDate;

      if (Object.keys(updateData).length > 0) {
        await usersTable.update(userId, updateData);
      }

      user = {
        id: userId,
        email: existingUser.fields.email,
        companyName: existingUser.fields.companyName || name,
        googleId: existingUser.fields.googleId || googleId,
        plan,
        quotaUsed,
        quotaLimit,
        quotaResetDate,
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
        quotaLimit: 1,
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
        quotaLimit: 1,
        quotaResetDate: newUser.fields.quotaResetDate,
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
        googleId,
        plan: user.plan,
        quotaUsed: user.quotaUsed,
        quotaLimit: user.quotaLimit,
        quotaResetDate: user.quotaResetDate
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'peppol-light',
        audience: 'peppol-light-users'
      }
    );

    // 4. Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        googleId: user.googleId,
        plan: user.plan,
        quotaUsed: user.quotaUsed,
        quotaLimit: user.quotaLimit,
        quotaResetDate: user.quotaResetDate,
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
