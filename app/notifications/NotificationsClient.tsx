'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import Header from '@/components/common/Header'
import EmptyState from '@/components/common/EmptyState'
import { timeAgo } from '@/lib/utils'

type Notification = {
  id: string
  title: string
  message: string
  url?: string
  is_read: boolean
  created_at: string
}

export default function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="sseuksak-shell">
      <Header title="알림" showBack />
      <div className="flex-1 pb-8">
        {notifications.length === 0 ? (
          <div className="px-5 pt-5">
            <div className="card p-2">
              <EmptyState
                icon={<Bell size={24} />}
                title="알림이 없어요"
                description="새 작업이나 상태 변경 시 알림이 도착해요."
              />
            </div>
          </div>
        ) : (
          <ul className="flex flex-col">
            {notifications.map((n) => {
              const Content = (
                <div className={`px-5 py-4 flex gap-3 items-start border-b border-line-soft ${n.is_read ? '' : 'bg-brand-softer/40'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? 'bg-surface-muted text-text-muted' : 'bg-brand-softer text-brand-dark'}`}>
                    <Bell size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-extrabold text-ink truncate">{n.title}</h4>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                    </div>
                    <p className="text-[12.5px] font-medium text-text-muted mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-[11px] font-bold text-text-faint mt-1.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              )
              return (
                <li key={n.id}>
                  {n.url ? <Link href={n.url}>{Content}</Link> : Content}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
