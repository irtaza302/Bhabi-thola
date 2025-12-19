import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables (needed for server.ts and other non-Next.js contexts)
if (typeof window === 'undefined') {
  dotenv.config();
}

const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Database connection string is required. Please set NEXT_PUBLIC_DATABASE_URL or DATABASE_URL environment variable.');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
