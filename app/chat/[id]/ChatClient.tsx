'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/lib/types'

interface Props {
    jobId: string
    userId: string
    receiverId: string
    spaceName: string
}

export default function ChatClient({ jobId, userId, receiverId, spaceName }: Props) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchMessages()

        const supabase = createClient()
        const channel = supabase.channel(`chat-${jobId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `job_id=eq.${jobId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [jobId])

    useEffect(() => {
        // 메시지 추가 시 스크롤 하단으로
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchMessages = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', { ascending: true })

        if (data) setMessages(data as Message[])
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || sending || !receiverId) return

        setSending(true)
        const supabase = createClient()
        const { error } = await supabase.from('messages').insert({
            job_id: jobId,
            sender_id: userId,
            receiver_id: receiverId,
            content: input.trim()
        })

        if (error) {
            alert('메시지 전송 실패')
        } else {
            setInput('')
        }
        setSending(false)
    }

    return (
        <div className="chat-container">
            <header className="chat-header">
                <button onClick={() => router.back()} className="back-btn">←</button>
                <div style={{ flex: 1 }}>
                    <h1 className="chat-title">{spaceName}</h1>
                    <p className="chat-subtitle">공간파트너 ↔ 클린파트너 채팅</p>
                </div>
            </header>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        대화를 시작해보세요! 👋
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.sender_id === userId ? 'mine' : 'theirs'}`}>
                        <div className="message-bubble">
                            {msg.content}
                        </div>
                        <span className="message-time">
                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="메시지를 입력하세요"
                    className="chat-input"
                    disabled={!receiverId}
                />
                <button type="submit" className="send-btn" disabled={sending || !input.trim() || !receiverId}>
                    {sending ? '...' : '전송'}
                </button>
            </form>

            <style jsx>{`
                .chat-container { display: flex; flex-direction: column; height: 100dvh; background: #F8FAFC; }
                .chat-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-bottom: 1px solid var(--color-border-light); z-index: 10; }
                .back-btn { font-size: 24px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
                .chat-title { font-size: 16px; font-weight: 700; margin: 0; }
                .chat-subtitle { font-size: 11px; color: var(--color-text-tertiary); margin: 0; }
                
                .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
                .chat-empty { text-align: center; color: var(--color-text-tertiary); margin-top: 40px; font-size: 14px; }
                
                .message-wrapper { display: flex; flex-direction: column; max-width: 80%; }
                .message-wrapper.mine { align-self: flex-end; align-items: flex-end; }
                .message-wrapper.theirs { align-self: flex-start; align-items: flex-start; }
                
                .message-bubble { padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .mine .message-bubble { background: var(--color-primary); color: #fff; border-bottom-right-radius: 4px; }
                .theirs .message-bubble { background: #fff; color: var(--color-text-primary); border-bottom-left-radius: 4px; border: 1px solid var(--color-border-light); }
                
                .message-time { font-size: 10px; color: var(--color-text-tertiary); margin-top: 4px; }
                
                .chat-input-area { padding: 12px 16px; background: #fff; border-top: 1px solid var(--color-border-light); display: flex; gap: 8px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0)); }
                .chat-input { flex: 1; border: 1px solid var(--color-border); borderRadius: 20px; padding: 8px 16px; font-size: 14px; outline: none; transition: border-color 0.2s; }
                .chat-input:focus { border-color: var(--color-primary); }
                .send-btn { background: var(--color-primary); color: #fff; border: none; borderRadius: 20px; padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
                .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    )
}
