import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Ably from 'ably';

export async function GET() {
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

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Ably API key not configured' }, { status: 500 });
    }

    // Create Ably REST client
    const ably = new Ably.Rest({ key: apiKey });

    // Request a token for this client
    const tokenRequest = await ably.auth.requestToken({
      clientId: payload.id, // Use user ID as client ID
    });

    return NextResponse.json({
      token: tokenRequest.token,
      key: apiKey.split(':')[0], // Return the key part (not the secret)
    });
  } catch (error) {
    console.error('Error generating Ably token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

