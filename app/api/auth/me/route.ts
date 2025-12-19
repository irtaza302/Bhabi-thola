import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:10',message:'/api/auth/me called',data:{hasToken:!!token,tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!token) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:13',message:'No token found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:18',message:'Token verification failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:21',message:'Token verified, fetching user',data:{userId:payload.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:27',message:'User found, returning user data',data:{userId:user.id,username:user.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
