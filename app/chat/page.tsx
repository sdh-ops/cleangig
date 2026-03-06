'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

export default function ChatListPage() {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }
        setUser(user);

        // Fetch messages where user is sender or receiver
        const { data: messages } = await supabase
            .from('messages')
            .select('*, jobs!inner(id, spaces(name))')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

        if (messages) {
            const chatMap = new Map();
            messages.forEach((msg: any) => {
                if (!chatMap.has(msg.job_id)) {
                    // Extract the other party's info or use space name
                    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                    chatMap.set(msg.job_id, {
                        job_id: msg.job_id,
                        space_name: msg.jobs?.spaces?.name || '알 수 없는 공간',
                        partner_id: partnerId,
                        last_message: msg.content,
                        last_message_time: msg.created_at,
                        unread: false, // You might need a read status field in db, for now assume false
                    });
                }
            });
            setChats(Array.from(chatMap.values()));
        }
        setLoading(false);
    };

    const filteredChats = chats.filter((c) =>
        c.space_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-background-light dark:bg-background-dark font-display flex flex-col min-h-screen text-slate-900 dark:text-slate-100 max-w-md mx-auto shadow-xl relative">
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-slate-900 dark:text-slate-100 text-[26px] font-bold leading-tight tracking-tight">메시지</h2>
                </div>

                {/* Search */}
                <div className="px-4 py-3 sticky top-[60px] z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
                    <div className="flex w-full items-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-12 px-4 focus-within:ring-2 focus-within:ring-primary/50 transition-shadow shadow-sm">
                        <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">search</span>
                        <input
                            className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 focus:ring-0 placeholder:text-slate-400 text-sm font-medium outline-none"
                            placeholder="메시지 또는 공간 이름 검색"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Message List */}
                <div className="flex flex-col mt-2">
                    {loading ? (
                        <div className="px-4 py-8 text-center text-slate-400 flex flex-col items-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></span>
                            <p className="text-sm font-bold">메시지 목록을 불러오는 중...</p>
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="px-4 py-12 text-center text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">chat_bubble</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">진행 중인 대화가 없습니다</h3>
                            <p className="text-sm">매칭된 청소요청에서 파트너와 대화를 시작할 수 있습니다.</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="px-4 py-12 text-center text-slate-400">
                            <p className="text-sm font-bold">검색 결과가 없습니다.</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => {
                            const msgDate = new Date(chat.last_message_time);
                            const now = new Date();
                            const isToday = msgDate.getDate() === now.getDate() && msgDate.getMonth() === now.getMonth() && msgDate.getFullYear() === now.getFullYear();
                            const timeStr = isToday ? msgDate.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }) : msgDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

                            return (
                                <Link
                                    key={chat.job_id}
                                    href={`/chat/${chat.job_id}`}
                                    className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer relative"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-[52px] h-[52px] rounded-[18px] bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
                                            {chat.space_name.charAt(0)}
                                        </div>
                                        {chat.unread && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className={`text-base truncate ${chat.unread ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                                                {chat.space_name}
                                            </p>
                                            <p className={`text-xs ml-2 shrink-0 ${chat.unread ? 'font-bold text-primary' : 'font-semibold text-slate-400'}`}>
                                                {timeStr}
                                            </p>
                                        </div>
                                        <p className={`text-sm truncate ${chat.unread ? 'font-semibold text-slate-700 dark:text-slate-300' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                                            {chat.last_message}
                                        </p>
                                    </div>
                                    {chat.unread && (
                                        <div className="w-2 h-2 bg-primary rounded-full shrink-0 shadow-[0_0_8px_rgba(53,88,114,0.5)]"></div>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </div>
            </main>

            <BottomNav />

            <style jsx>{`
                .pb-safe { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
            `}</style>
        </div>
    );
}
