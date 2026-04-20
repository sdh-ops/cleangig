'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Search, MessageSquare, Loader2 } from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import { timeAgo } from '@/lib/utils'

type Chat = {
  job_id: string
  space_name: string
  partner_id: string
  last_message: string
  last_message_time: string
  unread: boolean
}

export default function ChatListPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'operator' | 'worker'>('operator')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (profile?.role === 'worker') setRole('worker')

      const { data: messages } = await supabase
        .from('messages')
        .select('job_id, sender_id, receiver_id, content, is_read, created_at, jobs!inner(id, spaces(name))')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

      const map = new Map<string, Chat>()
      ;(messages || []).forEach((m: any) => {
        if (map.has(m.job_id)) return
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
        const unread = m.receiver_id === user.id && !m.is_read
        map.set(m.job_id, {
          job_id: m.job_id,
          space_name: m.jobs?.spaces?.name || '대화',
          partner_id: partnerId,
          last_message: m.content,
          last_message_time: m.created_at,
          unread,
        })
      })
      setChats(Array.from(map.values()))
      setLoading(false)
    })()
  }, [])

  const filtered = chats.filter(
    (c) => c.space_name.toLowerCase().includes(q.toLowerCase()) || c.last_message.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="sseuksak-shell">
      <Header title="메시지" />
      <div className="sticky top-14 z-10 px-5 py-3 bg-canvas/95 backdrop-blur border-b border-line-soft">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="공간 이름 검색"
            className="input pl-11"
          />
        </div>
      </div>

      <div className="flex-1 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 pt-5">
            <div className="card p-2">
              <EmptyState
                icon={<MessageSquare size={22} />}
                title="진행 중인 대화가 없어요"
                description="매칭된 작업에서 대화를 시작할 수 있습니다."
              />
            </div>
          </div>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li key={c.job_id}>
                <Link
                  href={`/chat/${c.job_id}`}
                  className="flex items-center gap-3 px-5 py-4 border-b border-line-soft hover:bg-surface-muted"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-softer text-brand-dark flex items-center justify-center font-black text-lg shrink-0">
                    {c.space_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className={`text-[14.5px] truncate ${c.unread ? 'font-black text-ink' : 'font-extrabold text-ink'}`}>
                        {c.space_name}
                      </h4>
                      <span className={`text-[11px] shrink-0 ${c.unread ? 'text-brand-dark font-bold' : 'text-text-faint font-semibold'}`}>
                        {timeAgo(c.last_message_time)}
                      </span>
                    </div>
                    <p className={`text-[13px] truncate mt-0.5 ${c.unread ? 'font-bold text-ink-soft' : 'font-medium text-text-soft'}`}>
                      {c.last_message}
                    </p>
                  </div>
                  {c.unread && <div className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav role={role} />
    </div>
  )
}
