import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { comparePassword, createToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
        }

        let user;
        try {
            [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        } catch (dbError: any) {
            console.error('Database query error:', dbError);
            // Check if it's a table doesn't exist error
            if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
                return NextResponse.json({ 
                    error: 'Database tables not found. Please run migrations.',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                }, { status: 500 });
            }
            return NextResponse.json({ 
                error: 'Database connection error',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }

        if (!user || !(await comparePassword(password, user.password))) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }

        const token = await createToken({ id: user.id, username: user.username });

        const response = NextResponse.json({
            user: { id: user.id, username: user.username, name: user.name }
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return response;
    } catch (error: any) {
        console.error('Login error:', error);
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? error.message || 'Internal server error'
            : 'Internal server error';
        return NextResponse.json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
