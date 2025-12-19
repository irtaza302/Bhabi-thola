
'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Card as CardType, Player, isValidMove } from '../../lib/game';
import Card from '../../components/Card';
import AuthForm from '../../components/AuthForm';
import { Trophy, Play, Users, MessageCircle, Wifi, WifiOff, Send, Smile, X, LogOut, User as UserIcon } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: string;
    senderId: string;
    text: string;
    timestamp: string;
}

interface EmojiReaction {
    id: string;
    senderId: string;
    emoji: string;
}

let socket: Socket;

export default function GamePage() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(false);
    const [socketId, setSocketId] = useState<string>('');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [activeEmojis, setActiveEmojis] = useState<EmojiReaction[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
    const [user, setUser] = useState<{ id: string, username: string, name: string, gamesPlayed: number, gamesWon: number } | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    const addDebugLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
    };

    useEffect(() => {
        // Build session check
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setName(data.user.name);
                }
            } catch (err) {
                console.error('Session check failed', err);
            } finally {
                setIsAuthenticating(false);
            }
        };
        checkSession();

        // Use current hostname so it works on localhost and network IP
        const socketUrl = typeof window !== 'undefined'
            ? `http://${window.location.hostname}:3001`
            : 'http://localhost:3001';

        addDebugLog(`Attempting to connect to: ${socketUrl}`);
        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            forceNew: true
        });

        socket.on('connect', () => {
            addDebugLog(`✅ Connected to server with ID: ${socket.id}`);
            setConnected(true);
            setSocketId(socket.id || '');
        });

        socket.on('disconnect', (reason) => {
            addDebugLog(`❌ Disconnected from server. Reason: ${reason}`);
            setConnected(false);
            setSocketId('');
        });

        socket.on('connect_error', (error) => {
            addDebugLog(`🔥 Connection error: ${error.message}`);
            setError(`Connection failed: ${error.message}`);
        });

        socket.on('gameState', (state: GameState) => {
            addDebugLog(`📊 Game state updated: ${state.status}, ${state.players.length} players`);
            setGameState(state);
        });

        socket.on('chatMessage', (msg: ChatMessage) => {
            setMessages(prev => [...prev.slice(-49), msg]);

            // Add to visible bubbles
            setVisibleMessages(prev => [...prev, msg]);
            setTimeout(() => {
                setVisibleMessages(prev => prev.filter(m => m.id !== msg.id));
            }, 3000);

            if (!showChat) {
                // Peek chat if it's closed
            }
        });

        socket.on('emojiReaction', (reaction: EmojiReaction) => {
            const id = Math.random().toString(36).substr(2, 9);
            const newReaction = { ...reaction, id };
            setActiveEmojis(prev => [...prev, newReaction]);
            setTimeout(() => {
                setActiveEmojis(prev => prev.filter(e => e.id !== id));
            }, 3000);
        });

        // Ping test
        const pingInterval = setInterval(() => {
            if (socket.connected) {
                const start = Date.now();
                socket.emit('ping', start, (response: number) => {
                    const latency = Date.now() - response;
                    addDebugLog(`🏓 Ping: ${latency}ms`);
                });
            }
        }, 10000); // Every 10 seconds

        return () => {
            clearInterval(pingInterval);
            socket.disconnect();
        };
    }, []);

    const joinGame = () => {
        if (!user) return;
        addDebugLog(`🚀 Attempting to join game: ${user.name} (${user.id})`);
        socket.emit('join', { name: user.name, userId: user.id });
        setJoined(true);
    };

    const startGame = () => {
        addDebugLog('🎮 Starting game...');
        socket.emit('startGame');
    };

    const playCard = (card: CardType) => {
        addDebugLog(`🃏 Playing card: ${card.rank} of ${card.suit}`);
        socket.emit('playCard', card);
    };

    const sendMessage = () => {
        if (!messageInput.trim()) return;
        socket.emit('sendMessage', messageInput);
        setMessageInput('');
    };

    const sendEmoji = (emoji: string) => {
        socket.emit('sendEmoji', emoji);
        setShowEmojiPicker(false);
    };

    if (isAuthenticating) {
        return (
            <div className="flex items-center justify-center h-screen bg-black/50">
                <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black/50 px-4 py-10">
                <h1 className="text-4xl md:text-6xl font-bold mb-8 text-white tracking-[0.2em] text-center">BHABI THOLA</h1>
                <AuthForm onSuccess={(u) => {
                    setUser(u);
                    setName(u.name);
                }} />
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black/50 px-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass p-6 md:p-8 w-full max-w-md text-center"
                >
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={() => {
                                document.cookie = 'token=; Max-Age=0; path=/;';
                                setUser(null);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                        {user.name[0].toUpperCase()}
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-1">{user.name}</h1>
                    <p className="text-gray-400 mb-6 font-mono text-sm">@{user.username}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Played</div>
                            <div className="text-xl font-bold text-white">{user.gamesPlayed || 0}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Won</div>
                            <div className="text-xl font-bold text-green-400">{user.gamesWon || 0}</div>
                        </div>
                    </div>

                    <p className="text-gray-300 mb-6 text-sm">Ready to join the round?</p>

                    {/* Connection Status */}
                    <div className="mb-6 flex items-center justify-center gap-2 text-xs md:text-sm">
                        {connected ? (
                            <>
                                <Wifi size={14} className="text-green-400 md:w-4 md:h-4" />
                                <span className="text-green-400">Connected</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={14} className="text-red-400 md:w-4 md:h-4" />
                                <span className="text-red-400">Connecting...</span>
                            </>
                        )}
                    </div>

                    <button
                        onClick={joinGame}
                        disabled={!connected}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/40 text-lg"
                    >
                        {connected ? 'JOIN ROOM' : 'CONNECTING...'}
                    </button>
                </motion.div>
            </div>
        );
    }

    if (!gameState) return <div className="p-10 text-white">Connecting...</div>;

    const me = gameState.players.find(p => p.id === socket.id);
    const isMyTurn = gameState.currentTurn === socket.id;
    const others = gameState.players.filter(p => p.id !== socket.id);

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden">
            {/* Header Info */}
            <div className="absolute top-2 md:top-4 left-2 md:left-4 flex flex-wrap gap-2 md:gap-4 z-50 max-w-full">
                <div className="glass px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                    <Users size={14} className="md:w-[18px] md:h-[18px]" />
                    <span>{gameState.players.length}/8 Players</span>
                </div>
                <div className="glass px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-yellow-400 text-xs md:text-sm">
                    <MessageCircle size={14} className="md:w-[18px] md:h-[18px]" />
                    <span className="max-w-[150px] md:max-w-[300px] truncate">{gameState.message}</span>
                </div>
                <div className={`glass px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
                    {connected ? <Wifi size={14} className="md:w-[18px] md:h-[18px]" /> : <WifiOff size={14} className="md:w-[18px] md:h-[18px]" />}
                    <span className="hidden md:inline">{connected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="glass px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-blue-400 hover:text-blue-300"
                >
                    Debug
                </button>
            </div>

            {/* Debug Panel */}
            {showDebug && (
                <div className="absolute top-16 md:top-20 right-2 md:right-4 w-80 max-w-[90vw] glass p-4 z-50 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-white font-bold text-sm">Debug Console</h3>
                        <button
                            onClick={() => setDebugLogs([])}
                            className="text-red-400 text-xs hover:text-red-300"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="space-y-1">
                        {debugLogs.map((log, index) => (
                            <div key={index} className="text-xs text-gray-300 font-mono break-words">
                                {log}
                            </div>
                        ))}
                        {debugLogs.length === 0 && (
                            <div className="text-xs text-gray-500">No debug logs yet...</div>
                        )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="text-xs text-gray-400">
                            <div>Socket ID: {socketId || 'Not connected'}</div>
                            <div>Status: {gameState?.status || 'Unknown'}</div>
                            <div>Players: {gameState?.players.length || 0}</div>
                            <div>URL: {typeof window !== 'undefined' ? `${window.location.hostname}:3001` : 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lobby State */}
            {gameState.status === 'LOBBY' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 px-4">
                    <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
                        {gameState.players.map((p: Player) => (
                            <motion.div
                                key={p.id}
                                layout
                                className="glass p-4 md:p-6 text-center w-24 md:w-32 relative"
                            >
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-xl md:text-2xl font-bold text-white">
                                    {p.name[0].toUpperCase()}
                                </div>
                                <div className="font-bold truncate text-white text-sm md:text-base">{p.name}</div>
                                {p.id === socket.id && <div className="text-xs text-green-400 mt-1">(You)</div>}
                            </motion.div>
                        ))}
                    </div>


                    {gameState.players.length >= 2 && gameState.players[0].id === socket.id && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 md:px-10 py-3 md:py-4 rounded-full flex items-center gap-2 shadow-xl transition-all text-sm md:text-base"
                        >
                            <Play fill="currentColor" size={18} className="md:w-5 md:h-5" /> START GAME
                        </motion.button>
                    )}

                    {gameState.players.length < 2 && (
                        <div className="text-white/60 text-sm">
                            Waiting for more players... ({gameState.players.length}/2 minimum, max 8)
                        </div>
                    )}

                    {gameState.players.length >= 2 && gameState.players[0].id !== socket.id && (
                        <div className="text-white/60 text-sm">
                            Waiting for {gameState.players[0].name} to start the game...
                        </div>
                    )}
                </div>
            )}

            {/* Playing State */}
            {gameState.status === 'PLAYING' && (
                <div className="flex-1 relative">
                    {/* Other Players */}
                    <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 flex gap-4 md:gap-10 z-40">
                        {others.map((p: Player) => (
                            <div key={p.id} className={`flex flex-col items-center gap-1 md:gap-2 transition-all relative ${gameState.currentTurn === p.id ? 'scale-110' : 'opacity-70'}`}>
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 ${gameState.currentTurn === p.id ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-white/20'} flex items-center justify-center bg-gray-800 text-base md:text-lg font-bold text-white relative`}>
                                    {p.name[0]}
                                    {/* Chat Bubbles for others */}
                                    <AnimatePresence>
                                        {visibleMessages.filter(m => m.senderId === p.id).map((m) => (
                                            <motion.div
                                                key={m.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                animate={{ opacity: 1, y: -40, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="absolute bottom-full mb-2 z-50 pointer-events-none"
                                            >
                                                <div className="bg-white text-black px-3 py-1.5 rounded-2xl rounded-bl-none shadow-xl text-[11px] font-medium whitespace-nowrap border border-gray-200 min-w-[60px] max-w-[150px] truncate text-center">
                                                    {m.text}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Emojis for this player */}
                                    <AnimatePresence>
                                        {activeEmojis.filter(e => e.senderId === p.id).map((e) => (
                                            <motion.div
                                                key={e.id}
                                                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                                                animate={{ y: -60, opacity: 1, scale: 1.5 }}
                                                exit={{ y: -100, opacity: 0 }}
                                                className="absolute pointer-events-none text-2xl z-[60]"
                                            >
                                                {e.emoji}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <div className="text-[10px] md:text-xs font-bold whitespace-nowrap text-white">{p.name}</div>
                                <div className="text-[8px] md:text-[10px] bg-white/20 px-1.5 md:px-2 rounded-full text-white">{p.hand.length} cards</div>
                                {p.isOut && <Trophy size={12} className="text-yellow-400 md:w-3.5 md:h-3.5" />}
                            </div>
                        ))}
                    </div>

                    {/* Center Table */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[280px] h-[168px] md:w-[500px] md:h-[300px] border-4 border-white/5 rounded-[140px] md:rounded-[150px] relative">
                            <div className="absolute inset-0 flex items-center justify-center gap-2 md:gap-4">
                                <AnimatePresence>
                                    {gameState.tableCards.map((tc: { playerId: string; card: CardType }, idx: number) => (
                                        <div key={`${tc.card.rank}-${tc.card.suit}-${idx}`} className="relative transition-transform duration-500" style={{ transform: `rotate(${(idx - (gameState.tableCards.length - 1) / 2) * 10}deg) translateY(-10px)` }}>
                                            <Card card={tc.card} disabled isTable />
                                            <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] font-bold text-white/50 whitespace-nowrap">
                                                {gameState.players.find((p: Player) => p.id === tc.playerId)?.name}
                                            </div>
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {gameState.currentSuit && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 text-[60px] md:text-[120px] font-bold pointer-events-none text-white">
                                    {gameState.currentSuit === 'S' && '♠'}
                                    {gameState.currentSuit === 'H' && '♥'}
                                    {gameState.currentSuit === 'D' && '♦'}
                                    {gameState.currentSuit === 'C' && '♣'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Hand */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
                        <div className="relative mb-2">
                            <AnimatePresence>
                                {visibleMessages.filter(m => m.senderId === socket.id).map((m) => (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                        animate={{ opacity: 1, y: -40, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none"
                                    >
                                        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-none shadow-xl text-sm font-medium whitespace-nowrap border border-blue-400/30">
                                            {m.text}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <AnimatePresence>
                                {activeEmojis.filter(e => e.senderId === socket.id).map((e) => (
                                    <motion.div
                                        key={e.id}
                                        initial={{ y: 0, opacity: 0, scale: 0.5 }}
                                        animate={{ y: -60, opacity: 1, scale: 2 }}
                                        exit={{ y: -100, opacity: 0 }}
                                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-3xl z-[60]"
                                    >
                                        {e.emoji}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {isMyTurn && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-2 md:mb-4 text-yellow-400 font-bold uppercase tracking-widest text-sm md:text-lg px-4 md:px-8"
                            >
                                YOUR TURN
                            </motion.div>
                        )}
                        <div className="hand-container">
                            <div className="hand-scroll">
                                {me && [...me.hand]
                                    .sort((a: CardType, b: CardType) => (a.suit === b.suit ? a.value - b.value : a.suit.localeCompare(b.suit)))
                                    .map((card: CardType) => {
                                        const isLegal = isMyTurn && isValidMove(me.hand, card, gameState.currentSuit);
                                        return (
                                            <div key={`${card.rank}-${card.suit}`} className="hand-card-wrapper">
                                                <Card
                                                    card={card}
                                                    onClick={() => playCard(card)}
                                                    disabled={!isMyTurn || !isLegal}
                                                    isLegal={isLegal}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            {me && me.hand.length > 6 && (
                                <div className="text-center text-white/60 text-xs mt-2 md:hidden px-4">
                                    ← Swipe to see all cards →
                                </div>
                            )}
                        </div>
                        {me?.isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                                <div className="text-center px-4">
                                    <Trophy size={48} className="text-yellow-400 mx-auto mb-4 md:w-16 md:h-16" />
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">YOU ARE OUT!</h2>
                                    <p className="text-gray-400 text-sm md:text-base">Keep watching to see who becomes the BHABI!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Finished State */}
            {gameState.status === 'FINISHED' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] px-4">
                    <h1 className="text-4xl md:text-6xl font-black mb-6 md:mb-8 text-white">GAME OVER!</h1>
                    <div className="text-2xl md:text-4xl text-red-500 font-bold mb-8 md:mb-12 flex flex-col items-center gap-4">
                        <div className="text-gray-400 uppercase text-xs md:text-sm tracking-[0.5em] md:tracking-[1em]">The Bhabi is</div>
                        <div className="px-6 md:px-10 py-3 md:py-4 glass border-red-500/50 text-white text-xl md:text-4xl">
                            {gameState.players.find((p: Player) => !p.isOut)?.name.toUpperCase()}
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="bg-white text-black font-bold px-8 md:px-10 py-3 md:py-4 rounded-full hover:scale-105 transition-all text-sm md:text-base"
                    >
                        PLAY AGAIN
                    </button>
                </div>
            )}

            {error && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-10 right-10 bg-red-600 px-6 py-3 rounded-lg font-bold shadow-2xl z-50 text-white"
                >
                    {error}
                </motion.div>
            )}

            {/* Chat & Emojis Toggle */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
                <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="glass p-2 mb-2 flex gap-2 overflow-x-auto max-w-[280px]"
                        >
                            {['😊', '😂', '🔥', '👎', '👍', '🤡', '🎲', '😱', '🥳', '😎'].map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendEmoji(emoji)}
                                    className="text-2xl hover:scale-125 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-3 rounded-full glass transition-all ${showEmojiPicker ? 'bg-yellow-500/30' : 'hover:bg-white/20'}`}
                    >
                        <Smile size={24} className="text-white" />
                    </button>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`p-3 rounded-full glass transition-all ${showChat ? 'bg-blue-500/30' : 'hover:bg-white/20'} relative`}
                    >
                        <MessageCircle size={24} className="text-white" />
                        {messages.length > 0 && !showChat && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                                {messages.length > 9 ? '9+' : messages.length}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Chat Window */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="fixed inset-y-0 right-0 w-full sm:w-80 glass z-[60] flex flex-col rounded-l-3xl border-l border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <MessageCircle size={18} /> Chat
                            </h3>
                            <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] text-white/50">{msg.timestamp}</span>
                                        <span className="text-xs font-bold text-gray-300">{msg.senderId === socket.id ? 'You' : msg.sender}</span>
                                    </div>
                                    <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm ${msg.senderId === socket.id
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'glass text-gray-100 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="text-center text-white/30 text-sm mt-10">No messages yet. Say hi!</div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 flex gap-2">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-1 ring-blue-500 text-sm"
                            />
                            <button
                                onClick={sendMessage}
                                className="p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
