import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { handleJoin } from '@/lib/game-state';

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
      console.error('Join route: Failed to parse request body', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { playerId, name } = body;

    if (!playerId || !name) {
      console.error('Join route: Missing required fields', { playerId: !!playerId, name: !!name });
      return NextResponse.json({ error: 'playerId and name are required' }, { status: 400 });
    }

    const result = await handleJoin(playerId, name, payload.id);

    if (!result.success) {
      console.error('Join failed:', { 
        playerId, 
        name, 
        userId: payload.id, 
        error: result.error 
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in join route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

