'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Plus,
  Sparkles,
  Building2,
  Clock,
  ChevronRight,
  TrendingUp,
  Zap,
  Wallet,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import MetricCard from '@/components/common/MetricCard'
import PullToRefresh from '@/components/common/PullToRefresh'
import SetupChecklist from '@/components/common/SetupChecklist'
import { formatKRW, formatScheduled, spaceTypeLabel } from '@/lib/utils'
import { useJobsRealtime } from '@/lib/useJobRealtime'
import type { JobStatus, SpaceType } from '@/lib/types'

type Profile = {
  id: string
  name: string
  business_name?: string | null
  profile_image?: string | null
  avg_rating?: number | null
  is_verified?: boolean
  tax_type?: string | null
  phone?: string | null
}

type Job = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  spaces?: { name: string; type: SpaceType; address?: string }
  users?: { name: string; avg_rating?: number } | null
}

type RecurringJob = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  recurring_config?: { interval?: string; day_of_week?: number } | null
  spaces?: { id: string; name: string; type: SpaceType } | null
}

type Space = {
  id: string
  name: string
  type: SpaceType
  base_price: number
  is_active: boolean
  photos?: string[]
}

type Props = {
  profile: Profile
  todayJobs: Job[]
  spaces: Space[]
  recentJobs: Job[]
  recurringJobs: RecurringJob[]
  monthTotal: number
  monthCount: number
  monthApproved: number
  unreadCount: number
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly:    '매주',
  biweekly:  '격주',
  monthly:   '매월',
  daily:     '매일',
  weekdays:  '평일마다',
}

export default function DashboardClient({
  profile,
  todayJobs,
  spaces,
  recentJobs,
  recurringJobs,
  monthTotal,
  monthCount,
  monthApproved,
  unreadCount,
}: Props) {
  const router = useRouter()
  // KST 기준 인사말 — SSR(UTC)와 클라이언트(KST)가 다를 수 있어 useEffect로 클라이언트에서만 계산
  const [greeting, setGreeting] = useState('안녕하세요')
  useEffect(() => {
    // toLocaleString으로 KST 변환 후 시간 추출
    const kstHour = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    ).getHours()
    setGreeting(
      kstHour < 5  ? '늦은 밤이에요' :
      kstHour < 12 ? '좋은 아침이에요' :
      kstHour < 18 ? '안녕하세요' : '좋은 저녁이에요'
    )
  }, [])

  // 내 요청 상태 변화 실시간 반영 (오늘 작업 카드가 새로고침 없이 갱신)
  useJobsRealtime({ onRefresh: () => router.refresh() })

  const completionRate = monthCount > 0 ? Math.round((monthApproved / monthCount) * 100) : 0

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={() => router.refresh()} />
      <Header showLogo showBell unreadCount={unreadCount} />

      <div className="page-container flex-1">

        {/* Greeting */}
        <section className="mb-5 pt-2">
          <p className="t-caption">{greeting}, 공간파트너님</p>
          <h1 className="h-hero text-ink mt-0.5">
            {profile.business_name || profile.name}
            <span className="text-text-faint text-xl font-extrabold">님</span>
          </h1>
        </section>

        {/* Setup checklist */}
        <div className="mb-5">
          <SetupChecklist
            storageKey="sseuksak:host_setup_dismissed"
            title="공간파트너 설정을 완료해보세요"
            items={[
              { key: 'profile', label: '이름 · 연락처 등록', href: '/profile/edit', done: !!profile.name && !!profile.phone },
              { key: 'verify', label: '본인 인증', href: '/profile/verification', done: !!profile.is_verified, badge: '중요' },
              { key: 'space', label: '첫 공간 등록', href: '/spaces/create', done: spaces.length > 0 },
              { key: 'tax', label: '사업자 정보 등록 (선택)', href: '/profile/tax', done: !!profile.tax_type },
            ]}
          />
        </div>

        {/* Today hero card */}
        {spaces.length === 0 ? (
          <div className="mb-5 rounded-2xl bg-brand-softer border border-brand/20 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-surface flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-brand-dark" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-ink">공간을 먼저 등록해보세요</p>
              <p className="text-[14.5px] text-text-soft font-bold mt-0.5">등록 후 원클릭으로 청소 요청을 보낼 수 있어요.</p>
            </div>
          </div>
        ) : (
        <section className="mb-5">
          <div className="card-dark p-5">
            {/* Glow blobs */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.15) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/60 text-[13.5px] font-bold uppercase tracking-widest">오늘의 작업</p>
                <span className="text-[13.5px] font-black text-brand-light bg-brand/20 px-2.5 py-1 rounded-full">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="t-money text-[48px] text-white leading-none">{todayJobs.length}</span>
                <span className="text-white/60 text-[15px] font-bold mb-1">건 예정</span>
              </div>

              {todayJobs.length > 0 ? (
                <div className="mt-3 p-3 rounded-2xl bg-white/10">
                  <p className="text-[13.5px] text-white/60 font-bold mb-0.5">가장 빠른 작업</p>
                  <p className="text-[14px] font-extrabold text-brand-light">
                    {formatScheduled(todayJobs[0].scheduled_at)}
                  </p>
                  <p className="text-[14.5px] text-white/70 font-semibold mt-0.5">
                    {todayJobs[0].spaces?.name}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[15px] font-semibold text-white/60 leading-relaxed">
                  오늘 예정된 작업이 없어요.<br />새로운 청소 요청을 만들어보세요.
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <Link
                  href="/requests/create"
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-brand text-ink font-black text-[15px] active:scale-[0.98] transition shadow-sm"
                >
                  <Zap size={15} strokeWidth={2.6} /> 즉시 요청
                </Link>
                <Link
                  href="/requests"
                  className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-white/10 text-white font-bold text-[15px] active:scale-[0.98] transition"
                >
                  전체보기 <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-3 mb-6">
          <MetricCard
            label="이번 달 지출"
            value={formatKRW(monthTotal, { short: true, withUnit: false })}
            unit="원"
            icon={<Wallet size={16} />}
          />
          <MetricCard
            label="완료율"
            value={completionRate}
            unit="%"
            icon={<TrendingUp size={16} />}
            delta={monthCount > 0 ? { value: completionRate, positive: completionRate >= 80 } : undefined}
          />
        </section>

        {/* Spaces */}
        <section className="mb-7">
          <div className="section-header">
            <h2>내 공간</h2>
            <Link href="/spaces">전체 <ChevronRight size={14} /></Link>
          </div>

          {spaces.length === 0 ? (
            <div className="card p-2">
              <EmptyState
                icon={<Building2 size={24} />}
                title="첫 공간을 등록해보세요"
                description="공간을 등록하면 청소 요청을 자동으로 만들 수 있어요."
                actionLabel="공간 등록하기"
                actionHref="/spaces/create"
              />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {spaces.map((s) => (
                <Link key={s.id} href={`/spaces/${s.id}`} className="shrink-0 w-[200px] card-interactive p-0 overflow-hidden">
                  {/* Photo */}
                  <div className="w-full aspect-[16/10] bg-brand-softer overflow-hidden relative">
                    {s.photos?.[0] ? (
                      <img src={s.photos[0]} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-dark">
                        <Building2 size={28} />
                      </div>
                    )}
                    {s.is_active && (
                      <span className="absolute top-2 right-2 chip chip-success text-[13px] px-2 py-0.5 shadow-sm">운영중</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3.5">
                    <h3 className="text-[15px] font-extrabold text-ink truncate">{s.name}</h3>
                    <p className="text-[13.5px] text-text-soft font-bold mt-0.5">
                      {spaceTypeLabel(s.type)} · {formatKRW(s.base_price, { short: true })}
                    </p>
                  </div>
                </Link>
              ))}
              <Link
                href="/spaces/create"
                className="shrink-0 w-[120px] card-interactive flex flex-col items-center justify-center text-center p-4"
                style={{ borderStyle: 'dashed', minHeight: '150px' }}
              >
                <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-2">
                  <Plus size={20} />
                </div>
                <span className="text-[14.5px] font-extrabold text-ink">공간 추가</span>
              </Link>
            </div>
          )}
        </section>

        {/* Recurring cleaning contracts */}
        {(recurringJobs.length > 0 || spaces.length > 0) && (
          <section className="mb-7">
            <div className="section-header">
              <h2 className="flex items-center gap-1.5">
                <RefreshCcw size={14} className="text-brand-dark" />
                정기 청소 계약
              </h2>
              <Link href="/requests?filter=recurring">전체 <ChevronRight size={14} /></Link>
            </div>

            {recurringJobs.length === 0 ? (
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(14,165,233,0.05)', border: '1px dashed rgba(14,165,233,0.25)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(14,165,233,0.10)' }}
                >
                  <RefreshCcw size={18} className="text-brand-dark" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold text-ink">정기 청소 계약이 없어요</p>
                  <p className="text-[13.5px] text-text-soft font-semibold mt-0.5">
                    매주·격주·매월 반복되는 청소를 등록하면 자동으로 관리돼요.
                  </p>
                </div>
                <Link
                  href="/requests/create?recurring=true"
                  className="shrink-0 text-[13.5px] font-black text-brand-dark underline"
                >
                  등록
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recurringJobs.map((job) => {
                  const interval = job.recurring_config?.interval
                  const intervalLabel = interval ? (INTERVAL_LABELS[interval] ?? interval) : '반복'
                  return (
                    <li key={job.id}>
                      <Link href={`/requests/${job.id}`} className="card-interactive p-4 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(14,165,233,0.10)' }}
                        >
                          <RefreshCcw size={16} className="text-brand-dark" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[13px] font-black"
                              style={{ background: 'rgba(14,165,233,0.12)', color: '#0369A1' }}
                            >
                              {intervalLabel}
                            </span>
                            <StatusChip kind="job" status={job.status} size="sm" />
                          </div>
                          <h4 className="text-[15px] font-extrabold text-ink truncate">
                            {job.spaces?.name || '공간'}
                          </h4>
                          <p className="text-[13.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {formatScheduled(job.scheduled_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="t-money text-[14px] text-ink font-black">
                            {formatKRW(job.price, { short: true })}
                          </div>
                          <ChevronRight size={14} className="text-text-faint" />
                        </div>
                      </Link>
                    </li>
                  )
                })}
                <li>
                  <Link
                    href="/requests/create?recurring=true"
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-line text-[14.5px] font-bold text-text-soft hover:border-brand hover:text-brand-dark transition-colors"
                  >
                    <Plus size={14} /> 새 정기 청소 계약 추가
                  </Link>
                </li>
              </ul>
            )}
          </section>
        )}

        {/* Recent requests */}
        <section>
          <div className="section-header">
            <h2>최근 요청</h2>
            <Link href="/requests">전체 <ChevronRight size={14} /></Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="card p-2">
              <EmptyState
                icon={<Sparkles size={24} />}
                title="아직 요청 내역이 없어요"
                description="지금 바로 청소 요청을 만들고 매칭을 받아보세요."
                actionLabel="청소 요청하기"
                actionHref="/requests/create"
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/requests/${job.id}`} className="card-interactive p-4 flex items-center gap-3">
                    <div className="icon-box icon-box-md icon-box-brand shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <StatusChip kind="job" status={job.status} size="sm" />
                        {job.is_urgent && (
                          <span className="chip chip-danger text-[13px] px-1.5 py-0">긴급</span>
                        )}
                      </div>
                      <h4 className="text-[14px] font-extrabold text-ink truncate">
                        {job.spaces?.name || '공간'}
                      </h4>
                      <p className="text-[13.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <Clock size={10} />
                        {formatScheduled(job.scheduled_at)}
                        {job.users?.name && <span className="ml-1 truncate">· {job.users.name}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="t-money text-[14.5px] text-ink font-black">
                        {formatKRW(job.price, { short: true })}
                      </div>
                      <ChevronRight size={14} className="text-text-faint" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BottomNav role="operator" />
    </div>
  )
}
