import Ably from 'ably';
import { db } from './db';
import { gameSessions, users } from './db/schema';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import {
  Card,
  Player,
  GameState,
  Suit,
  dealCards,
  getStartingPlayer,
  isValidMove,
  findTholaRecipient
} from './game';

// Initialize Ably client
const getAblyClient = () => {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error('ABLY_API_KEY environment variable is required');
  }
  return new Ably.Rest({ key: apiKey });
};

// Main game session ID (for single game instance)
const MAIN_GAME_SESSION_ID = 'main-game-session';

// Channel name for Ably
const GAME_CHANNEL = 'game:main';

// Helper function to get next active player
export const getNextActivePlayerId = (gameState: GameState, currentId: string): string => {
  const activePlayers = gameState.players.filter(p => !p.isOut && p.isConnected);
  if (activePlayers.length === 0) return '';

  const currentIndex = activePlayers.findIndex(p => p.id === currentId);
  if (currentIndex === -1) {
    const fullIndex = gameState.players.findIndex(p => p.id === currentId);
    for (let i = 1; i <= gameState.players.length; i++) {
      const nextIdx = (fullIndex + i) % gameState.players.length;
      if (!gameState.players[nextIdx].isOut && gameState.players[nextIdx].isConnected) {
        return gameState.players[nextIdx].id;
      }
    }
    return '';
  }

  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
};

// Check for winners and update game state
export const checkWinners = (gameState: GameState): void => {
  gameState.players.forEach(p => {
    if (!p.isOut && p.hand.length === 0) {
      p.isOut = true;
      gameState.winnerOrder.push(p.id);
      gameState.message = `${p.name} cleared all cards!`;
    }
  });

  const activePlayers = gameState.players.filter(p => !p.isOut);
  if (gameState.status === 'PLAYING' && activePlayers.length === 1) {
    gameState.status = 'FINISHED';
    const bhabi = activePlayers[0];
    gameState.message = `GAME OVER! ${bhabi.name} is the BHABI!`;
    persistGameResults(gameState).catch(console.error);
  }
};

// Persist game results to database
const persistGameResults = async (gameState: GameState) => {
  console.log('💾 Persisting game results to database...');
  try {
    const promises = gameState.players.map(async (p) => {
      if (!p.dbId) return;

      const isWinner = p.isOut; // Anyone who got out is a winner in Bhabi
      await db.update(users)
        .set({
          gamesPlayed: drizzleSql`${users.gamesPlayed} + 1`,
          gamesWon: isWinner ? drizzleSql`${users.gamesWon} + 1` : users.gamesWon,
        })
        .where(eq(users.id, p.dbId));
    });

    await Promise.all(promises);
    console.log('✅ Stats updated successfully');
  } catch (err) {
    console.error('❌ Failed to update stats:', err);
  }
};

// Get game state from database
export const getGameState = async (): Promise<GameState> => {
  try {
    const session = await db.select().from(gameSessions).where(eq(gameSessions.id, MAIN_GAME_SESSION_ID)).limit(1);
    
    if (session.length === 0) {
      // Create initial game state
      const initialState: GameState = {
        players: [],
        currentTurn: '',
        currentSuit: null,
        tableCards: [],
        lastTholaBy: null,
        status: 'LOBBY',
        winnerOrder: [],
        message: 'Waiting for players...'
      };
      
      await db.insert(gameSessions).values({
        id: MAIN_GAME_SESSION_ID,
        gameState: initialState as any,
      });
      
      return initialState;
    }
    
    return session[0].gameState as GameState;
  } catch (error) {
    console.error('Error getting game state:', error);
    // Return default state on error
    return {
      players: [],
      currentTurn: '',
      currentSuit: null,
      tableCards: [],
      lastTholaBy: null,
      status: 'LOBBY',
      winnerOrder: [],
      message: 'Waiting for players...'
    };
  }
};

// Update game state in database and broadcast to Ably
export const updateGameState = async (gameState: GameState): Promise<void> => {
  try {
    // Update database
    await db.update(gameSessions)
      .set({
        gameState: gameState as any,
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, MAIN_GAME_SESSION_ID));

    // Broadcast to Ably
    await broadcastState(gameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
};

// Broadcast game state to Ably channel
export const broadcastState = async (gameState: GameState): Promise<void> => {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(GAME_CHANNEL);
    await channel.publish('gameState', gameState);
    console.log(`📊 Broadcasting game state to Ably channel: ${GAME_CHANNEL}`);
  } catch (error) {
    console.error('Error broadcasting to Ably:', error);
  }
};

// Publish chat message to Ably
export const publishChatMessage = async (message: {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
}): Promise<void> => {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(GAME_CHANNEL);
    await channel.publish('chatMessage', message);
  } catch (error) {
    console.error('Error publishing chat message:', error);
  }
};

// Publish emoji reaction to Ably
export const publishEmojiReaction = async (reaction: {
  senderId: string;
  emoji: string;
}): Promise<void> => {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(GAME_CHANNEL);
    await channel.publish('emojiReaction', reaction);
  } catch (error) {
    console.error('Error publishing emoji reaction:', error);
  }
};

// Join game handler
export const handleJoin = async (playerId: string, name: string, userId?: string): Promise<{ success: boolean; error?: string }> => {
  const gameState = await getGameState();

  // Check if game is in progress
  if (gameState.status !== 'LOBBY') {
    return { success: false, error: 'Game in progress' };
  }

  // Check for existing player (reconnection)
  const existingPlayer = gameState.players.find(p => (userId && p.dbId === userId) || p.name === name);
  
  if (existingPlayer) {
    if (existingPlayer.isConnected) {
      return { success: false, error: 'Already in game' };
    }
    // Reconnection
    if (gameState.currentTurn === existingPlayer.id) {
      gameState.currentTurn = playerId;
    }
    gameState.tableCards.forEach(tc => {
      if (tc.playerId === existingPlayer.id) {
        tc.playerId = playerId;
      }
    });
    existingPlayer.id = playerId;
    existingPlayer.isConnected = true;
    gameState.message = `${name} reconnected!`;
    await updateGameState(gameState);
    return { success: true };
  }

  // Check maximum player limit (8 players)
  const MAX_PLAYERS = 8;
  if (gameState.players.length >= MAX_PLAYERS) {
    return { success: false, error: `Game is full! Maximum ${MAX_PLAYERS} players allowed.` };
  }

  // New player
  const newPlayer: Player = {
    id: playerId,
    name: name,
    hand: [],
    isOut: false,
    isConnected: true,
    order: gameState.players.length,
    dbId: userId
  };

  gameState.players.push(newPlayer);
  gameState.message = `${name} joined!`;
  await updateGameState(gameState);
  return { success: true };
};

// Start game handler
export const handleStartGame = async (playerId: string): Promise<{ success: boolean; error?: string }> => {
  const gameState = await getGameState();

  if (gameState.players.length < 2) {
    return { success: false, error: 'Need at least 2 players' };
  }

  if (gameState.players[0].id !== playerId) {
    return { success: false, error: 'Only the first player can start the game' };
  }

  gameState.players = dealCards(gameState.players);
  gameState.status = 'PLAYING';
  gameState.currentTurn = getStartingPlayer(gameState.players);
  gameState.currentSuit = null;
  gameState.tableCards = [];
  gameState.winnerOrder = [];
  gameState.message = 'Game Started! ACE of SPADES starts.';

  await updateGameState(gameState);
  return { success: true };
};

// Play card handler
export const handlePlayCard = async (playerId: string, card: Card): Promise<{ success: boolean; error?: string }> => {
  const gameState = await getGameState();
  const player = gameState.players.find(p => p.id === playerId);

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  if (gameState.currentTurn !== playerId || gameState.status !== 'PLAYING') {
    return { success: false, error: 'Not your turn or game not in progress' };
  }

  if (!isValidMove(player.hand, card, gameState.currentSuit)) {
    return { success: false, error: 'Invalid move!' };
  }

  // Remove card from hand
  player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
  gameState.tableCards.push({ playerId, card });
  
  if (!gameState.currentSuit) {
    gameState.currentSuit = card.suit;
  }

  // Check if card doesn't match suit (Thola)
  if (card.suit !== gameState.currentSuit) {
    const recipientId = findTholaRecipient(gameState.tableCards, gameState.currentSuit as Suit);
    const recipient = gameState.players.find(p => p.id === recipientId);
    if (recipient) {
      gameState.message = `${player.name} gave THOLA to ${recipient.name}!`;
      recipient.hand.push(...gameState.tableCards.map(tc => tc.card));
      if (recipient.isOut) {
        recipient.isOut = false;
        gameState.winnerOrder = gameState.winnerOrder.filter(id => id !== recipientId);
      }
    }
    checkWinners(gameState);
    // End trick after delay (handled client-side or via setTimeout in API route)
    gameState.tableCards = [];
    gameState.currentSuit = null;
    gameState.currentTurn = recipientId;
    await updateGameState(gameState);
    return { success: true };
  }

  // Check if all players have played
  const connectedActivePlayers = gameState.players.filter(p => !p.isOut && p.isConnected);
  if (gameState.tableCards.length >= connectedActivePlayers.length) {
    const highestPlayerId = findTholaRecipient(gameState.tableCards, gameState.currentSuit as Suit);
    gameState.message = `${gameState.players.find(p => p.id === highestPlayerId)?.name} won the trick.`;
    checkWinners(gameState);
    gameState.tableCards = [];
    gameState.currentSuit = null;
    gameState.currentTurn = highestPlayerId;
  } else {
    gameState.currentTurn = getNextActivePlayerId(gameState, playerId);
    checkWinners(gameState);
  }

  await updateGameState(gameState);
  return { success: true };
};

// Handle player disconnect
export const handleDisconnect = async (playerId: string): Promise<void> => {
  const gameState = await getGameState();
  const disconnectedPlayer = gameState.players.find(p => p.id === playerId);
  
  if (!disconnectedPlayer) return;

  disconnectedPlayer.isConnected = false;
  const wasHisTurn = gameState.currentTurn === playerId;

  if (gameState.status === 'LOBBY') {
    gameState.players = gameState.players.filter(p => p.id !== playerId);
  }

  if (gameState.players.every(p => !p.isConnected)) {
    // Reset game if all players disconnected
    gameState.players = [];
    gameState.status = 'LOBBY';
    gameState.message = 'Waiting for players...';
  } else {
    if (gameState.status === 'PLAYING' && wasHisTurn) {
      gameState.currentTurn = getNextActivePlayerId(gameState, playerId);
    }
  }

  await updateGameState(gameState);
};

