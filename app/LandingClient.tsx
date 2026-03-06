'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingClient() {
    return (
        <div className="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-md mx-auto shadow-sm">
            {/* Main Centered Content - Full Screen Center */}
            <div className="flex-1 flex flex-col justify-center items-center px-10 text-center">
                {/* Logo */}
                <motion.img
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 100 }}
                    src="/appicon.png"
                    alt="CleanGig"
                    className="w-24 h-24 rounded-[32px] shadow-2xl mb-12 z-10 border-4 border-white dark:border-slate-800"
                />

                {/* Headlines */}
                <div className="space-y-8 mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-[26px] font-black leading-[1.4] tracking-tight text-slate-900 dark:text-white"
                    >
                        공간 운영의 청소 걱정은 줄이고<br />
                        <span className="text-primary italic">누군가에겐 새로운 수익 기회를 만듭니다.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="text-slate-500 dark:text-slate-400 text-[17px] font-bold leading-relaxed max-w-[320px] mx-auto"
                    >
                        원할 때 선택해 일할 수 있는<br />
                        스마트 클리닝 매칭 플랫폼
                    </motion.p>
                </div>

                {/* Start Button */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full"
                >
                    <Link href="/login" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[24px] h-16 px-5 bg-primary text-white text-xl font-black leading-normal tracking-wide shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all relative group">
                        <motion.div
                            animate={{
                                x: ["-100%", "200%"],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2.5,
                                ease: "linear",
                                repeatDelay: 2
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-24"
                        />
                        <span className="relative z-10">시작하기</span>
                    </Link>
                </motion.div>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        </div>
    );
}
