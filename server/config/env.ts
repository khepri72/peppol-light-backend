import type { Secret, SignOptions } from 'jsonwebtoken';

export const config = {
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  },
  jwt: {
    secret: process.env.JWT_SECRET! as Secret,
    expiresIn: '7d' as SignOptions['expiresIn'],
  },
  server: {
    port: process.env.PORT || 5000,
  },
};

// Validate required environment variables
const requiredEnvVars = ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
