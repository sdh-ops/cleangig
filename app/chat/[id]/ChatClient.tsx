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
        <div className="chat-container bg-premium-v2">
            <header className="chat-header">
                <button className="back-btn" onClick={() => router.back()}>←</button>
                <div className="title-box">
                    <h1 className="chat-title">{spaceName}</h1>
                    <p className="chat-status">{receiverId ? '파트너와 연결됨' : '대기 중'}</p>
                </div>
                <button className="info-btn">ⓘ</button>
            </header>

            <main className="chat-messages no-scrollbar">
                {messages.length === 0 && (
                    <div className="empty-state">
                        <div className="icon">👋</div>
                        <p className="txt">파트너와 대화를 시작해 보세요.<br />청소 관련 문의나 특이사항을 주고받을 수 있습니다.</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                        const isMine = msg.sender_id === userId;
                        const showsTime = idx === messages.length - 1 ||
                            new Date(messages[idx + 1].created_at).getTime() - new Date(msg.created_at).getTime() > 60000;

                        return (
                            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                                {!isMine && <div className="avatar">👤</div>}
                                <div className="bubble-group">
                                    <div className="bubble">{msg.content}</div>
                                    {showsTime && (
                                        <span className="time">
                                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={scrollRef} style={{ height: 1 }} />
            </main>

            <form className="chat-input-row" onSubmit={handleSend}>
                <div className="input-wrap">
                    <button type="button" className="plus-btn">+</button>
                    <input placeholder="메시지 보내기..." value={input} onChange={e => setInput(e.target.value)} disabled={!receiverId} />
                    <button type="submit" className="send-btn" disabled={!input.trim() || sending}>
                        {sending ? '...' : '전송'}
                    </button>
                </div>
            </form>

            <style jsx>{`
        .chat-container { display: flex; flex-direction: column; height: 100dvh; background: #FFFFFF; }
        .chat-header {
           padding: 20px 20px 14px; display: flex; align-items: center; gap: 16px;
           border-bottom: 1px solid var(--color-border-light); background: #fff;
        }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: #F8F9FA; border: none; font-size: 20px; }
        .title-box { flex: 1; text-align: center; }
        .chat-title { font-size: 16px; font-weight: 800; }
        .chat-status { font-size: 11px; font-weight: 700; color: #03C75A; margin-top: 2px; }
        .info-btn { width: 40px; height: 40px; background: none; border: none; font-size: 20px; color: var(--color-text-tertiary); }
        
        .chat-messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; }
        .empty-state { text-align: center; margin-top: 40px; }
        .empty-state .icon { font-size: 40px; margin-bottom: 12px; }
        .empty-state .txt { font-size: 14px; color: var(--color-text-tertiary); line-height: 1.6; }
        
        .message-row { display: flex; gap: 10px; max-width: 85%; }
        .message-row.mine { align-self: flex-end; flex-direction: row-reverse; }
        .message-row.theirs { align-self: flex-start; }
        
        .avatar { width: 36px; height: 36px; border-radius: 14px; background: var(--color-primary-soft); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .bubble-group { display: flex; flex-direction: column; gap: 4px; }
        .mine .bubble-group { align-items: flex-end; }
        
        .bubble {
           padding: 12px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; line-height: 1.5;
           box-shadow: 0 1px 2px rgba(0,0,0,0.05); word-break: break-all;
        }
        .mine .bubble { background: var(--color-primary); color: #fff; border-top-right-radius: 4px; }
        .theirs .bubble { background: var(--color-bg); color: var(--color-text-primary); border-top-left-radius: 4px; }
        
        .time { font-size: 10px; color: var(--color-text-tertiary); font-weight: 600; }
        
        .chat-input-row { padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0)); background: #fff; border-top: 1px solid var(--color-border-light); }
        .input-wrap { display: flex; align-items: center; gap: 8px; background: var(--color-bg); padding: 6px 6px 6px 14px; border-radius: 24px; }
        .plus-btn { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 1px solid var(--color-border-light); font-size: 20px; font-weight: 300; line-height: 1; }
        .input-wrap input { flex: 1; border: none; background: transparent; font-size: 15px; font-weight: 600; outline: none; padding: 6px 0; }
        .send-btn { background: var(--color-primary); color: #fff; border: none; padding: 10px 18px; border-radius: 18px; font-size: 13px; font-weight: 800; cursor: pointer; }
        .send-btn:disabled { background: #D1D8E0; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
        </div>
    );
}
