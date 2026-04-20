import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import { Users, Briefcase, AlertTriangle, DollarSign, TrendingUp, ChevronRight } from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, email').eq('id', user.id).single()
  if (!profile || !isPlatformAdmin(profile.email, profile.role)) redirect('/profile')

  const [usersAll, usersOp, usersWorker, jobsAll, jobsOpen, jobsInProg, jobsDone, jobsDisp, revenue, recent] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED']),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['APPROVED', 'PAID_OUT']),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED'),
    supabase.from('jobs').select('price').in('status', ['APPROVED', 'PAID_OUT']),
    supabase.from('jobs').select('id, status, price, created_at, scheduled_at, spaces(name), operator:operator_id(name), worker:worker_id(name)').order('created_at', { ascending: false }).limit(10),
  ])

  const gmv = (revenue.data || []).reduce((s: number, r: any) => s + (r.price || 0), 0)
  const fees = Math.round(gmv * 0.12)
  const recentJobs = (recent.data || []) as any[]

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-brand-softer rounded-full">
          <span className="text-[10.5px] font-black text-brand-dark uppercase tracking-widest">Admin</span>
        </div>
        <h1 className="h-hero text-ink">플랫폼 운영 대시보드</h1>
        <p className="t-caption mt-1">쓱싹의 전체 지표와 실시간 현황을 확인하세요.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="총 GMV" value={formatKRW(gmv, { short: true })} icon={<DollarSign size={16} />} tone="brand" />
        <KPI label="플랫폼 수수료" value={formatKRW(fees, { short: true })} icon={<TrendingUp size={16} />} />
        <KPI label="총 가입자" value={`${usersAll.count ?? 0}`} sub={`파트너 ${usersOp.count ?? 0} · 작업자 ${usersWorker.count ?? 0}`} icon={<Users size={16} />} />
        <KPI label="진행 중 작업" value={`${jobsInProg.count ?? 0}`} sub={`열림 ${jobsOpen.count ?? 0}`} icon={<Briefcase size={16} />} />
      </div>

      {/* Status distribution */}
      <div className="card p-5 mb-6">
        <h3 className="h-section text-ink mb-4">작업 상태 분포</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Dist label="전체" value={jobsAll.count ?? 0} tone="muted" />
          <Dist label="매칭 대기" value={jobsOpen.count ?? 0} tone="sun" />
          <Dist label="완료" value={jobsDone.count ?? 0} tone="success" />
          <Dist label="분쟁" value={jobsDisp.count ?? 0} tone="danger" />
        </div>
      </div>

      {/* Recent jobs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="h-section text-ink">최근 작업</h3>
          <Link href="/admin/jobs" className="text-[12.5px] font-bold text-brand-dark flex items-center gap-0.5">
            전체보기 <ChevronRight size={14} />
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-center text-text-faint text-[13px] font-bold py-10">작업이 없습니다</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft -mx-2">
            {recentJobs.map((j) => (
              <li key={j.id}>
                <Link href={`/requests/${j.id}`} className="flex items-center gap-3 px-2 py-3 hover:bg-surface-muted rounded-xl">
                  <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-extrabold text-ink truncate">{j.spaces?.name || '(공간 없음)'}</p>
                    <p className="text-[11px] text-text-soft font-bold mt-0.5 truncate">
                      {j.operator?.name} → {j.worker?.name || '미배정'} · {formatScheduled(j.scheduled_at)}
                    </p>
                  </div>
                  <div className="t-money text-[13.5px] text-ink shrink-0">{formatKRW(j.price, { short: true })}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'brand' }) {
  const isBrand = tone === 'brand'
  return (
    <div className={`rounded-2xl p-4 ${isBrand ? 'bg-ink text-white' : 'bg-surface border border-line-soft'}`}>
      <div className={`flex items-center justify-between ${isBrand ? 'text-white/75' : 'text-text-soft'}`}>
        <span className="text-[11.5px] font-bold">{label}</span>
        {icon}
      </div>
      <div className={`t-money text-2xl mt-2 ${isBrand ? 'text-white' : 'text-ink'}`}>{value}</div>
      {sub && <div className={`text-[11px] font-bold mt-1 ${isBrand ? 'text-white/60' : 'text-text-faint'}`}>{sub}</div>}
    </div>
  )
}

function Dist({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-${tone}-soft`}>
      <div className={`text-[11px] font-bold text-text-soft`}>{label}</div>
      <div className="t-money text-xl text-ink mt-1">{value}</div>
    </div>
  )
}
