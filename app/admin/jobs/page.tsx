import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled, timeAgo } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'
import { Zap, Calendar } from 'lucide-react'

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; period?: string }>
}) {
  const sp = (await searchParams) || {}
  const statusFilter = sp.status || 'all'
  const periodFilter = sp.period || 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  let query = supabase
    .from('jobs')
    .select('id, status, price, scheduled_at, is_urgent, created_at, spaces(name), operator:operator_id(name, phone), worker:worker_id(name, phone)')
    .order('scheduled_at', { ascending: false })
    .limit(300)

  if (statusFilter !== 'all') query = query.eq('status', statusFilter as JobStatus)
  if (periodFilter === 'today') query = query.gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd)

  const { data: jobs } = await query
  const list = (jobs || []) as any[]

  // 상태별 카운트
  const [cOpen, cSubmitted, cProgress, cDisputed] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED'),
  ])

  const statusFilters: { key: string; label: string; count?: number; tone?: string }[] = [
    { key: 'all',       label: '전체' },
    { key: 'SUBMITTED', label: '검수 대기', count: cSubmitted.count ?? 0, tone: 'warning' },
    { key: 'DISPUTED',  label: '분쟁',      count: cDisputed.count  ?? 0, tone: 'danger' },
    { key: 'OPEN',      label: '매칭 대기', count: cOpen.count      ?? 0 },
    { key: 'ASSIGNED',  label: '진행 중',   count: cProgress.count  ?? 0 },
    { key: 'APPROVED',  label: '완료' },
    { key: 'CANCELED',  label: '취소' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-black text-sky-600 uppercase tracking-widest mb-0.5">작업 관리</p>
        <h1 className="text-[20px] font-black text-slate-900">청소 작업 전체</h1>
      </div>

      {/* 기간 필터 */}
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-slate-400" />
        {[
          { key: 'all',   label: '전체 기간' },
          { key: 'today', label: '오늘' },
        ].map((p) => (
          <Link
            key={p.key}
            href={`/admin/jobs?status=${statusFilter}&period=${p.key}`}
            className={`px-3 py-1 rounded-full text-[12px] font-bold transition
              ${periodFilter === p.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {statusFilters.map((f) => {
          const isActive = statusFilter === f.key
          const hasBadge = (f.count ?? 0) > 0
          return (
            <Link
              key={f.key}
              href={`/admin/jobs?status=${f.key}&period=${periodFilter}`}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition
                ${isActive
                  ? f.tone === 'warning' ? 'bg-amber-400 text-amber-900'
                    : f.tone === 'danger'  ? 'bg-red-500 text-white'
                    : 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
              {hasBadge && (
                <span className={`min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center
                  ${isActive
                    ? 'bg-white/30 text-inherit'
                    : f.tone === 'warning' ? 'bg-amber-100 text-amber-700'
                    : f.tone === 'danger'  ? 'bg-red-100 text-red-600'
                    : 'bg-slate-100 text-slate-600'}`}>
                  {f.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* 작업 목록 */}
      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400 text-[14px] font-bold">해당하는 작업이 없습니다</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {list.map((j) => (
            <Link
              key={j.id}
              href={`/requests/${j.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
            >
              <div className="shrink-0">
                <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                  {j.spaces?.name || '(공간 없음)'}
                  {j.is_urgent && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                      <Zap size={9} fill="currentColor" /> 긴급
                    </span>
                  )}
                </p>
                <p className="text-[11.5px] text-slate-500 font-bold mt-0.5">
                  <span className="text-slate-700">{j.operator?.name || '-'}</span>
                  {' → '}
                  <span className={j.worker?.name ? 'text-slate-700' : 'text-red-400'}>
                    {j.worker?.name || '미배정'}
                  </span>
                  {' · '}
                  {formatScheduled(j.scheduled_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13.5px] font-extrabold text-slate-900 t-money">{formatKRW(j.price, { short: true })}</p>
                <p className="text-[10.5px] text-slate-400 font-bold">{timeAgo(j.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400 font-bold">{list.length}건 표시 중</p>
    </div>
  )
}
