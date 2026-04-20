'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bell, X } from 'lucide-react'

type Toast = {
  id: string
  title: string
  message: string
  url?: string
}

export default function NotificationOverlay() {
  const [toast, setToast] = useState<Toast | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('global-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            table: 'notifications',
            schema: 'public',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as { id: string; title: string; message: string; url?: string }
            setToast({ id: n.id, title: n.title, message: n.message, url: n.url })
            setTimeout(() => setToast(null), 5000)
          },
        )
        .subscribe()
    }

    setup()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  if (!toast) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-24px)] max-w-[420px] animate-slide-up">
      <div
        className="flex gap-3 items-start p-4 rounded-2xl bg-surface border border-line-soft shadow-lg cursor-pointer active:scale-[0.99] transition"
        onClick={() => { if (toast.url) router.push(toast.url); setToast(null) }}
      >
        <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center shrink-0">
          <Bell size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-extrabold text-ink truncate">{toast.title}</h4>
          <p className="text-[12.5px] font-medium text-text-muted line-clamp-2 mt-0.5 leading-snug">
            {toast.message}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setToast(null) }}
          className="text-text-faint hover:text-ink -mr-1 -mt-1 p-1.5 rounded-full"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
