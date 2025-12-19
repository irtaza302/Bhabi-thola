import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { handlePlayCard } from '@/lib/game-state';
import { Card } from '@/lib/game';

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

    const body = await request.json();
    const { playerId, card } = body;

    if (!playerId || !card) {
      return NextResponse.json({ error: 'playerId and card are required' }, { status: 400 });
    }

    const result = await handlePlayCard(playerId, card as Card);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in play route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

