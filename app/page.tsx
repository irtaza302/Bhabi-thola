'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingDown, TrendingUp, Award, Users, Play, LogOut, Gamepad2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import BackgroundEffect from '@/components/BackgroundEffect';

interface PlayerStats {
  id: string;
  name: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  tholaReceived: number;
  winRate: string;
}

interface StatsData {
  totalPlayers: number;
  totalGames: number;
  topByWins: PlayerStats[];
  topByTholaReceived: PlayerStats[];
  topByLosses: PlayerStats[];
  topByWinRate: PlayerStats[];
  allPlayers: PlayerStats[];
}

export default function Home() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; username: string; name: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }

        // Fetch stats
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    window.location.reload();
  };

  const StatCard = ({ 
    title, 
    icon: Icon, 
    children, 
    className = '' 
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`glass ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  const LeaderboardList = ({ players, showThola = false }: { players: PlayerStats[]; showThola?: boolean }) => {
    if (players.length === 0) {
      return <p className="text-muted-foreground text-sm">No data yet</p>;
    }

    return (
      <div className="space-y-2">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-600/20 text-orange-400' :
                'bg-background/50 text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-muted-foreground">@{player.username}</p>
              </div>
            </div>
            <div className="text-right">
              {showThola ? (
                <p className="font-bold text-lg text-red-400">{player.tholaReceived}</p>
              ) : (
                <>
                  <p className="font-bold text-lg">{player.gamesWon}</p>
                  <p className="text-xs text-muted-foreground">{player.winRate}% win rate</p>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 overflow-y-auto">
      <BackgroundEffect />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bhabi Thola Stats
            </h1>
            <p className="text-muted-foreground">
              Track your performance and compete with others
            </p>
          </div>
          <div className="flex gap-3">
            {user && (
              <>
                <Button
                  onClick={() => router.push('/game')}
                  className="glass"
                  variant="default"
                >
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Play Game
                </Button>
                <Button
                  onClick={handleLogout}
                  className="glass"
                  variant="outline"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
            {!user && (
              <Button
                onClick={() => router.push('/game')}
                className="glass"
                variant="default"
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Play Game
              </Button>
            )}
          </div>
        </motion.div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Players" icon={Users}>
            <p className="text-3xl font-bold">{stats?.totalPlayers || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Registered players</p>
          </StatCard>
          <StatCard title="Total Games" icon={Play}>
            <p className="text-3xl font-bold">{stats?.totalGames || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Games played</p>
          </StatCard>
          <StatCard title="Active Players" icon={Users}>
            <p className="text-3xl font-bold">
              {stats?.allPlayers.filter(p => p.gamesPlayed > 0).length || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Players with games</p>
          </StatCard>
        </div>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Wins */}
          <StatCard title="🏆 Most Wins" icon={Trophy} className="border-yellow-500/20">
            <LeaderboardList players={stats?.topByWins || []} />
          </StatCard>

          {/* Most Thola Received */}
          <StatCard title="💥 Most Thola Received" icon={TrendingDown} className="border-red-500/20">
            <LeaderboardList players={stats?.topByTholaReceived || []} showThola />
          </StatCard>

          {/* Most Losses */}
          <StatCard title="😅 Most Losses (Bhabi)" icon={TrendingDown} className="border-orange-500/20">
            <LeaderboardList players={stats?.topByLosses || []} />
          </StatCard>

          {/* Best Win Rate */}
          <StatCard title="⭐ Best Win Rate" icon={TrendingUp} className="border-green-500/20">
            <LeaderboardList players={stats?.topByWinRate || []} />
          </StatCard>
        </div>

        {/* All Players Table */}
        {stats && stats.allPlayers.length > 0 && (
          <StatCard title="📊 All Players" icon={Award}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold">Player</th>
                    <th className="text-center p-3 text-sm font-semibold">Games</th>
                    <th className="text-center p-3 text-sm font-semibold">Wins</th>
                    <th className="text-center p-3 text-sm font-semibold">Losses</th>
                    <th className="text-center p-3 text-sm font-semibold">Thola</th>
                    <th className="text-center p-3 text-sm font-semibold">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.allPlayers.map((player, index) => (
                    <motion.tr
                      key={player.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border/30 hover:bg-background/30 transition-colors"
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-muted-foreground">@{player.username}</p>
                        </div>
                      </td>
                      <td className="text-center p-3">{player.gamesPlayed}</td>
                      <td className="text-center p-3 text-green-400 font-semibold">{player.gamesWon}</td>
                      <td className="text-center p-3 text-red-400 font-semibold">{player.gamesLost}</td>
                      <td className="text-center p-3 text-orange-400 font-semibold">{player.tholaReceived}</td>
                      <td className="text-center p-3">
                        <span className={`font-semibold ${
                          parseFloat(player.winRate) >= 50 ? 'text-green-400' : 'text-muted-foreground'
                        }`}>
                          {player.winRate}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StatCard>
        )}
      </div>
    </div>
  );
}
