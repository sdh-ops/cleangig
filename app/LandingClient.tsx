'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingClient() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-md mx-auto shadow-sm">
            {/* Top Bar - Fixed at top */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 flex items-center p-4 justify-between z-20"
            >
                <div className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 cursor-pointer bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </div>
                <img src="/logo_kr.png" alt="CleanGig" className="h-6 w-auto object-contain brightness-0 invert dark:invert-0" />
            </motion.div>

            {/* Main Centered Content */}
            <div className="flex-1 flex flex-col justify-center py-12">
                {/* Hero Image Section */}
                <div className="@container flex flex-col relative overflow-hidden px-6 mb-8">
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="flex flex-col"
                    >
                        <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden rounded-3xl h-[280px] shadow-2xl relative border-4 border-white dark:border-slate-800" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAiUdrOhxD_5NpgTm8pMqZ6sbQlZ_4uD5m6GrwX-UXB_1VLarE_KvB1YziAEa-kKW6HlGAsrNW5AxMC7bXeVOyN5pRqCUixRwldihGcLyXABncNNDFJZRe7hLbxodkV09_OuYYgW3BxZ2dh5HjbvmQcQUR-GkrraYMQKk55Ii2OJ5YIGgH-XyzzLNPk8lQPeeAGAG52KJe2xxPp8Bjt-HY8z423a9_sFq_o0WM1WOom8zq9GJB3UNEf-rAR2-eRfA9QQRuOR-KQjOA")' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        </div>
                    </motion.div>
                </div>

                {/* Content Area */}
                <div className="px-6 flex flex-col items-center gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <motion.img
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 100 }}
                            src="/appicon.png"
                            alt="CleanGig"
                            className="w-20 h-20 rounded-[24px] shadow-2xl mb-2 z-10 border-4 border-white dark:border-slate-800"
                        />

                        <div className="space-y-4 text-center">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className="text-[32px] font-black leading-tight tracking-tight text-slate-900 dark:text-white"
                            >
                                공간의 가치를 높이는<br />
                                <span className="text-primary italic">클리닝 서비스, 클린긱</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="text-slate-500 dark:text-slate-400 text-base font-semibold max-w-[280px] mx-auto leading-relaxed"
                            >
                                검증된 파트너와 함께하는<br />
                                맞춤형 청소 서비스를 경험해보세요.
                            </motion.p>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex w-full mt-4"
                    >
                        <Link href="/login" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-16 px-5 bg-primary text-white text-xl font-black leading-normal tracking-wide shadow-2xl shadow-primary/40 hover:bg-primary/90 transition-all relative group">
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
            </div>
        </div>
    );
}
