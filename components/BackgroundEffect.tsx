'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundEffect() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Mesh Gradient Overlay */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `
                        radial-gradient(at 0% 0%, hsla(160, 84%, 39%, 1) 0, transparent 50%),
                        radial-gradient(at 50% 0%, hsla(180, 80%, 40%, 1) 0, transparent 50%),
                        radial-gradient(at 100% 0%, hsla(160, 84%, 39%, 1) 0, transparent 50%),
                        radial-gradient(at 0% 100%, hsla(180, 80%, 40%, 1) 0, transparent 50%),
                        radial-gradient(at 50% 100%, hsla(160, 84%, 39%, 1) 0, transparent 50%),
                        radial-gradient(at 100% 100%, hsla(180, 80%, 40%, 1) 0, transparent 50%)
                    `,
                    filter: 'blur(80px)'
                }}
            />

            {/* Animated Grain/Noise */}
            <motion.div
                animate={{
                    x: [0, -50, 50, -20, 20],
                    y: [0, 50, -50, 20, -20]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute inset-[-100%] opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3%3E")`
                }}
            />

            {/* Subtle Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />
        </div>
    );
}
