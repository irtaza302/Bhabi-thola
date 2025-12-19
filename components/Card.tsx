
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
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: disabled ? 0.6 : 1,
                y: 0
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={!disabled && (isLegal || isLegal === undefined) ? onClick : undefined}
            className={`card ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isTable ? 'table-card' : 'hand-card'} ${isLegal ? 'legal-move' : ''}`}
            style={{ zIndex: isTable ? 10 : 1 }}
        >
            <div className={`card-inner ${suitClass} relative flex flex-col justify-between ${disabled ? 'border-gray-400' : 'border-gray-200'} ${isLegal ? 'is-legal' : ''}`}>
                <div className={`card-corner-top ${suitClass}`}>
                    <span className={`card-rank ${isRed ? 'text-red-600' : isBlack ? 'text-black' : ''}`}>{card.rank}</span>
                    <span className={`card-suit ${suitClass}`}>{suitSymbols[card.suit]}</span>
                </div>

                <div className={`card-center ${suitClass}`}>
                    {suitSymbols[card.suit]}
                </div>

                <div className={`card-corner-bottom ${suitClass}`}>
                    <span className={`card-rank ${isRed ? 'text-red-600' : isBlack ? 'text-black' : ''}`}>{card.rank}</span>
                    <span className={`card-suit ${suitClass}`}>{suitSymbols[card.suit]}</span>
                </div>

                {isLegal && (
                    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                )}
            </div>
        </motion.div>
    );
};

export default Card;
