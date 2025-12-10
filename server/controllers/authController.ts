import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { base, TABLES } from '../config/airtable';
import { insertUserSchema, loginSchema } from '../../shared/schema';
import { config } from '../config/env';
import { buildSafeFilterFormula } from '../utils/airtableHelpers';
import { PLANS, PlanId } from '../config/plans';

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
          userPlan: 'free',
          invoicesThisMonth: 0,
          maxInvoicesPerMonth: PLANS.free.maxInvoicesPerMonth,
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
        userPlan: 'free',
        invoicesThisMonth: 0,
        maxInvoicesPerMonth: PLANS.free.maxInvoicesPerMonth
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
        userPlan: 'free',
        invoicesThisMonth: 0,
        maxInvoicesPerMonth: PLANS.free.maxInvoicesPerMonth,
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
    const userPlan = (user.fields.userPlan as PlanId) || 'free';
    const invoicesThisMonth = user.fields.invoicesThisMonth !== undefined ? Number(user.fields.invoicesThisMonth) : 0;
    const planConfig = PLANS[userPlan] || PLANS.free;
    const maxInvoicesPerMonth = user.fields.maxInvoicesPerMonth !== undefined 
      ? Number(user.fields.maxInvoicesPerMonth) 
      : planConfig.maxInvoicesPerMonth;

    // Persist defaults to Airtable for legacy users
    const updateData: any = {};
    if (!user.fields.userPlan) updateData.userPlan = userPlan;
    if (user.fields.invoicesThisMonth === undefined) updateData.invoicesThisMonth = invoicesThisMonth;
    if (user.fields.maxInvoicesPerMonth === undefined) updateData.maxInvoicesPerMonth = maxInvoicesPerMonth;

    if (Object.keys(updateData).length > 0) {
      await base(TABLES.USERS).update(userId, updateData);
    }

    // Generate JWT token with quota fields
    const token = jwt.sign(
      { 
        userId,
        email: user.fields.email,
        userPlan,
        invoicesThisMonth,
        maxInvoicesPerMonth
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
        userPlan,
        invoicesThisMonth,
        maxInvoicesPerMonth,
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
    const userPlan = (user.fields.userPlan as PlanId) || 'free';
    const invoicesThisMonth = user.fields.invoicesThisMonth !== undefined ? Number(user.fields.invoicesThisMonth) : 0;
    const planConfig = PLANS[userPlan] || PLANS.free;
    const maxInvoicesPerMonth = user.fields.maxInvoicesPerMonth !== undefined 
      ? Number(user.fields.maxInvoicesPerMonth) 
      : planConfig.maxInvoicesPerMonth;

    // Persist defaults to Airtable for legacy users
    const updateData: any = {};
    if (!user.fields.userPlan) updateData.userPlan = userPlan;
    if (user.fields.invoicesThisMonth === undefined) updateData.invoicesThisMonth = invoicesThisMonth;
    if (user.fields.maxInvoicesPerMonth === undefined) updateData.maxInvoicesPerMonth = maxInvoicesPerMonth;

    if (Object.keys(updateData).length > 0) {
      await base(TABLES.USERS).update(userId, updateData);
    }

    res.json({
      user: {
        id: user.id,
        email: user.fields.email,
        companyName: user.fields.companyName || '',
        googleId: user.fields.googleId,
        userPlan,
        invoicesThisMonth,
        maxInvoicesPerMonth,
        picture: user.fields.picture,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};
