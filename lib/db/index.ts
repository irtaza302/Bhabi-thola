import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables only in development/local environments
// Vercel automatically provides environment variables, so we don't need dotenv there
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Try NEXT_PUBLIC_DATABASE_URL first, then fall back to DATABASE_URL
// On Vercel, use DATABASE_URL (without NEXT_PUBLIC) for server-side code
const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  const errorMsg = 
    'Database connection string is required. ' +
    'Please set NEXT_PUBLIC_DATABASE_URL or DATABASE_URL in Vercel environment variables. ' +
    `NODE_ENV: ${process.env.NODE_ENV}, ` +
    `Vercel: ${process.env.VERCEL ? 'yes' : 'no'}`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
