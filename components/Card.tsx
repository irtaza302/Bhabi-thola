
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../lib/game';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    disabled?: boolean;
    isTable?: boolean;
    isLegal?: boolean;
}

const suitSymbols: Record<string, string> = {
    'S': '♠',
    'H': '♥',
    'D': '♦',
    'C': '♣'
};

const Card: React.FC<CardProps> = ({ card, onClick, disabled, isTable, isLegal }) => {
    const suitClass = `suit-${card.suit}`;
    const isRed = card.suit === 'H' || card.suit === 'D';
    const isBlack = card.suit === 'S' || card.suit === 'C';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
                opacity: disabled ? 0.4 : 1,
                scale: 1,
                y: 0,
            }}
            whileHover={!disabled ? { y: -10, scale: 1.05 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={!disabled && (isLegal || isLegal === undefined) ? onClick : undefined}
            className={`card ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isTable ? 'table-card' : 'hand-card'} ${isLegal ? 'legal-move' : ''}`}
            style={{ zIndex: isTable ? 10 : 1 }}
        >
            <div className={`card-inner ${suitClass} relative flex flex-col justify-between overflow-hidden ${isLegal ? 'border-primary shadow-[0_0_15px_rgba(101,255,160,0.3)]' : 'border-white/10'}`}>
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                {/* Holographic sweep for legal moves */}
                {isLegal && (
                    <motion.div
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                    />
                )}

                <div className={`card-corner-top ${suitClass} z-10`}>
                    <span className={`card-rank font-black text-lg ${isRed ? 'text-red-600' : isBlack ? 'text-gray-900' : ''}`}>{card.rank}</span>
                    <span className={`card-suit text-xl ${suitClass}`}>{suitSymbols[card.suit]}</span>
                </div>

                <div className={`card-center ${suitClass} z-10 select-none opacity-20`}>
                    {suitSymbols[card.suit]}
                </div>

                <div className={`card-corner-bottom ${suitClass} z-10`}>
                    <span className={`card-rank font-black text-lg ${isRed ? 'text-red-600' : isBlack ? 'text-gray-900' : ''}`}>{card.rank}</span>
                    <span className={`card-suit text-xl ${suitClass}`}>{suitSymbols[card.suit]}</span>
                </div>
            </div>
        </motion.div>
    );
};

export default Card;
