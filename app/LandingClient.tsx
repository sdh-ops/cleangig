'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingClient() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-md mx-auto shadow-sm">
            {/* Top Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-center p-4 pb-2 justify-between z-10"
            >
                <div className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 cursor-pointer">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </div>
                <img src="/logo_kr.png" alt="CleanGig" className="h-6 w-auto object-contain" />
            </motion.div>

            {/* Hero Image Section */}
            <div className="@container flex-1 flex flex-col relative overflow-hidden">
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="@[480px]:px-4 @[480px]:py-3 flex-1 flex flex-col"
                >
                    <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden @[480px]:rounded-2xl flex-1 min-h-[320px] shadow-sm relative" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAiUdrOhxD_5NpgTm8pMqZ6sbQlZ_4uD5m6GrwX-UXB_1VLarE_KvB1YziAEa-kKW6HlGAsrNW5AxMC7bXeVOyN5pRqCUixRwldihGcLyXABncNNDFJZRe7hLbxodkV09_OuYYgW3BxZ2dh5HjbvmQcQUR-GkrraYMQKk55Ii2OJ5YIGgH-XyzzLNPk8lQPeeAGAG52KJe2xxPp8Bjt-HY8z423a9_sFq_o0WM1WOom8zq9GJB3UNEf-rAR2-eRfA9QQRuOR-KQjOA")' }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-background-light/90 dark:from-background-dark/90 via-transparent to-transparent"></div>
                    </div>
                </motion.div>
            </div>

            {/* Content Area */}
            <div className="px-6 pb-10 pt-8 flex flex-col items-center gap-6">
                <motion.img
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 100 }}
                    src="/appicon.png"
                    alt="CleanGig"
                    className="w-16 h-16 rounded-2xl shadow-xl mb-2 z-10"
                />

                <div className="space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="text-[28px] font-bold leading-[1.2] tracking-[-0.015em] text-center text-slate-900 dark:text-slate-100"
                    >
                        공간의 가치를 높이는<br />클리닝 서비스, 클린긱
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="text-center text-slate-600 dark:text-slate-400 text-sm font-medium"
                    >
                        검증된 파트너와 함께하는<br />맞춤형 청소 서비스를 경험해보세요.
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex mt-4 w-full"
                >
                    <Link href="/login" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all relative group">
                        <motion.div
                            animate={{
                                x: ["-100%", "200%"],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "linear",
                                repeatDelay: 3
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                        />
                        <span className="relative z-10">시작하기</span>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
