import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, createToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { username, password, name, email } = await request.json();

        if (!username || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user already exists
        let existingUser;
        try {
            existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        } catch (dbError: any) {
            console.error('Database query error (check existing):', dbError);
            return NextResponse.json({ 
                error: 'Database connection error',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }

        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        let newUser;
        try {
            [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                name,
                email,
            }).returning();
        } catch (dbError: any) {
            console.error('Database insert error:', dbError);
            // Check if it's a table doesn't exist error
            if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
                return NextResponse.json({ 
                    error: 'Database tables not found. Please run migrations.',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                }, { status: 500 });
            }
            return NextResponse.json({ 
                error: 'Failed to create user',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }

        const token = await createToken({ id: newUser.id, username: newUser.username });

        const response = NextResponse.json({
            user: { id: newUser.id, username: newUser.username, name: newUser.name }
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return response;
    } catch (error: any) {
        console.error('Signup error:', error);
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? error.message || 'Internal server error'
            : 'Internal server error';
        return NextResponse.json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
