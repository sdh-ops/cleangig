'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Send, Loader2, CheckCheck } from 'lucide-react'

type Message = {
  id: string
  job_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

type Props = {
  jobId: string
  userId: string
  partnerId: string
  partnerName: string
  partnerImage?: string | null
  spaceName: string
}

export default function ChatClient({ jobId, userId, partnerId, partnerName, partnerImage, spaceName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // initial load
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages((data || []) as Message[])
      setLoading(false)
      // mark received as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('job_id', jobId)
        .eq('receiver_id', userId)
        .eq('is_read', false)
    })()
  }, [jobId, userId, supabase])

  // realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', table: 'messages', schema: 'public', filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const m = payload.new as Message
          setMessages((prev) => [...prev, m])
          if (m.receiver_id === userId) {
            await supabase.from('messages').update({ is_read: true }).eq('id', m.id)
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [jobId, userId, supabase])

  // scroll bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // iOS: keyboard open/close handling via visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const handle = () => {
      // when keyboard opens, scroll messages to bottom so user sees latest
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      })
    }
    vv.addEventListener('resize', handle)
    vv.addEventListener('scroll', handle)
    return () => {
      vv.removeEventListener('resize', handle)
      vv.removeEventListener('scroll', handle)
    }
  }, [])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || !partnerId) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: userId,
      receiver_id: partnerId,
      content,
      is_read: false,
    })
    if (!error) setText('')
    setSending(false)
  }

  return (
    <div className="sseuksak-shell bg-canvas">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center font-black text-sm overflow-hidden shrink-0">
              {partnerImage ? <img src={partnerImage} alt="" className="w-full h-full object-cover" /> : partnerName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] font-extrabold text-ink truncate">{partnerName}</h1>
              <p className="text-[10.5px] text-text-soft font-bold truncate">{spaceName}</p>
            </div>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 px-4 py-3 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-brand" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[13px] font-bold text-text-soft">대화를 시작해보세요 👋</p>
            <p className="text-[11.5px] text-text-faint font-medium mt-1">예의 바른 메시지로 매너 온도를 높여보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m, i) => {
              const mine = m.sender_id === userId
              const showTime =
                i === messages.length - 1 ||
                messages[i + 1]?.sender_id !== m.sender_id ||
                new Date(messages[i + 1]?.created_at).getTime() - new Date(m.created_at).getTime() > 60000
              const time = new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
              return (
                <div key={m.id} className={`flex items-end gap-1 ${mine ? 'justify-end' : ''}`}>
                  {mine && showTime && (
                    <div className="flex flex-col items-end text-[10px] font-bold text-text-faint leading-tight">
                      {m.is_read && <CheckCheck size={12} className="text-brand-dark mb-0.5" />}
                      <span>{time}</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[14px] font-medium leading-snug break-words ${
                      mine ? 'bg-brand text-white rounded-br-md' : 'bg-surface border border-line-soft text-ink rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                  {!mine && showTime && (
                    <span className="text-[10px] font-bold text-text-faint">{time}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-line-soft bg-surface">
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지 입력"
            className="input flex-1 !min-h-[44px] !py-2.5 !rounded-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center disabled:bg-line active:scale-95 transition"
            aria-label="보내기"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
