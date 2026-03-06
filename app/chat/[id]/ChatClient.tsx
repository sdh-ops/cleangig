'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Message } from '@/lib/types';

interface Props {
    jobId: string;
    userId: string;
    receiverId: string;
    spaceName: string;
}

export default function ChatClient({ jobId, userId, receiverId, spaceName }: Props) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();
        const supabase = createClient();
        const channel = supabase.channel(`chat-${jobId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
                (payload) => setMessages(prev => [...prev, payload.new as Message]))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [jobId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('messages').select('*').eq('job_id', jobId).order('created_at', { ascending: true });
        if (data) setMessages(data as Message[]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending || !receiverId) return;
        setSending(true);
        const supabase = createClient();
        const { error } = await supabase.from('messages').insert({
            job_id: jobId,
            sender_id: userId,
            receiver_id: receiverId,
            content: input.trim(),
        });
        if (!error) setInput('');
        else alert('메시지 전송 실패');
        setSending(false);
    };

    return (
        <div className="bg-[#F7F8F0] dark:bg-slate-900 font-display flex flex-col min-h-[100dvh] text-slate-900 dark:text-slate-100 max-w-md mx-auto shadow-xl relative border-x border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center bg-[#F7F8F0]/90 dark:bg-slate-900/90 backdrop-blur-md p-4 pb-3 border-b border-slate-200 dark:border-slate-800 justify-between">
                <button onClick={() => router.back()} className="flex items-center justify-center p-2 text-slate-900 dark:text-slate-100 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">arrow_back_ios_new</span>
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-sm border border-primary/20 shrink-0">
                        {spaceName ? spaceName.charAt(0) : '방'}
                    </div>
                    <div>
                        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight truncate max-w-[200px]">{spaceName || '채팅방'}</h2>
                        <p className={`text-xs ${receiverId ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                            {receiverId ? '파트너와 연결됨' : '대기 중'}
                        </p>
                    </div>
                </div>
                <button className="flex items-center justify-center p-2 text-slate-900 dark:text-slate-100 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6" style={{ scrollBehavior: 'smooth' }}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">chat_bubble</span>
                        </div>
                        <p className="text-sm font-bold text-center">
                            대화를 시작해 보세요.<br />청소 관련 문의나 특이사항을 주고받을 수 있습니다.
                        </p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                        const isMine = msg.sender_id === userId;
                        const showsTime = idx === messages.length - 1 ||
                            new Date(messages[idx + 1].created_at).getTime() - new Date(msg.created_at).getTime() > 60000;
                        const showsDate = idx === 0 || new Date(messages[idx - 1].created_at).getDate() !== new Date(msg.created_at).getDate();

                        return (
                            <React.Fragment key={msg.id}>
                                {showsDate && (
                                    <div className="flex justify-center my-2">
                                        <span className="text-xs font-medium bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
                                            {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                        </span>
                                    </div>
                                )}
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-end gap-3 ${isMine ? 'justify-end mt-2' : ''}`}
                                >
                                    {!isMine && (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm border border-primary/20 shrink-0">
                                            P
                                        </div>
                                    )}
                                    <div className={`flex flex-1 flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                        {!isMine && (
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold ml-1">상대방</p>
                                        )}
                                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                                            <div className="flex items-end gap-2">
                                                {isMine && showsTime && (
                                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1">
                                                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </span>
                                                )}
                                                <div className={`
                                                    text-[15px] font-medium leading-relaxed max-w-[280px] px-4 py-3 shadow-sm
                                                    ${isMine
                                                        ? 'bg-primary text-white rounded-[20px] rounded-br-[4px] shadow-primary/20'
                                                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-[20px] rounded-bl-[4px] border border-slate-100 dark:border-slate-700'
                                                    }
                                                `}>
                                                    {msg.content}
                                                </div>
                                                {!isMine && showsTime && (
                                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1">
                                                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </React.Fragment>
                        );
                    })}
                </AnimatePresence>
                <div ref={scrollRef} style={{ height: 1 }} />
            </main>

            {/* Input Area */}
            <form className="sticky bottom-0 bg-[#F7F8F0] dark:bg-slate-900 p-3 pb-safe border-t border-slate-200 dark:border-slate-800 z-10" onSubmit={handleSend}>
                <div className="flex items-end gap-2">
                    <button type="button" className="flex items-center justify-center p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm shrink-0 h-[42px] w-[42px]">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-end shadow-sm overflow-hidden min-h-[42px]">
                        <input
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 py-2.5 px-4 text-[15px] outline-none"
                            placeholder={receiverId ? "메시지를 입력하세요..." : "매칭된 대상이 없습니다."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={!receiverId}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className={`flex items-center justify-center p-2 m-1 rounded-xl shrink-0 transition-colors
                                ${(!input.trim() || sending)
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                }
                            `}
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                    </div>
                </div>
            </form>
            <style jsx>{`
                .pb-safe { padding-bottom: calc(0.75rem + env(safe-area-inset-bottom)); }
            `}</style>
        </div>
    );
}
