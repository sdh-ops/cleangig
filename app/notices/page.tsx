'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { ChevronRight, Megaphone, Clock, ChevronDown } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

interface Notice {
    id: string;
    title: string;
    content: string;
    is_important: boolean;
    created_at: string;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('notices')
            .select('*')
            .order('is_important', { ascending: false })
            .order('created_at', { ascending: false });

        setNotices(data || []);
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100 font-display flex flex-col mx-auto max-w-md w-full relative">
            <header className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-black tracking-tight">공지사항</h1>
            </header>

            <main className="flex-1 p-4 pb-24 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-800" />
                        ))}
                    </div>
                ) : notices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Megaphone size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">등록된 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    notices.map((notice, index) => (
                        <motion.div
                            key={notice.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all ${expandedId === notice.id ? 'ring-2 ring-primary/20 shadow-xl' : 'hover:shadow-md'}`}
                        >
                            <button
                                onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
                                className="w-full text-left p-6 flex flex-col gap-2"
                            >
                                <div className="flex items-center gap-2">
                                    {notice.is_important && (
                                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">IMPORTANT</span>
                                    )}
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                        <Clock size={12} />
                                        <span>{formatDate(notice.created_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-base font-black leading-tight ${expandedId === notice.id ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
                                        {notice.title}
                                    </h3>
                                    <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 ${expandedId === notice.id ? 'rotate-180 text-primary' : ''}`} />
                                </div>
                            </button>

                            <motion.div
                                initial={false}
                                animate={{ height: expandedId === notice.id ? 'auto' : 0, opacity: expandedId === notice.id ? 1 : 0 }}
                                className="overflow-hidden bg-slate-50 dark:bg-slate-800/50"
                            >
                                <div className="p-6 pt-0 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap border-t border-slate-50 dark:border-slate-800 mt-2 pt-6">
                                    {notice.content}
                                </div>
                            </motion.div>
                        </motion.div>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
}
