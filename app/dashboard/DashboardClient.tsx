'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Sparkles,
  Building2,
  Clock,
  ChevronRight,
  TrendingUp,
  Zap,
  Wallet,
} from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import MetricCard from '@/components/common/MetricCard'
import PullToRefresh from '@/components/common/PullToRefresh'
import { formatKRW, formatScheduled, spaceTypeLabel } from '@/lib/utils'
import type { JobStatus, SpaceType } from '@/lib/types'

type Profile = {
  id: string
  name: string
  business_name?: string | null
  profile_image?: string | null
  avg_rating?: number | null
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
  monthTotal: number
  monthCount: number
  monthApproved: number
  unreadCount: number
}

export default function DashboardClient({
  profile,
  todayJobs,
  spaces,
  recentJobs,
  monthTotal,
  monthCount,
  monthApproved,
  unreadCount,
}: Props) {
  const router = useRouter()
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return '늦은 밤입니다'
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '안녕하세요'
    return '좋은 저녁이에요'
  })()

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={() => router.refresh()} />
      <Header showLogo showBell unreadCount={unreadCount} />

      <div className="page-container flex-1">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 pt-2"
        >
          <p className="t-caption">{greeting}, 공간 파트너님</p>
          <h1 className="h-hero text-ink mt-1">
            {profile.business_name || profile.name}
            <span className="text-text-faint text-xl font-extrabold">님</span>
          </h1>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-5"
        >
          <div className="rounded-3xl bg-ink text-white p-5 overflow-hidden relative">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand/30 rounded-full blur-3xl" />
            <div className="relative z-10">
              <p className="text-white/70 text-xs font-bold">오늘의 작업</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="t-money text-4xl">{todayJobs.length}</span>
                <span className="text-white/70 text-sm font-bold">건 예정</span>
              </div>
              {todayJobs.length > 0 ? (
                <div className="mt-4 text-[13px] font-semibold text-white/85 leading-snug">
                  가장 빠른 작업:{' '}
                  <span className="text-brand-light font-extrabold">
                    {formatScheduled(todayJobs[0].scheduled_at)}
                  </span>{' '}
                  · {todayJobs[0].spaces?.name}
                </div>
              ) : (
                <p className="mt-4 text-[13px] font-semibold text-white/75">
                  오늘 예정된 작업이 없어요. 새로운 요청을 만들어보세요.
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <Link
                  href="/requests/create"
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-brand text-ink font-black text-sm shadow-sm active:scale-[0.98] transition"
                >
                  <Zap size={16} strokeWidth={2.6} /> 즉시 요청
                </Link>
                <Link
                  href="/requests"
                  className="flex items-center justify-center h-11 px-4 rounded-xl bg-white/10 text-white font-bold text-sm active:scale-[0.98] transition"
                >
                  요청 전체보기
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3 mb-6">
          <MetricCard
            label="이번 달 지출"
            value={formatKRW(monthTotal, { short: true, withUnit: false })}
            unit="원"
            icon={<Wallet size={16} />}
          />
          <MetricCard
            label="완료율"
            value={monthCount > 0 ? Math.round((monthApproved / monthCount) * 100) : 0}
            unit="%"
            icon={<TrendingUp size={16} />}
          />
        </section>

        <section className="mb-7">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="h-section text-ink">내 공간</h2>
            <Link href="/spaces" className="text-xs font-bold text-text-muted flex items-center gap-0.5">
              전체 <ChevronRight size={14} />
            </Link>
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
                <Link key={s.id} href={`/spaces/${s.id}`} className="shrink-0 w-[200px] card-interactive p-4">
                  <div className="w-full aspect-[16/10] rounded-xl bg-surface-muted overflow-hidden mb-3 relative">
                    {s.photos?.[0] ? (
                      <img src={s.photos[0]} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-faint">
                        <Building2 size={28} />
                      </div>
                    )}
                    {s.is_active && (
                      <span className="absolute top-2 right-2 chip chip-brand text-[10px] px-2 py-0.5">운영중</span>
                    )}
                  </div>
                  <h3 className="text-[14px] font-extrabold text-ink truncate">{s.name}</h3>
                  <p className="text-[11.5px] text-text-soft font-bold mt-0.5">
                    {spaceTypeLabel(s.type)} · 기본 {formatKRW(s.base_price, { short: true })}
                  </p>
                </Link>
              ))}
              <Link
                href="/spaces/create"
                className="shrink-0 w-[140px] card-interactive flex flex-col items-center justify-center text-center p-4"
                style={{ borderStyle: 'dashed' }}
              >
                <div className="w-10 h-10 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-2">
                  <Plus size={20} />
                </div>
                <span className="text-[13px] font-extrabold text-ink">공간 추가</span>
              </Link>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="h-section text-ink">최근 요청</h2>
            <Link href="/requests" className="text-xs font-bold text-text-muted flex items-center gap-0.5">
              전체 <ChevronRight size={14} />
            </Link>
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
            <ul className="flex flex-col gap-3">
              {recentJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/requests/${job.id}`} className="card-interactive p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-softer flex items-center justify-center shrink-0">
                      <Sparkles size={18} className="text-brand-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StatusChip kind="job" status={job.status} size="sm" />
                        {job.is_urgent && <span className="chip chip-danger text-[10px] px-1.5 py-0">긴급</span>}
                      </div>
                      <h4 className="text-[14.5px] font-extrabold text-ink truncate mt-1">
                        {job.spaces?.name || '공간'}
                      </h4>
                      <p className="text-[11.5px] text-text-soft font-bold truncate flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        {formatScheduled(job.scheduled_at)}
                        {job.users?.name && <span className="ml-1">· {job.users.name}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="t-money text-[15px] text-ink">
                        {formatKRW(job.price, { short: true })}
                      </div>
                      <ChevronRight size={16} className="text-text-faint ml-auto mt-0.5" />
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
