import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { publishChatMessage, getGameState } from '@/lib/game-state';

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
    const { playerId, text } = body;

    if (!playerId || !text) {
      return NextResponse.json({ error: 'playerId and text are required' }, { status: 400 });
    }

    const gameState = await getGameState();
    const player = gameState.players.find(p => p.id === playerId);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const message = {
      id: Date.now().toString(),
      sender: player.name,
      senderId: playerId,
      text: text,
      timestamp: new Date().toLocaleTimeString()
    };

    await publishChatMessage(message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

