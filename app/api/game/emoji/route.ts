import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { publishEmojiReaction, getGameState } from '@/lib/game-state';

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
    const { playerId, emoji } = body;

    if (!playerId || !emoji) {
      return NextResponse.json({ error: 'playerId and emoji are required' }, { status: 400 });
    }

    await publishEmojiReaction({
      senderId: playerId,
      emoji: emoji
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in emoji route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

