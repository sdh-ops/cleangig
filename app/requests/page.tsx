import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import StatusChip from '@/components/common/StatusChip'
import RequestsRefreshBridge from './RequestsRefreshBridge'
import { Sparkles, Clock, ChevronRight, Zap } from 'lucide-react'
import { formatKRW, formatScheduled } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

const TABS = [
  { key: 'active', label: '진행 중', statuses: ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'DISPUTED'] as JobStatus[] },
  { key: 'completed', label: '완료', statuses: ['APPROVED', 'PAID_OUT'] as JobStatus[] },
  { key: 'canceled', label: '취소', statuses: ['CANCELED'] as JobStatus[] },
]

export default async function RequestsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  const sp = await props.searchParams
  const currentTab = sp?.tab || 'active'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tab = TABS.find((t) => t.key === currentTab) || TABS[0]
  const { data } = await supabase
    .from('jobs')
    .select('id, status, price, scheduled_at, is_urgent, spaces(name, type, address), users:worker_id(name)')
    .eq('operator_id', user.id)
    .in('status', tab.statuses)
    .order('scheduled_at', { ascending: false })

  const jobs = (data || []) as any[]

  return (
    <div className="sseuksak-shell">
      <RequestsRefreshBridge />
      <Header title="내 요청 내역" showBell />
      {/* Tabs */}
      <div className="sticky top-14 z-10 bg-canvas/95 backdrop-blur border-b border-line-soft">
        <div className="flex px-3">
          {TABS.map((t) => {
            const active = currentTab === t.key
            return (
              <Link
                key={t.key}
                href={`/requests?tab=${t.key}`}
                className={`flex-1 py-3 text-center font-extrabold text-[13.5px] border-b-[3px] transition ${
                  active ? 'text-ink border-brand' : 'text-text-faint border-transparent'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex-1 pb-28 px-5 pt-4">
        {jobs.length === 0 ? (
          <div className="card p-2 mt-4">
            <EmptyState
              icon={<Sparkles size={24} />}
              title={`${tab.label} 요청이 없어요`}
              description={currentTab === 'active' ? '지금 새로운 청소를 요청해보세요.' : ''}
              actionLabel={currentTab === 'active' ? '청소 요청하기' : undefined}
              actionHref={currentTab === 'active' ? '/requests/create' : undefined}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/requests/${j.id}`} className="card-interactive p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-softer flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-brand-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StatusChip kind="job" status={j.status} size="sm" />
                      {j.is_urgent && <span className="chip chip-danger !text-[10px] !px-1.5 !py-0">
                        <Zap size={10} />긴급
                      </span>}
                    </div>
                    <h4 className="text-[14.5px] font-extrabold text-ink truncate mt-1">{j.spaces?.name}</h4>
                    <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                      <Clock size={11} />
                      {formatScheduled(j.scheduled_at)}
                      {j.users?.name && <span className="ml-1">· {j.users.name}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="t-money text-[15px] text-ink">{formatKRW(j.price, { short: true })}</div>
                    <ChevronRight size={16} className="text-text-faint ml-auto mt-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav role="operator" />
    </div>
  )
}
