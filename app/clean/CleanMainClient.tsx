'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Clock,
  MapPin,
  Zap,
  Wallet,
  Star,
  ChevronRight,
  TrendingUp,
  Navigation,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import PullToRefresh from '@/components/common/PullToRefresh'
import SetupChecklist from '@/components/common/SetupChecklist'
import { formatKRW, formatScheduled, spaceTypeLabel, maskAddress } from '@/lib/utils'
import { TIER_BENEFITS } from '@/lib/matching'
import type { JobStatus, SpaceType } from '@/lib/types'

type Profile = {
  id: string
  name: string
  phone?: string | null
  avg_rating?: number
  tier?: 'STARTER' | 'SILVER' | 'GOLD' | 'MASTER'
  total_jobs?: number
  sparkle_score?: number
  profile_image?: string | null
  is_verified?: boolean
  bank_account?: { bank_name?: string; account_number?: string; account_holder?: string } | null
  tax_type?: string | null
}

type Job = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  special_instructions?: string
  spaces?: { id: string; name: string; type: SpaceType; address: string; address_detail?: string }
}

type Props = {
  profile: Profile
  activeJob: Job | null
  openJobs: Job[]
  weekEarnings: number
  pendingCount: number
  unreadCount: number
}

const TIER_ORDER = { STARTER: 0, SILVER: 1, GOLD: 2, MASTER: 3 }

export default function CleanMainClient({ profile, activeJob, openJobs, weekEarnings, pendingCount, unreadCount }: Props) {
  const router = useRouter()
  const tier = profile.tier ?? 'STARTER'
  const tierInfo = TIER_BENEFITS[tier]
  const rating = profile.avg_rating ?? 0
  const jobsCount = profile.total_jobs ?? 0
  const tierProgress = (TIER_ORDER[tier] / 3) * 100

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={() => router.refresh()} />
      <Header showLogo showBell unreadCount={unreadCount} />

      <div className="page-container flex-1">

        {/* Profile strip */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 pt-2">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-black text-lg shadow-brand-sm overflow-hidden">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.name.charAt(0)}</span>
                )}
              </div>
              {/* Tier ring indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black"
                style={{ backgroundColor: tierInfo.color, color: '#fff' }}
              >
                {tier.charAt(0)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[18px] font-extrabold text-ink truncate">{profile.name} 님</h1>
                <span
                  className="tier-badge shrink-0"
                  style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
                >
                  {tierInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[12px] font-bold text-text-soft">
                <span className="flex items-center gap-0.5">
                  <Star size={11} fill="#FFB800" className="text-sun" />
                  {rating > 0 ? rating.toFixed(1) : '—'}
                </span>
                <span className="text-text-faint">·</span>
                <span>{jobsCount}건 완료</span>
              </div>
              {/* Tier progress bar */}
              <div className="progress-bar mt-2 w-24">
                <div className="progress-bar-fill" style={{ width: `${Math.max(tierProgress, 8)}%`, background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.color}cc)` }} />
              </div>
            </div>

            <Link href="/profile" className="text-[12px] font-bold text-text-muted flex items-center gap-0.5 shrink-0">
              프로필 <ChevronRight size={13} />
            </Link>
          </div>
        </motion.section>

        {/* Setup checklist */}
        <div className="mb-5">
          <SetupChecklist
            storageKey="sseuksak:worker_setup_dismissed"
            title="클린파트너 시작 준비"
            items={[
              { key: 'profile', label: '이름 · 연락처 등록', href: '/profile/edit', done: !!profile.name && !!profile.phone },
              { key: 'verify', label: '본인 인증', href: '/profile/verification', done: !!profile.is_verified, badge: '중요' },
              { key: 'bank', label: '정산 계좌 등록', href: '/profile/bank', done: !!profile.bank_account?.account_number, badge: '필수' },
              { key: 'tax', label: '세금 유형 선택', href: '/profile/tax', done: !!profile.tax_type, badge: '필수' },
            ]}
          />
        </div>

        {/* Active job OR weekly earnings */}
        {activeJob ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <Link href={`/clean/job/${activeJob.id}`} className="block">
              <div className="card-dark p-5">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusChip kind="job" status={activeJob.status} />
                    {activeJob.is_urgent && <span className="chip chip-danger text-[10px]">긴급</span>}
                  </div>
                  <h3 className="text-[18px] font-extrabold text-white mb-1">{activeJob.spaces?.name}</h3>
                  <div className="flex items-center gap-2 text-[12.5px] text-white/70 font-semibold">
                    <Clock size={12} /> {formatScheduled(activeJob.scheduled_at)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[12.5px] text-white/70 font-semibold">
                    <MapPin size={12} /> {maskAddress(activeJob.spaces?.address || '')}
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-white/10 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10.5px] text-white/60 font-bold mb-0.5">지금 해야 할 일</p>
                      <p className="text-[13.5px] font-extrabold text-brand-light leading-snug">
                        {activeJob.status === 'ASSIGNED' && '현장으로 출발하세요'}
                        {activeJob.status === 'EN_ROUTE' && '도착 후 ARRIVED 버튼 눌러주세요'}
                        {activeJob.status === 'ARRIVED' && '체크리스트를 시작하세요'}
                        {activeJob.status === 'IN_PROGRESS' && '청소 완료 후 사진 제출'}
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center shrink-0 animate-pulse-ring ml-3">
                      <Navigation size={18} className="text-ink" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            {/* Weekly earnings card */}
            <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #FFB800 0%, #F0A500 100%)', boxShadow: '0 12px 28px rgba(255,184,0,0.3)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="relative z-10 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10.5px] font-black text-ink/60 uppercase tracking-widest">이번 주 수익</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="t-money text-[36px] text-ink leading-none">{formatKRW(weekEarnings, { withUnit: false })}</span>
                      <span className="text-[15px] font-black text-ink/70">원</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center">
                    <Wallet size={22} className="text-ink" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-[12px] font-bold text-ink/60 flex items-center gap-1.5">
                    <Clock size={12} /> 정산 대기 {pendingCount}건
                  </span>
                  <Link
                    href="/earnings"
                    className="flex items-center gap-1 text-[12.5px] font-black text-ink bg-white/30 px-3 py-1.5 rounded-full"
                  >
                    자세히 <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Nearby jobs */}
        <section className="mb-6">
          <div className="section-header">
            <div>
              <h2>내 주변 작업</h2>
              <p className="text-[11px] text-text-soft font-bold mt-0.5">지금 신청하면 우선 매칭돼요</p>
            </div>
            <Link href="/clean/jobs" className="text-xs font-bold text-text-muted flex items-center gap-0.5 self-start mt-1">
              전체 <ChevronRight size={14} />
            </Link>
          </div>

          {openJobs.length === 0 ? (
            <div className="card p-2">
              <EmptyState
                icon={<Sparkles size={24} />}
                title="주변에 열린 작업이 없어요"
                description="알림을 켜두면 근처 작업이 생길 때 바로 알려드려요."
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {openJobs.slice(0, 5).map((job, i) => (
                <motion.li
                  key={job.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.05 }}
                >
                  <Link href={`/clean/job/${job.id}`} className="card-interactive p-4 flex items-start gap-3">
                    <div className="icon-box icon-box-md icon-box-brand shrink-0 mt-0.5">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="chip chip-brand text-[10px] px-2 py-0.5">
                          {spaceTypeLabel(job.spaces?.type || 'other')}
                        </span>
                        {job.is_urgent && <span className="chip chip-danger text-[10px] flex items-center gap-0.5 px-1.5 py-0"><Zap size={9} />긴급</span>}
                      </div>
                      <h4 className="text-[14px] font-extrabold text-ink truncate">{job.spaces?.name}</h4>
                      <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <Clock size={10} /> {formatScheduled(job.scheduled_at)}
                      </p>
                      <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} /> {maskAddress(job.spaces?.address || '')}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mt-0.5">
                      <div className="t-money text-[15px] text-brand-dark font-black">
                        {formatKRW(Math.round(job.price * 0.88), { short: true })}
                      </div>
                      <p className="text-[9.5px] font-bold text-text-faint mt-0.5">예상 정산</p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        {/* Tips */}
        <section>
          <h2 className="h-section text-ink px-0.5 mb-3">쓱싹 꿀팁</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {[
              { icon: TrendingUp, label: '티어 올리는 법', desc: '평점 4.8 이상 유지 · 100건 달성', bg: 'bg-brand-softer', color: '#00C896' },
              { icon: Zap, label: '긴급 작업 잡기', desc: '알림 켜두고 가장 먼저 신청하기', bg: 'bg-sun-soft', color: '#FFB800' },
              { icon: CheckCircle2, label: '체크리스트 100%', desc: '사진 모두 제출해 분쟁 방지', bg: 'bg-info-soft', color: '#3B82F6' },
            ].map((t, i) => {
              const Icon = t.icon
              return (
                <div key={i} className="shrink-0 w-[190px] card p-4">
                  <div className={`w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center mb-2.5`} style={{ color: t.color }}>
                    <Icon size={17} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-[13px] font-extrabold text-ink">{t.label}</h4>
                  <p className="text-[11.5px] text-text-soft font-bold mt-1 leading-snug">{t.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <BottomNav role="worker" />
    </div>
  )
}
