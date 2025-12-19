import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon
        }
    });
}
