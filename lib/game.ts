export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // A=14, K=13... 2=2
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isOut: boolean;
  order: number;
  isConnected: boolean;
  dbId?: string;
  tholaReceivedThisGame?: number; // Track thola received in current game
}

export interface GameState {
  players: Player[];
  currentTurn: string; // player id
  currentSuit: Suit | null;
  tableCards: { playerId: string; card: Card }[];
  lastTholaBy: string | null;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  winnerOrder: string[]; // Order in which players got out
  message: string;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: index + 2,
      });
    });
  });
  return deck;
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const dealCards = (players: Player[]): Player[] => {
  const deck = shuffle(createDeck());
  const newPlayers: Player[] = players.map((p) => ({ 
    ...p, 
    hand: [] as Card[], 
    isOut: false,
    tholaReceivedThisGame: p.tholaReceivedThisGame ?? 0
  }));

  deck.forEach((card, index) => {
    const playerIndex = index % players.length;
    newPlayers[playerIndex].hand.push(card);
  });

  return newPlayers;
};

export const getStartingPlayer = (players: Player[]): string => {
  // Traditional Bhabi Thola starts with Ace of Spades
  for (const player of players) {
    if (player.hand.some((c) => c.suit === "S" && c.rank === "A")) {
      return player.id;
    }
  }
  return players[0].id;
};

export const isValidMove = (
  playerHand: Card[],
  card: Card,
  currentSuit: Suit | null
): boolean => {
  if (!currentSuit) return true;
  if (card.suit === currentSuit) return true;

  // If player doesn't have the current suit, they can play any card (Thola)
  const hasSuit = playerHand.some((c) => c.suit === currentSuit);
  return !hasSuit;
};

export const findTholaRecipient = (
  tableCards: { playerId: string; card: Card }[],
  currentSuit: Suit
): string => {
  let highestValue = -1;
  let recipientId = "";

  tableCards.forEach((tc) => {
    if (tc.card.suit === currentSuit && tc.card.value > highestValue) {
      highestValue = tc.card.value;
      recipientId = tc.playerId;
    }
  });

  return recipientId;
};
