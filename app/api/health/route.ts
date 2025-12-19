import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
    try {
        // Try to query the database
        await db.select().from(users).limit(1);
        
        return NextResponse.json({ 
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Health check error:', error);
        return NextResponse.json({ 
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

