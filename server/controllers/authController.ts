import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { base, TABLES } from '../config/airtable';
import { insertUserSchema, loginSchema } from '../../shared/schema';
import { config } from '../config/env';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUsers = await base(TABLES.USERS)
      .select({
        filterByFormula: buildSafeFilterFormula('email', validatedData.email),
        maxRecords: 1,
      })
      .firstPage();

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

    // Create user in Airtable with quota fields
    const records = await base(TABLES.USERS).create([
      {
        fields: {
          email: validatedData.email,
          password: hashedPassword,
          companyName: validatedData.companyName || '',
          plan: 'FREE',
          quotaUsed: 0,
          quotaLimit: 1,
          quotaResetDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      },
    ]);

    const user = records[0];
    const userId = user.id;

    // Generate JWT token with quota fields
    const token = jwt.sign(
      { 
        userId,
        email: validatedData.email,
        plan: 'FREE',
        quotaUsed: 0,
        quotaLimit: 1,
        quotaResetDate: user.fields.quotaResetDate
      }, 
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        issuer: 'peppol-light',
        audience: 'peppol-light-users'
      }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email: validatedData.email,
        companyName: validatedData.companyName,
        plan: 'FREE',
        quotaUsed: 0,
        quotaLimit: 1,
        quotaResetDate: user.fields.quotaResetDate,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user by email
    const users = await base(TABLES.USERS)
      .select({
        filterByFormula: buildSafeFilterFormula('email', validatedData.email),
        maxRecords: 1,
      })
      .firstPage();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const userId = user.id;
    const storedPassword = user.fields.password as string;

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, storedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Extract quota fields with defaults for legacy users
    const plan = user.fields.plan || 'FREE';
    const quotaUsed = user.fields.quotaUsed !== undefined ? user.fields.quotaUsed : 0;
    const quotaLimit = user.fields.quotaLimit !== undefined ? user.fields.quotaLimit : 1;
    const quotaResetDate = user.fields.quotaResetDate || new Date().toISOString();

    // Persist defaults to Airtable for legacy users
    const updateData: any = {};
    if (!user.fields.plan) updateData.plan = plan;
    if (user.fields.quotaUsed === undefined) updateData.quotaUsed = quotaUsed;
    if (user.fields.quotaLimit === undefined) updateData.quotaLimit = quotaLimit;
    if (!user.fields.quotaResetDate) updateData.quotaResetDate = quotaResetDate;

    if (Object.keys(updateData).length > 0) {
      await base(TABLES.USERS).update(userId, updateData);
    }

    // Generate JWT token with quota fields
    const token = jwt.sign(
      { 
        userId,
        email: user.fields.email,
        plan,
        quotaUsed,
        quotaLimit,
        quotaResetDate
      }, 
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        issuer: 'peppol-light',
        audience: 'peppol-light-users'
      }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userId,
        email: user.fields.email,
        companyName: user.fields.companyName || '',
        googleId: user.fields.googleId,
        plan,
        quotaUsed,
        quotaLimit,
        quotaResetDate,
        picture: user.fields.picture,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await base(TABLES.USERS).find(userId);

    // Extract quota fields with defaults for legacy users
    const plan = user.fields.plan || 'FREE';
    const quotaUsed = user.fields.quotaUsed !== undefined ? user.fields.quotaUsed : 0;
    const quotaLimit = user.fields.quotaLimit !== undefined ? user.fields.quotaLimit : 1;
    const quotaResetDate = user.fields.quotaResetDate || new Date().toISOString();

    // Persist defaults to Airtable for legacy users
    const updateData: any = {};
    if (!user.fields.plan) updateData.plan = plan;
    if (user.fields.quotaUsed === undefined) updateData.quotaUsed = quotaUsed;
    if (user.fields.quotaLimit === undefined) updateData.quotaLimit = quotaLimit;
    if (!user.fields.quotaResetDate) updateData.quotaResetDate = quotaResetDate;

    if (Object.keys(updateData).length > 0) {
      await base(TABLES.USERS).update(userId, updateData);
    }

    res.json({
      user: {
        id: user.id,
        email: user.fields.email,
        companyName: user.fields.companyName || '',
        googleId: user.fields.googleId,
        plan,
        quotaUsed,
        quotaLimit,
        quotaResetDate,
        picture: user.fields.picture,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};
