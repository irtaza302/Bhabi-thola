
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Ably from 'ably';
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

export default function GamePage() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState<string>('');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [activeEmojis, setActiveEmojis] = useState<EmojiReaction[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
    const [tholaRecipients, setTholaRecipients] = useState<Set<string>>(new Set());
    const [user, setUser] = useState<{ id: string, username: string, name: string, gamesPlayed: number, gamesWon: number } | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const ablyClientRef = useRef<Ably.Realtime | null>(null);
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);

    const addDebugLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
    };

    useEffect(() => {
        // Build session check and initialize Ably
        const initialize = async () => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:53',message:'useEffect initialize called',data:{cookies:document.cookie,hasToken:document.cookie.includes('token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            try {
                const res = await fetch('/api/auth/me');
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:58',message:'/api/auth/me response',data:{status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                if (res.ok) {
                    const data = await res.json();
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:60',message:'Auto-login successful',data:{userId:data.user?.id,username:data.user?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    setUser(data.user);
                    setName(data.user.name);
                    
                    // Generate unique player ID
                    const generatedPlayerId = `${data.user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    setPlayerId(generatedPlayerId);
                    
                    // Get Ably token
                    try {
                        const tokenRes = await fetch('/api/ably/token');
                        if (tokenRes.ok) {
                            const tokenData = await tokenRes.json();
                            
                            // Initialize Ably client with token
                            const ably = new Ably.Realtime({
                                token: tokenData.token,
                                clientId: data.user.id,
                            });
                            
                            ablyClientRef.current = ably;
                            
                            ably.connection.on('connected', () => {
                                addDebugLog(`✅ Connected to Ably`);
                                setConnected(true);
                            });
                            
                            ably.connection.on('disconnected', () => {
                                addDebugLog(`❌ Disconnected from Ably`);
                                setConnected(false);
                            });
                            
                            ably.connection.on('failed', (stateChange) => {
                                addDebugLog(`🔥 Connection failed: ${stateChange.reason}`);
                                setError(`Connection failed: ${stateChange.reason}`);
                            });
                            
                            // Subscribe to game channel
                            const channel = ably.channels.get('game:main');
                            channelRef.current = channel;
                            
                            // Subscribe to game state updates
                            channel.subscribe('gameState', (message) => {
                                const state = message.data as GameState;
                                addDebugLog(`📊 Game state updated: ${state.status}, ${state.players.length} players`);
                                
                                // Check if thola was given and track recipient
                                if (state.message.includes('gave THOLA to')) {
                                    const recipientName = state.message.split('gave THOLA to ')[1]?.split('!')[0];
                                    if (recipientName) {
                                        const recipient = state.players.find(p => p.name === recipientName);
                                        if (recipient) {
                                            setTholaRecipients(prev => new Set([...prev, recipient.id]));
                                            // Clear badge after 3 seconds
                                            setTimeout(() => {
                                                setTholaRecipients(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.delete(recipient.id);
                                                    return newSet;
                                                });
                                            }, 3000);
                                        }
                                    }
                                }
                                
                                setGameState(state);
                            });
                            
                            // Subscribe to chat messages
                            channel.subscribe('chatMessage', (message) => {
                                const msg = message.data as ChatMessage;
                                setMessages(prev => [...prev.slice(-49), msg]);
                                
                                // Add to visible bubbles
                                setVisibleMessages(prev => [...prev, msg]);
                                setTimeout(() => {
                                    setVisibleMessages(prev => prev.filter(m => m.id !== msg.id));
                                }, 3000);
                            });
                            
                            // Subscribe to emoji reactions
                            channel.subscribe('emojiReaction', (message) => {
                                const reaction = message.data as EmojiReaction;
                                const id = Math.random().toString(36).substr(2, 9);
                                const newReaction = { ...reaction, id };
                                setActiveEmojis(prev => [...prev, newReaction]);
                                setTimeout(() => {
                                    setActiveEmojis(prev => prev.filter(e => e.id !== id));
                                }, 3000);
                            });
                            
                            addDebugLog(`Attempting to connect to Ably...`);
                        } else {
                            const errorData = await tokenRes.json().catch(() => ({}));
                            throw new Error(errorData.error || 'Failed to get Ably token');
                        }
                    } catch (err: any) {
                        console.error('Ably initialization failed:', err);
                        addDebugLog(`🔥 Failed to initialize Ably: ${err.message || err}`);
                        setError(`Failed to connect: ${err.message || err}`);
                    }
                } else {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:149',message:'/api/auth/me returned 401 - not authenticated',data:{status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    // User is not authenticated - clear all state
                    setUser(null);
                    setName('');
                    setGameState(null);
                    setJoined(false);
                    setPlayerId('');
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:157',message:'State cleared after 401',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                }
            } catch (err) {
                console.error('Session check failed', err);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:163',message:'Session check error',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
            } finally {
                setIsAuthenticating(false);
            }
        };
        
        initialize();

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
            }
            if (ablyClientRef.current) {
                ablyClientRef.current.close();
            }
        };
    }, []);

    const joinGame = async () => {
        if (!user || !playerId) return;
        addDebugLog(`🚀 Attempting to join game: ${user.name} (${user.id})`);
        try {
            const res = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, name: user.name }),
            });
            if (res.ok) {
                setJoined(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to join game');
            }
        } catch (err) {
            console.error('Join game error:', err);
            setError('Failed to join game');
        }
    };

    const startGame = async () => {
        if (!playerId) return;
        addDebugLog('🎮 Starting game...');
        try {
            const res = await fetch('/api/game/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Failed to start game');
            }
        } catch (err) {
            console.error('Start game error:', err);
            setError('Failed to start game');
        }
    };

    const playCard = async (card: CardType) => {
        if (!playerId) return;
        addDebugLog(`🃏 Playing card: ${card.rank} of ${card.suit}`);
        try {
            const res = await fetch('/api/game/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, card }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Failed to play card');
            }
        } catch (err) {
            console.error('Play card error:', err);
            setError('Failed to play card');
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !playerId) return;
        try {
            const res = await fetch('/api/game/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, text: messageInput }),
            });
            if (res.ok) {
                setMessageInput('');
            }
        } catch (err) {
            console.error('Send message error:', err);
        }
    };

    const sendEmoji = async (emoji: string) => {
        if (!playerId) return;
        try {
            await fetch('/api/game/emoji', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, emoji }),
            });
            setShowEmojiPicker(false);
        } catch (err) {
            console.error('Send emoji error:', err);
        }
    };

    const leaveGame = async () => {
        if (!playerId) return;
        addDebugLog('🚪 Leaving game...');
        try {
            const res = await fetch('/api/game/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId }),
            });
            if (res.ok) {
                // Reset local state
                setJoined(false);
                setGameState(null);
                addDebugLog('✅ Left game successfully');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to leave game');
            }
        } catch (err) {
            console.error('Leave game error:', err);
            setError('Failed to leave game');
        }
    };

    const terminateRoom = async () => {
        if (!playerId) return;
        if (!confirm('Are you sure you want to terminate the entire room? This will remove all players.')) {
            return;
        }
        addDebugLog('🔥 Terminating room...');
        try {
            const res = await fetch('/api/game/terminate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId }),
            });
            if (res.ok) {
                // Reset local state
                setJoined(false);
                setGameState(null);
                addDebugLog('✅ Room terminated successfully');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to terminate room');
            }
        } catch (err) {
            console.error('Terminate room error:', err);
            setError('Failed to terminate room');
        }
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
            <div className="flex flex-col items-center justify-center h-screen bg-transparent px-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass p-10 w-full max-w-md text-center border-white/10 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                        <Trophy size={120} className="text-white" />
                    </div>

                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={async () => {
                                // #region agent log
                                fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:283',message:'Logout button clicked',data:{userId:user?.id,username:user?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
                                // #endregion
                                try {
                                    // Call logout API endpoint to properly delete httpOnly cookie
                                    const res = await fetch('/api/auth/logout', {
                                        method: 'POST',
                                    });
                                    // #region agent log
                                    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:288',message:'Logout API response',data:{status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                    if (res.ok) {
                                        // Clear all local state including gameState
                                        setUser(null);
                                        setName('');
                                        setJoined(false);
                                        setGameState(null);
                                        setPlayerId('');
                                        // #region agent log
                                        fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:300',message:'All state cleared after successful logout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
                                        // #endregion
                                    }
                                } catch (error: any) {
                                    console.error('Logout error:', error);
                                    // #region agent log
                                    fetch('http://127.0.0.1:7243/ingest/a089e923-ee69-4190-bdae-396bac87ab13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/game/page.tsx:300',message:'Logout API call failed',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                }
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-red-400/60 hover:text-red-400 transition-colors z-10"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>

                    <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white shadow-2xl rotate-3">
                        {user.name[0].toUpperCase()}
                    </div>

                    <h1 className="text-3xl font-black text-white mb-1 tracking-tight">{user.name}</h1>
                    <p className="text-green-400/60 mb-8 font-mono text-sm tracking-wider uppercase">@{user.username}</p>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group hover:border-white/10 transition-colors">
                            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1 font-bold">Games</div>
                            <div className="text-2xl font-black text-white">{user.gamesPlayed || 0}</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group hover:border-white/10 transition-colors">
                            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1 font-bold">Wins</div>
                            <div className="text-2xl font-black text-green-400">{user.gamesWon || 0}</div>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="mb-8 flex items-center justify-center gap-3">
                        {connected ? (
                            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Connect Ready</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Connecting...</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={joinGame}
                        disabled={!connected}
                        className="w-full bg-white text-black hover:bg-green-400 hover:text-black disabled:bg-gray-800 disabled:text-gray-500 font-black py-4 rounded-2xl transition-all shadow-2xl text-lg uppercase tracking-widest active:scale-[0.98]"
                    >
                        {connected ? 'Enter Arena' : 'Waiting...'}
                    </button>

                    <p className="mt-6 text-gray-500 text-[10px] uppercase tracking-widest font-bold">Bhabi Thola v0.1.0-alpha</p>
                </motion.div>
            </div>
        );
    }

    if (!gameState) return <div className="p-10 text-white">Connecting...</div>;

    const me = gameState.players.find(p => p.id === playerId);
    const isMyTurn = gameState.currentTurn === playerId;
    const others = gameState.players.filter(p => p.id !== playerId);

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden">
            {/* Header Info */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50">
                <div className="flex gap-3">
                    <div className="glass px-4 py-2 flex items-center gap-2 text-sm font-medium border-white/5">
                        <Users size={18} className="text-blue-400" />
                        <span className="text-white/90">{gameState.players.length}/8 <span className="text-white/40 font-normal">Players</span></span>
                    </div>
                    <div className="hidden md:flex glass px-4 py-2 items-center gap-2 text-sm font-medium border-white/5">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                        <span className="text-white/90">{connected ? 'Live Server' : 'Offline'}</span>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-4">
                    <div className="glass px-4 py-2 flex items-center justify-center gap-2 text-yellow-400 text-sm font-bold border-yellow-500/10">
                        <MessageCircle size={18} className="animate-pulse" />
                        <span className="truncate">{gameState.message}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={leaveGame}
                        className="glass px-4 py-2 text-sm font-medium transition-all text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/10 border-white/5 flex items-center gap-2"
                        title="Leave Game"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Leave</span>
                    </button>
                    <button
                        onClick={terminateRoom}
                        className="glass px-4 py-2 text-sm font-medium transition-all text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border-white/5 flex items-center gap-2"
                        title="Terminate Room (Removes All Players)"
                    >
                        <X size={16} />
                        <span className="hidden md:inline">Terminate</span>
                    </button>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`glass px-4 py-2 text-sm font-medium transition-all ${showDebug ? 'bg-blue-500/20 text-blue-300' : 'text-white/60 hover:text-white border-white/5'}`}
                    >
                        Debug
                    </button>
                </div>
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
                            <div>Player ID: {playerId || 'Not connected'}</div>
                            <div>Status: {gameState?.status || 'Unknown'}</div>
                            <div>Players: {gameState?.players.length || 0}</div>
                            <div>Connection: {connected ? 'Ably Connected' : 'Disconnected'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lobby State */}
            {gameState.status === 'LOBBY' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 md:gap-12 px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-4"
                    >
                        <h2 className="text-sm font-black text-green-400 uppercase tracking-[0.4em] mb-2">Waiting Area</h2>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">THE LOBBY</h1>
                    </motion.div>

                    <div className="flex gap-4 md:gap-6 flex-wrap justify-center max-w-4xl">
                        {gameState.players.map((p: Player, idx: number) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass p-6 text-center w-32 md:w-40 border-white/5 relative group hover:border-white/20 transition-all hover:-translate-y-2"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gray-700 to-black rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-2xl group-hover:rotate-3 transition-transform">
                                    {p.name[0].toUpperCase()}
                                </div>
                                <div className="font-black truncate text-white text-sm md:text-base tracking-tight mb-1">{p.name}</div>
                                {p.id === playerId ? (
                                    <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest">You</div>
                                ) : (
                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic">Guest</div>
                                )}
                            </motion.div>
                        ))}
                    </div>


                    {gameState.players.length >= 2 && gameState.players[0].id === playerId && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="bg-white text-black font-black px-10 md:px-14 py-4 md:py-5 rounded-2xl flex items-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all text-sm md:text-base uppercase tracking-widest hover:bg-green-400"
                        >
                            <Play fill="currentColor" size={20} /> Start Match
                        </motion.button>
                    )}

                    {gameState.players.length < 2 && (
                        <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 px-6 py-2 rounded-full border border-white/5">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            Waiting for players ({gameState.players.length}/2)
                        </div>
                    )}

                    {gameState.players.length >= 2 && gameState.players[0].id !== playerId && (
                        <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 px-6 py-2 rounded-full border border-white/5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                            Host is preparing...
                        </div>
                    )}

                    {/* Leave Game and Terminate Room Buttons in Lobby */}
                    <div className="mt-4 flex gap-3 justify-center">
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={leaveGame}
                            className="glass px-6 py-3 text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
                        >
                            <LogOut size={18} />
                            Leave Game
                        </motion.button>
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={terminateRoom}
                            className="glass px-6 py-3 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
                        >
                            <X size={18} />
                            Terminate Room
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Playing State */}
            {gameState.status === 'PLAYING' && (
                <div className="flex-1 relative">
                    {/* Other Players */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-6 md:gap-12 z-40">
                        {others.map((p: Player) => (
                            <div key={p.id} className={`flex flex-col items-center gap-2 transition-all relative ${gameState.currentTurn === p.id ? 'scale-110' : 'opacity-80'}`}>
                                <div className="relative">
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 ${gameState.currentTurn === p.id ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'border-white/10'} flex items-center justify-center bg-gradient-to-br from-gray-800 to-black text-lg md:text-xl font-black text-white overflow-visible transition-shadow`}>
                                        {p.name[0].toUpperCase()}

                                        {/* Turn Indicator Ring */}
                                        {gameState.currentTurn === p.id && (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                className="absolute -inset-1 border-t-2 border-yellow-400 rounded-full opacity-40"
                                            />
                                        )}

                                        {/* Chat Bubbles for others */}
                                        <AnimatePresence>
                                            {visibleMessages.filter(m => m.senderId === p.id).map((m) => (
                                                <motion.div
                                                    key={m.id}
                                                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: -50 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    className="absolute bottom-full mb-4 z-50 pointer-events-none"
                                                >
                                                    <div className="bg-white text-black px-4 py-2 rounded-2xl rounded-bl-none shadow-2xl text-xs font-bold whitespace-nowrap border-b-2 border-gray-200">
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
                                                    animate={{ y: -80, opacity: 1, scale: 1.8 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute pointer-events-none text-3xl z-[60]"
                                                >
                                                    {e.emoji}
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {/* Thola Received Badge */}
                                        <AnimatePresence>
                                            {tholaRecipients.has(p.id) && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="absolute -top-2 -right-2 z-[70]"
                                                >
                                                    <div className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center gap-1">
                                                        <span>🔥</span>
                                                        <span>THOLA</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Card Count Badge */}
                                    <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                                        {p.hand.length}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="text-xs font-black text-white/90 tracking-tight uppercase">{p.name}</div>
                                    {p.isOut && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-yellow-400 font-bold text-[10px]">
                                            <Trophy size={10} fill="currentColor" /> OUT
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Center Table */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[300px] h-[180px] md:w-[600px] md:h-[350px] border-2 border-white/5 rounded-[150px] md:rounded-[200px] bg-black/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.2)] relative">
                            {/* Inner Circle Decoration */}
                            <div className="absolute inset-8 border border-white/5 rounded-[120px] md:rounded-[180px] opacity-20" />

                            <div className="absolute inset-0 flex items-center justify-center gap-4">
                                <AnimatePresence mode="popLayout">
                                    {gameState.tableCards.map((tc: { playerId: string; card: CardType }, idx: number) => (
                                        <motion.div
                                            key={`${tc.card.rank}-${tc.card.suit}-${idx}`}
                                            initial={{ scale: 0.5, opacity: 0, y: 50, rotate: 0 }}
                                            animate={{
                                                scale: 1,
                                                opacity: 1,
                                                y: 0,
                                                rotate: (idx - (gameState.tableCards.length - 1) / 2) * 8
                                            }}
                                            className="relative z-10"
                                        >
                                            <Card card={tc.card} disabled isTable />
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap"
                                            >
                                                {gameState.players.find((p: Player) => p.id === tc.playerId)?.name}
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {gameState.currentSuit && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-[100px] md:text-[200px] font-black pointer-events-none select-none text-white transition-all">
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
                                {visibleMessages.filter(m => m.senderId === playerId).map((m) => (
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
                                {activeEmojis.filter(e => e.senderId === playerId).map((e) => (
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

                        <AnimatePresence>
                            {tholaRecipients.has(playerId) && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0, y: -10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="mb-2 md:mb-4"
                                >
                                    <div className="bg-red-500 text-white text-xs md:text-sm font-black px-4 md:px-6 py-2 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center gap-2">
                                        <span className="text-lg">🔥</span>
                                        <span>YOU RECEIVED THOLA!</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-[100] px-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass p-12 max-w-lg w-full text-center border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.05)]"
                    >
                        <Trophy size={80} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" />
                        <h1 className="text-5xl font-black mb-2 text-white tracking-tighter italic">GAME OVER</h1>
                        <p className="text-white/40 uppercase tracking-[0.4em] text-[10px] mb-10 font-bold">Session Conclusion</p>

                        <div className="mb-12">
                            <div className="text-gray-500 uppercase text-[10px] tracking-[0.3em] mb-4 font-black">The Designated Bhabi</div>
                            <div className="px-8 py-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-3xl font-black tracking-tight">
                                {gameState.players.find((p: Player) => !p.isOut)?.name.toUpperCase()}
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-white text-black font-black px-12 py-4 rounded-2xl hover:bg-green-400 transition-all text-sm uppercase tracking-widest active:scale-95"
                        >
                            New Match
                        </button>
                    </motion.div>
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
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="glass p-3 mb-2 flex gap-3 overflow-x-auto max-w-[320px] border-white/10 shadow-2xl"
                        >
                            {['😊', '😂', '🔥', '👎', '👍', '🤡', '🎲', '😱', '🥳', '😎'].map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendEmoji(emoji)}
                                    className="text-3xl hover:scale-125 transition-transform active:scale-95"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-4 rounded-2xl glass transition-all border-white/5 ${showEmojiPicker ? 'bg-yellow-500/20 rotate-12' : 'hover:bg-white/10 shadow-xl'}`}
                    >
                        <Smile size={28} className={showEmojiPicker ? 'text-yellow-400' : 'text-white/80'} />
                    </button>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`p-4 rounded-2xl glass transition-all border-white/5 ${showChat ? 'bg-blue-500/20' : 'hover:bg-white/10 shadow-xl'} relative group`}
                    >
                        <MessageCircle size={28} className={showChat ? 'text-blue-400' : 'text-white/80'} />
                        {messages.length > 0 && !showChat && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-black text-white shadow-lg border-2 border-background animate-bounce">
                                {messages.length > 9 ? '9+' : messages.length}
                            </div>
                        )}
                        <span className="absolute right-full mr-4 px-3 py-1 bg-black text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold uppercase tracking-widest hidden md:block">
                            Room Chat
                        </span>
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
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === playerId ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] text-white/50">{msg.timestamp}</span>
                                        <span className="text-xs font-bold text-gray-300">{msg.senderId === playerId ? 'You' : msg.sender}</span>
                                    </div>
                                    <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm ${msg.senderId === playerId
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
