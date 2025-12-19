'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, ArrowRight, User, Lock, Mail, Tag } from 'lucide-react';

interface AuthFormProps {
    onSuccess: (user: any) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess(data.user);
            } else {
                // Show detailed error message if available
                const errorMsg = data.message || data.error || 'Something went wrong';
                console.error('Auth error:', { status: res.status, data });
                setError(errorMsg);
            }
        } catch (err: any) {
            console.error('Connection error:', err);
            setError(err.message || 'Connection failed. Please check your internet connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="w-full max-w-md">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-10 relative overflow-hidden backdrop-blur-2xl border-white/10"
            >
                <div className="absolute top-0 right-0 p-6 opacity-[0.05] text-white">
                    {isLogin ? <LogIn size={100} /> : <UserPlus size={100} />}
                </div>

                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-400 mb-10 text-sm">
                    {isLogin ? 'Sign in to jump into the action.' : 'Join the game and start your winning streak.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="space-y-5">
                            <div className="relative group">
                                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 ring-green-500/50 focus:bg-white/10 text-white transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email (Optional)"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 ring-green-500/50 focus:bg-white/10 text-white transition-all placeholder:text-gray-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" size={18} />
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 ring-green-500/50 focus:bg-white/10 text-white transition-all placeholder:text-gray-600"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" size={18} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 ring-green-500/50 focus:bg-white/10 text-white transition-all placeholder:text-gray-600"
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-400 text-xs bg-red-400/10 p-4 rounded-xl border border-red-400/20 font-medium"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-800 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-green-900/40 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="uppercase tracking-wider">{isLogin ? 'Enter Game' : 'Join Arena'}</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-500 hover:text-green-400 transition-colors text-sm font-medium"
                    >
                        {isLogin ? "New player? Register here" : "Frequent player? Login here"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
