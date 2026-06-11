import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import {
  Users, Briefcase, AlertTriangle, TrendingUp,
  ChevronRight, Clock, CheckCircle2, Zap, Calendar,
} from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled, timeAgo } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, email').eq('id', user.id).single()
  if (!profile || !isPlatformAdmin(profile.email, profile.role)) redirect('/profile')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    submitted,    // 검수 대기
    disputed,     // 분쟁 진행 중
    todayJobs,    // 오늘 예정 작업
    activeNow,    // 지금 진행 중
    monthRevenue, // 이번달 완료
    totalUsers,
    totalWorkers,
    recentJobs,
  ] = await Promise.all([
    supabase.from('jobs')
      .select('id, price, scheduled_at, spaces(name), operator:operator_id(name), worker:worker_id(name)')
      .eq('status', 'SUBMITTED').order('created_at', { ascending: true }),
    supabase.from('disputes')
      .select('id, category, created_at, job_id, reporter:reporter_id(name), jobs(price, spaces(name))')
      .eq('status', 'OPEN').order('created_at', { ascending: true }),
    supabase.from('jobs')
      .select('id, status, price, scheduled_at, is_urgent, spaces(name), operator:operator_id(name), worker:worker_id(name)')
      .gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd)
      .order('scheduled_at', { ascending: true }),
    supabase.from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']),
    supabase.from('jobs')
      .select('price')
      .in('status', ['APPROVED', 'PAID_OUT'])
      .gte('created_at', monthStart),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
    supabase.from('jobs')
      .select('id, status, price, created_at, scheduled_at, spaces(name), operator:operator_id(name), worker:worker_id(name)')
      .order('created_at', { ascending: false }).limit(8),
  ])

  const monthGMV   = (monthRevenue.data || []).reduce((s: number, r: any) => s + (r.price || 0), 0)
  const platformFee = Math.round(monthGMV * 0.19) // host 5% + worker 14%(STARTER) ≤ 19% total
  const submittedList = (submitted.data || []) as any[]
  const disputedList  = (disputed.data  || []) as any[]
  const todayList     = (todayJobs.data  || []) as any[]
  const recentList    = (recentJobs.data || []) as any[]

  const urgentTotal = submittedList.length + disputedList.length

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest mb-1">쓱싹 운영 대시보드</p>
        <h1 className="text-[22px] font-black text-slate-900">
          {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </h1>
      </div>

      {/* ── 즉시 처리 섹션 */}
      {urgentTotal > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Zap size={14} className="text-red-500" fill="currentColor" />
            <h2 className="text-[14.5px] font-black text-red-600 uppercase tracking-wider">즉시 처리 필요 · {urgentTotal}건</h2>
          </div>

          <div className="space-y-2">
            {/* 검수 대기 */}
            {submittedList.map((j) => (
              <Link
                key={j.id}
                href={`/requests/${j.id}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-slate-900 truncate">{j.spaces?.name}</p>
                  <p className="text-[13.5px] font-bold text-amber-700">{j.worker?.name} 완료 보고 · 검수 대기 중</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-extrabold text-slate-900">{formatKRW(j.price, { short: true })}</p>
                  <p className="text-[13px] text-amber-600 font-bold">승인하기 →</p>
                </div>
              </Link>
            ))}

            {/* 분쟁 */}
            {disputedList.map((d) => (
              <Link
                key={d.id}
                href="/admin/disputes"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 transition active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-slate-900 truncate">{d.jobs?.spaces?.name}</p>
                  <p className="text-[13.5px] font-bold text-red-700">
                    {d.category || '일반'} · {d.reporter?.name} 신고 · {timeAgo(d.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-extrabold text-red-600">{formatKRW(d.jobs?.price, { short: true })}</p>
                  <p className="text-[13px] text-red-500 font-bold">조치하기 →</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── KPI 카드 */}
      <section className="grid grid-cols-2 gap-3">
        <KpiCard
          label="이번 달 거래액"
          value={formatKRW(monthGMV, { short: true })}
          sub={`수수료 수익 ${formatKRW(platformFee, { short: true })}`}
          icon={<TrendingUp size={16} />}
          tone="brand"
        />
        <KpiCard
          label="지금 진행 중"
          value={`${activeNow.count ?? 0}건`}
          sub={`오늘 예정 ${todayList.length}건`}
          icon={<Briefcase size={16} />}
          tone={activeNow.count ? 'active' : 'default'}
        />
        <KpiCard
          label="공간파트너"
          value={`${totalUsers.count ?? 0}명`}
          icon={<Users size={16} />}
        />
        <KpiCard
          label="클린파트너"
          value={`${totalWorkers.count ?? 0}명`}
          icon={<Users size={16} />}
        />
      </section>

      {/* ── 오늘 예정 작업 */}
      {todayList.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Calendar size={14} className="text-slate-500" />
            <h2 className="text-[14.5px] font-black text-slate-500 uppercase tracking-wider">오늘 예정 · {todayList.length}건</h2>
          </div>
          <div className="card overflow-hidden divide-y divide-slate-100">
            {todayList.map((j: any) => (
              <Link
                key={j.id}
                href={`/requests/${j.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition"
              >
                <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                    {j.spaces?.name}
                    {j.is_urgent && <span className="chip chip-danger !text-[11px] !py-0 !px-1.5">긴급</span>}
                  </p>
                  <p className="text-[13.5px] text-slate-500 font-bold">
                    {j.worker?.name || '미배정'} · {formatScheduled(j.scheduled_at)}
                  </p>
                </div>
                <span className="text-[15px] font-extrabold text-slate-800 shrink-0 t-money">
                  {formatKRW(j.price, { short: true })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 최근 작업 */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-500" />
            <h2 className="text-[14.5px] font-black text-slate-500 uppercase tracking-wider">최근 등록</h2>
          </div>
          <Link href="/admin/jobs" className="text-[14.5px] font-bold text-sky-600 flex items-center gap-0.5">
            전체보기 <ChevronRight size={13} />
          </Link>
        </div>
        <div className="card overflow-hidden divide-y divide-slate-100">
          {recentList.length === 0 ? (
            <p className="text-center text-slate-400 text-[15px] font-bold py-8">작업이 없습니다</p>
          ) : (
            recentList.map((j) => (
              <Link
                key={j.id}
                href={`/requests/${j.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition"
              >
                <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-slate-900 truncate">{j.spaces?.name || '(공간 없음)'}</p>
                  <p className="text-[13.5px] text-slate-500 font-bold">
                    {j.operator?.name} → {j.worker?.name || '미배정'} · {timeAgo(j.created_at)}
                  </p>
                </div>
                <span className="text-[15px] font-extrabold text-slate-800 shrink-0 t-money">
                  {formatKRW(j.price, { short: true })}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  label, value, sub, icon, tone = 'default',
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode
  tone?: 'brand' | 'active' | 'default'
}) {
  const bg =
    tone === 'brand'  ? 'bg-[#0F172A] text-white' :
    tone === 'active' ? 'bg-sky-500 text-white' :
    'bg-white border border-slate-200 text-slate-800'
  const subColor =
    tone === 'brand'  ? 'text-white/60' :
    tone === 'active' ? 'text-white/75' :
    'text-slate-500'
  const iconColor =
    tone === 'brand'  ? 'text-white/50' :
    tone === 'active' ? 'text-white/70' :
    'text-slate-400'

  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className={`flex items-center justify-between mb-2 ${iconColor}`}>
        <span className="text-[13.5px] font-black tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-[22px] font-black tracking-tight">{value}</div>
      {sub && <div className={`text-[13.5px] font-bold mt-0.5 ${subColor}`}>{sub}</div>}
    </div>
  )
}
