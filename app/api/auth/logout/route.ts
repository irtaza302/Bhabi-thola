import { NextResponse } from 'next/server';

export async function POST() {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/logout/route.ts:4',message:'Logout endpoint called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Delete the httpOnly cookie by setting it to expire immediately
    // Must match the same attributes as when it was set (path, secure, sameSite)
    response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/logout/route.ts:16',message:'Cookie deletion set in response',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return response;
}

