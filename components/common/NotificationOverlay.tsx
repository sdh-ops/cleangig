'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Bell, X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    url?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export default function NotificationOverlay() {
    const [toast, setToast] = useState<Notification | null>(null);
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();

        // 현재 로그인한 사용자 확인
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel('global-notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    table: 'notifications',
                    schema: 'public',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    const newNoti = payload.new as any;
                    setToast({
                        id: newNoti.id,
                        title: newNoti.title,
                        message: newNoti.message,
                        url: newNoti.url,
                        type: 'success' // 기본값
                    });

                    // 5초 후 자동 닫기
                    setTimeout(() => setToast(null), 5000);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupSubscription();
    }, []);

    if (!toast) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                onClick={() => {
                    if (toast.url) router.push(toast.url);
                    setToast(null);
                }}
            >
                <div className="bg-primary/10 dark:bg-primary/20 p-2.5 h-fit rounded-xl text-primary shrink-0">
                    <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{toast.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{toast.message}</p>
                </div>
                <button
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setToast(null);
                    }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
