import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { handleTerminateRoom } from '@/lib/game-state';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Terminate route: Failed to parse request body', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { playerId } = body;

    if (!playerId) {
      console.error('Terminate route: Missing playerId');
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const result = await handleTerminateRoom(playerId);

    if (!result.success) {
      console.error('Terminate room failed:', { 
        playerId, 
        userId: payload.id, 
        error: result.error 
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in terminate route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

