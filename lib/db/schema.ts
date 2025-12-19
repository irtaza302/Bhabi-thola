import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    email: text('email').unique(),
    gamesPlayed: integer('games_played').default(0).notNull(),
    gamesWon: integer('games_won').default(0).notNull(),
    gamesLost: integer('games_lost').default(0).notNull(),
    tholaReceived: integer('thola_received').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const games = pgTable('games', {
    id: uuid('id').defaultRandom().primaryKey(),
    status: text('status').notNull().default('waiting'), // waiting, in_progress, completed
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gameSessions = pgTable('game_sessions', {
    id: text('id').primaryKey(), // Using text to allow fixed session ID like "main-game-session"
    gameState: jsonb('game_state').notNull(), // Stores the full GameState object
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
