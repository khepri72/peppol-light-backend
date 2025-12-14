import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Debug logging (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 [AUTH] Route: ${req.method} ${req.path}`);
    console.log(`🔐 [AUTH] Auth header present: ${authHeader ? 'yes' : 'no'}`);
    console.log(`🔐 [AUTH] Token present: ${token ? 'yes (length: ' + token.length + ')' : 'no'}`);
  }

  if (!token) {
    console.log('🔐 [AUTH] FAIL: No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if JWT_SECRET is configured
    if (!config.jwt.secret) {
      console.error('❌ [AUTH] JWT_SECRET not configured!');
      return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    req.userId = decoded.userId;
    
    // Debug logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [AUTH] SUCCESS: userId=${decoded.userId}`);
    }
    
    next();
  } catch (error: any) {
    // Log the actual error for debugging
    console.error(`🔐 [AUTH] FAIL: ${error.name} - ${error.message}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [AUTH] Token (first 50 chars): ${token.substring(0, 50)}...`);
      console.log(`🔐 [AUTH] JWT_SECRET set: ${config.jwt.secret ? 'yes' : 'no'}`);
    }
    
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
