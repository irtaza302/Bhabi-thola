import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all users with their stats
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      gamesPlayed: users.gamesPlayed,
      gamesWon: users.gamesWon,
      gamesLost: users.gamesLost,
      tholaReceived: users.tholaReceived,
    })
    .from(users)
    .orderBy(desc(users.gamesPlayed));

    // Calculate win rate for each user
    const usersWithStats = allUsers.map(user => ({
      ...user,
      winRate: user.gamesPlayed > 0 
        ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
        : '0.0',
    }));

    // Get top players in different categories
    const topByWins = [...usersWithStats]
      .filter(u => u.gamesWon > 0)
      .sort((a, b) => b.gamesWon - a.gamesWon)
      .slice(0, 10);

    const topByTholaReceived = [...usersWithStats]
      .filter(u => u.tholaReceived > 0)
      .sort((a, b) => b.tholaReceived - a.tholaReceived)
      .slice(0, 10);

    const topByLosses = [...usersWithStats]
      .filter(u => u.gamesLost > 0)
      .sort((a, b) => b.gamesLost - a.gamesLost)
      .slice(0, 10);

    const topByWinRate = [...usersWithStats]
      .filter(u => u.gamesPlayed >= 5) // At least 5 games for win rate ranking
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      stats: {
        totalPlayers: usersWithStats.length,
        totalGames: usersWithStats.reduce((sum, u) => sum + u.gamesPlayed, 0),
        topByWins,
        topByTholaReceived,
        topByLosses,
        topByWinRate,
        allPlayers: usersWithStats,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

