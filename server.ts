import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  Card,
  Player,
  GameState,
  Suit,
  dealCards,
  getStartingPlayer,
  isValidMove,
  findTholaRecipient
} from './lib/game';
import { db } from './lib/db';
import { users } from './lib/db/schema';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


let players: Player[] = [];
let gameState: GameState = {
  players: [],
  currentTurn: '',
  currentSuit: null,
  tableCards: [],
  lastTholaBy: null,
  status: 'LOBBY',
  winnerOrder: [],
  message: 'Waiting for players...'
};

// --- Helper Functions ---

const getNextActivePlayerId = (currentId: string): string => {
  const activePlayers = gameState.players.filter(p => !p.isOut && p.isConnected);
  if (activePlayers.length === 0) return '';

  const currentIndex = activePlayers.findIndex(p => p.id === currentId);
  if (currentIndex === -1) {
    const fullIndex = gameState.players.findIndex(p => p.id === currentId);
    for (let i = 1; i <= gameState.players.length; i++) {
      const nextIdx = (fullIndex + i) % gameState.players.length;
      if (!gameState.players[nextIdx].isOut && gameState.players[nextIdx].isConnected) return gameState.players[nextIdx].id;
    }
    return '';
  }

  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
};

const broadcastState = () => {
  console.log(`📊 Broadcasting game state to ${io.engine.clientsCount} clients`);
  io.emit('gameState', gameState);
};

const endTrick = (winnerId: string) => {
  gameState.currentTurn = ''; // Pause interactions

  setTimeout(() => {
    gameState.tableCards = [];
    gameState.currentSuit = null;

    const winner = gameState.players.find(p => p.id === winnerId);
    if (!winner || winner.isOut) {
      gameState.currentTurn = getNextActivePlayerId(winnerId);
      const name = winner ? winner.name : 'The winner (who left)';
      gameState.message = `${name} won the trick but is ${!winner ? 'gone' : 'OUT'}. Turn passes to ${gameState.players.find(p => p.id === gameState.currentTurn)?.name}.`;
    } else {
      gameState.currentTurn = winnerId;
    }

    checkWinners();
    broadcastState();
  }, 1500);
};

const persistGameResults = async () => {
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

const checkWinners = () => {
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

    persistGameResults().catch(console.error);
  }
};

io.on('connection', (socket) => {
  console.log(`🔗 Client connected: ${socket.id}`);

  socket.on('ping', (timestamp: number, callback) => {
    if (callback) callback(timestamp);
  });

  socket.on('join', (data: string | { name: string, userId?: string }) => {
    const name = typeof data === 'string' ? data : data.name;
    const userId = typeof data === 'object' ? data.userId : undefined;

    console.log(`👤 Player "${name}" (UserId: ${userId}) joining`);

    // Check reconnection
    const existingPlayer = players.find(p => (userId && p.dbId === userId) || p.name === name);

    if (existingPlayer) {
      if (!existingPlayer.isConnected) {
        console.log(`♻️ Player "${name}" reconnecting`);
        if (gameState.currentTurn === existingPlayer.id) gameState.currentTurn = socket.id;
        gameState.tableCards.forEach(tc => { if (tc.playerId === existingPlayer.id) tc.playerId = socket.id; });
        existingPlayer.id = socket.id;
        existingPlayer.isConnected = true;
        gameState.players = players;
        gameState.message = `${name} reconnected!`;
        broadcastState();
        return;
      } else {
        socket.emit('error', 'Already in game');
        return;
      }
    }

    if (gameState.status !== 'LOBBY') {
      socket.emit('error', 'Game in progress');
      return;
    }

    const newPlayer: Player = {
      id: socket.id,
      name: name,
      hand: [],
      isOut: false,
      isConnected: true,
      order: players.length,
      dbId: userId
    };

    players.push(newPlayer);
    gameState.players = players;
    gameState.message = `${name} joined!`;
    broadcastState();
  });

  socket.on('startGame', () => {
    if (players.length < 2 || players[0].id !== socket.id) return;
    gameState.players = dealCards(players);
    gameState.status = 'PLAYING';
    gameState.currentTurn = getStartingPlayer(gameState.players);
    gameState.currentSuit = null;
    gameState.tableCards = [];
    gameState.winnerOrder = [];
    gameState.message = 'Game Started! ACE of SPADES starts.';
    broadcastState();
  });

  socket.on('playCard', (card: Card) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || gameState.currentTurn !== socket.id || gameState.status !== 'PLAYING') return;

    if (!isValidMove(player.hand, card, gameState.currentSuit)) {
      socket.emit('error', 'Invalid move!');
      return;
    }

    player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    gameState.tableCards.push({ playerId: socket.id, card });
    if (!gameState.currentSuit) gameState.currentSuit = card.suit;

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
      checkWinners();
      endTrick(recipientId);
      broadcastState();
      return;
    }

    const connectedActivePlayers = gameState.players.filter(p => !p.isOut && p.isConnected);
    if (gameState.tableCards.length >= connectedActivePlayers.length) {
      const highestPlayerId = findTholaRecipient(gameState.tableCards, gameState.currentSuit as Suit);
      gameState.message = `${gameState.players.find(p => p.id === highestPlayerId)?.name} won the trick.`;
      checkWinners();
      endTrick(highestPlayerId);
    } else {
      gameState.currentTurn = getNextActivePlayerId(socket.id);
      checkWinners();
    }
    broadcastState();
  });

  socket.on('sendMessage', (text: string) => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    io.emit('chatMessage', {
      id: Date.now().toString(),
      sender: player.name,
      senderId: socket.id,
      text: text,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('sendEmoji', (emoji: string) => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    io.emit('emojiReaction', { senderId: socket.id, emoji: emoji });
  });

  socket.on('disconnect', () => {
    const disconnectedPlayer = players.find(p => p.id === socket.id);
    if (!disconnectedPlayer) return;
    disconnectedPlayer.isConnected = false;
    const wasHisTurn = gameState.currentTurn === socket.id;

    if (gameState.status === 'LOBBY') {
      players = players.filter(p => p.id !== socket.id);
      gameState.players = players;
    }

    if (players.every(p => !p.isConnected)) {
      players = [];
      gameState.players = [];
      gameState.status = 'LOBBY';
      gameState.message = 'Waiting for players...';
    } else {
      if (gameState.status === 'PLAYING' && wasHisTurn) {
        gameState.currentTurn = getNextActivePlayerId(socket.id);
      }
    }
    broadcastState();
  });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
