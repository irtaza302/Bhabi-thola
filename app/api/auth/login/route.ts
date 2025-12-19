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

        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
