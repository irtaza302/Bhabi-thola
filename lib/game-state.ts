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
  // Try both NEXT_PUBLIC_ABLY_API_KEY and ABLY_API_KEY for compatibility
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY || process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error('ABLY_API_KEY or NEXT_PUBLIC_ABLY_API_KEY environment variable is required');
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
  // Match by userId (dbId) first, then by name if userId not provided
  const existingPlayer = gameState.players.find(p => 
    (userId && p.dbId === userId) || (!userId && p.name === name)
  );
  
  if (existingPlayer) {
    // Allow reconnection even if already connected (handles page refresh, new tab, etc.)
    // Update playerId to the new one and mark as connected
    const oldPlayerId = existingPlayer.id;
    
    // Update currentTurn if it was the old playerId
    if (gameState.currentTurn === oldPlayerId) {
      gameState.currentTurn = playerId;
    }
    
    // Update any table cards that reference the old playerId
    gameState.tableCards.forEach(tc => {
      if (tc.playerId === oldPlayerId) {
        tc.playerId = playerId;
      }
    });
    
    // Update the player's ID and connection status
    existingPlayer.id = playerId;
    existingPlayer.isConnected = true;
    
    // Set appropriate message
    if (oldPlayerId === playerId) {
      gameState.message = `${name} is ready!`;
    } else {
      gameState.message = `${name} reconnected!`;
    }
    
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
      // Store the cards that will be given (for animation/delay)
      const cardsToGive = [...gameState.tableCards.map(tc => tc.card)];
      
      // Update state first to show the thola message and cards on table
      await updateGameState(gameState);
      
      // After 2 seconds, actually give the cards to the recipient
      // Using setTimeout in Node.js API route (should work fine)
      setTimeout(async () => {
        try {
          const currentState = await getGameState();
          const currentRecipient = currentState.players.find(p => p.id === recipientId);
          // Verify the thola is still valid (cards still on table, recipient still exists)
          if (currentRecipient && currentState.tableCards.length > 0) {
            // Give the cards to recipient
            currentRecipient.hand.push(...cardsToGive);
            if (currentRecipient.isOut) {
              currentRecipient.isOut = false;
              currentState.winnerOrder = currentState.winnerOrder.filter(id => id !== recipientId);
            }
            checkWinners(currentState);
            // Clear table and move turn to recipient
            currentState.tableCards = [];
            currentState.currentSuit = null;
            currentState.currentTurn = recipientId;
            currentState.message = `${currentRecipient.name} received ${cardsToGive.length} card(s)!`;
            await updateGameState(currentState);
          }
        } catch (error) {
          console.error('Error completing thola transfer:', error);
        }
      }, 2000);
      
      return { success: true };
    }
    checkWinners(gameState);
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
    const winnerName = gameState.players.find(p => p.id === highestPlayerId)?.name || 'Unknown';
    gameState.message = `${winnerName} won the trick.`;
    
    // Update state first to show all cards on table
    await updateGameState(gameState);
    
    // After 2 seconds, clear the table and move to next turn
    setTimeout(async () => {
      try {
        const currentState = await getGameState();
        // Verify the trick is still complete (all cards still on table)
        const currentActivePlayers = currentState.players.filter(p => !p.isOut && p.isConnected);
        if (currentState.tableCards.length >= currentActivePlayers.length) {
          checkWinners(currentState);
          currentState.tableCards = [];
          currentState.currentSuit = null;
          currentState.currentTurn = highestPlayerId;
          currentState.message = `${winnerName}'s turn`;
          await updateGameState(currentState);
        }
      } catch (error) {
        console.error('Error completing trick:', error);
      }
    }, 2000);
    
    return { success: true };
  } else {
    gameState.currentTurn = getNextActivePlayerId(gameState, playerId);
    checkWinners(gameState);
    await updateGameState(gameState);
    return { success: true };
  }
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

// Handle individual player leave - only removes the specific player
export const handleIndividualLeave = async (playerId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameState = await getGameState();
    const leavingPlayer = gameState.players.find(p => p.id === playerId);
    
    if (!leavingPlayer) {
      return { success: false, error: 'Player not found' };
    }

    // Remove only this player
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    
    // If it was their turn, move to next player
    if (gameState.currentTurn === playerId && gameState.status === 'PLAYING') {
      gameState.currentTurn = getNextActivePlayerId(gameState, playerId);
    }
    
    // Update table cards if they had any
    gameState.tableCards = gameState.tableCards.filter(tc => tc.playerId !== playerId);
    
    // If less than 2 players remain, reset to lobby
    if (gameState.players.length < 2 && gameState.status === 'PLAYING') {
      gameState.status = 'LOBBY';
      gameState.currentTurn = '';
      gameState.currentSuit = null;
      gameState.tableCards = [];
      gameState.message = `${leavingPlayer.name} left. Waiting for players...`;
    } else {
      gameState.message = `${leavingPlayer.name} left the game.`;
    }
    
    // If no players remain, reset completely
    if (gameState.players.length === 0) {
      gameState.status = 'LOBBY';
      gameState.currentTurn = '';
      gameState.currentSuit = null;
      gameState.tableCards = [];
      gameState.message = 'Waiting for players...';
    }

    await updateGameState(gameState);
    console.log(`🚪 ${leavingPlayer.name} left the game.`);
    return { success: true };
  } catch (error) {
    console.error('Error handling individual leave:', error);
    return { success: false, error: 'Failed to leave game' };
  }
};

// Handle room termination - terminates room completely and removes all users
export const handleTerminateRoom = async (playerId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameState = await getGameState();
    const terminatingPlayer = gameState.players.find(p => p.id === playerId);
    
    if (!terminatingPlayer) {
      return { success: false, error: 'Player not found' };
    }

    // Completely terminate the room - reset everything
    const resetState: GameState = {
      players: [],
      currentTurn: '',
      currentSuit: null,
      tableCards: [],
      lastTholaBy: null,
      status: 'LOBBY',
      winnerOrder: [],
      message: 'Room terminated. Waiting for players...'
    };

    await updateGameState(resetState);
    console.log(`🚪 Room terminated by ${terminatingPlayer.name}. All players removed.`);
    return { success: true };
  } catch (error) {
    console.error('Error handling room termination:', error);
    return { success: false, error: 'Failed to terminate room' };
  }
};

// Legacy function name for backward compatibility - now calls individual leave
export const handleLeave = handleIndividualLeave;

