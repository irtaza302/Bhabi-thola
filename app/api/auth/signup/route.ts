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
        const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        const [newUser] = await db.insert(users).values({
            username,
            password: hashedPassword,
            name,
            email,
        }).returning();

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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
