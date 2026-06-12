'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  Bell,
  X,
} from 'lucide-react'
import { requestNotificationPermission, subscribeToPush } from '@/lib/push'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import PullToRefresh from '@/components/common/PullToRefresh'
import SetupChecklist from '@/components/common/SetupChecklist'
import { formatKRW, formatScheduled, spaceTypeLabel, maskAddress } from '@/lib/utils'
import { estimateWorkerPayout } from '@/lib/pricing'
import { TIER_BENEFITS } from '@/lib/matching'
import { useJobsRealtime } from '@/lib/useJobRealtime'
import { statusSubline } from '@/lib/statusDisplay'
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

const PUSH_DISMISSED_KEY = 'sseuksak:push_dismissed'

export default function CleanMainClient({ profile, activeJob, openJobs, weekEarnings, pendingCount, unreadCount }: Props) {
  const router = useRouter()
  const tier = profile.tier ?? 'STARTER'
  const tierInfo = TIER_BENEFITS[tier]
  const rating = profile.avg_rating ?? 0
  const jobsCount = profile.total_jobs ?? 0
  const tierProgress = (TIER_ORDER[tier] / 3) * 100

  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // 내 작업 + 새 OPEN 일감 실시간 반영.
  // RLS 특성상 다른 워커가 잡은 일감의 '제거' 이벤트는 안 와서 30초 폴링 병행.
  useJobsRealtime({ onRefresh: () => router.refresh(), pollMs: 30_000 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY)
    if (dismissed) return
    setShowPushBanner(true)
  }, [])

  async function handleEnablePush() {
    setPushLoading(true)
    const granted = await requestNotificationPermission()
    if (granted) {
      await subscribeToPush()
      setShowPushBanner(false)
    } else {
      localStorage.setItem(PUSH_DISMISSED_KEY, '1')
      setShowPushBanner(false)
    }
    setPushLoading(false)
  }

  function handleDismissPush() {
    localStorage.setItem(PUSH_DISMISSED_KEY, '1')
    setShowPushBanner(false)
  }

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={() => router.refresh()} />
      <Header showLogo showBell unreadCount={unreadCount} />

      {/* Push notification permission banner */}
      {showPushBanner && (
        <div className="mx-4 mt-2 mb-0 rounded-2xl overflow-hidden border border-brand/30 bg-brand-softer px-4 py-3 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0 mt-0.5">
            <Bell size={18} className="text-brand-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-extrabold text-ink leading-snug">알림을 켜야 새 작업을 받아요</p>
            <p className="text-[13.5px] text-text-soft font-bold mt-0.5 leading-snug">알림 허용 없이는 근처 청소 작업 알림을 못 받을 수 있어요.</p>
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="mt-2 text-[14.5px] font-black text-white bg-brand px-4 py-1.5 rounded-full disabled:opacity-60"
            >
              {pushLoading ? '처리 중...' : '알림 허용하기'}
            </button>
          </div>
          <button
            onClick={handleDismissPush}
            className="shrink-0 p-2.5 rounded-full text-text-faint hover:text-ink transition-colors"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="page-container flex-1">

        {/* Profile strip */}
        <section className="mb-5 pt-2">
          <Link href="/profile" className="flex items-center gap-3 active:opacity-70 transition-opacity">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-black text-lg shadow-brand-sm overflow-hidden">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(profile.name ?? '?').charAt(0)}</span>
                )}
              </div>
              {/* Tier ring indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[12px] font-black"
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
              <div className="flex items-center gap-3 mt-1 text-[14.5px] font-bold text-text-soft">
                <span className="flex items-center gap-0.5">
                  <Star size={11} fill="#FFB800" className="text-sun" />
                  {rating > 0 ? rating.toFixed(1) : '—'}
                </span>
                <span className="text-text-faint">·</span>
                <span>{jobsCount}건 완료</span>
              </div>
              {/* Tier progress bar + next milestone */}
              <div className="progress-bar mt-2 w-24">
                <div className="progress-bar-fill" style={{ width: `${Math.max(tierProgress, 8)}%`, background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.color}cc)` }} />
              </div>
              {tier !== 'MASTER' && (() => {
                const nextLabel = tier === 'STARTER' ? '실버' : tier === 'SILVER' ? '골드' : '마스터'
                const needed = tier === 'STARTER' ? 10 : tier === 'SILVER' ? 50 : 150
                const left = Math.max(0, needed - jobsCount)
                return left > 0 ? (
                  <p className="text-[12px] font-bold mt-0.5" style={{ color: tierInfo.color }}>
                    {nextLabel}까지 {left}건
                  </p>
                ) : null
              })()}
            </div>

            <ChevronRight size={16} className="text-text-faint shrink-0" />
          </Link>
        </section>

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
          <section className="mb-6">
            <Link href={`/clean/job/${activeJob.id}`} className="block">
              <div className="card-dark p-5">
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusChip kind="job" status={activeJob.status} />
                    {activeJob.is_urgent && <span className="chip chip-danger text-[13px]">긴급</span>}
                  </div>
                  <h3 className="text-[18px] font-extrabold text-white mb-1">{activeJob.spaces?.name}</h3>
                  <div className="flex items-center gap-2 text-[14.5px] text-white/70 font-semibold">
                    <Clock size={12} /> {formatScheduled(activeJob.scheduled_at)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[14.5px] text-white/70 font-semibold">
                    <MapPin size={12} /> {maskAddress(activeJob.spaces?.address || '')}
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-white/10">
                    <p className="text-[13px] text-white/80 font-bold mb-0.5">지금 해야 할 일</p>
                    <p className="text-[15px] font-extrabold text-brand-light leading-snug">
                      {statusSubline(activeJob.status, 'worker')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2 h-[56px] rounded-2xl bg-brand text-ink font-black text-[17px] active:scale-[0.98] transition shadow-sm">
                    <Navigation size={18} strokeWidth={2.5} /> 이어서 진행하기
                  </div>
                </div>
              </div>
            </Link>
          </section>
        ) : (
          <section className="mb-6">
            {/* Weekly earnings card — sun gradient with light leak */}
            <div
              className="rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(145deg, #0EA5E9 0%, #0284C7 55%, #0369A1 100%)',
                boxShadow: '0 16px 40px rgba(14,165,233,0.28), 0 4px 12px rgba(14,165,233,0.16)',
              }}
            >
              {/* Dot grid */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
              />
              {/* Light leak top-left */}
              <div
                aria-hidden
                className="absolute -top-6 -left-6 w-36 h-36 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)' }}
              />
              {/* Inner shine */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 55%)' }}
              />

              <div className="relative z-10 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="t-overline text-white/70 mb-2">이번 주 수익</p>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="num-display text-white"
                        style={{ fontSize: 42, lineHeight: 1 }}
                      >
                        {formatKRW(weekEarnings, { withUnit: false })}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.8)' }}>원</span>
                    </div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <Wallet size={22} className="text-white" strokeWidth={2.5} />
                  </div>
                </div>

                <div
                  className="mt-4 rounded-2xl p-3 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <span className="text-[14.5px] font-bold text-white/80 flex items-center gap-1.5">
                    <Clock size={12} /> 정산 대기 {pendingCount}건
                  </span>
                  <Link
                    href="/earnings"
                    className="flex items-center gap-1 text-[14.5px] font-black text-white bg-white/20 px-3 py-1.5 rounded-full"
                  >
                    자세히 <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 일감이 없을 때 가장 중요한 행동 — 큰 버튼 1개 */}
            <Link href="/clean/jobs" className="btn btn-primary w-full mt-4">
              <MapPin size={20} /> 내 주변 일감 찾기
            </Link>
          </section>
        )}

        {/* Nearby jobs */}
        <section className="mb-6">
          <div className="section-header">
            <div>
              <h2>내 주변 작업</h2>
              <p className="text-[13.5px] text-text-soft font-bold mt-0.5">지금 신청하면 우선 매칭돼요</p>
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
              {openJobs.slice(0, 5).map((job) => (
                <li key={job.id}>
                  <Link href={`/clean/job/${job.id}`} className="card-interactive p-4 flex items-start gap-3">
                    <div className="icon-box icon-box-md icon-box-brand shrink-0 mt-0.5">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="chip chip-brand text-[13px] px-2 py-0.5">
                          {spaceTypeLabel(job.spaces?.type || 'other')}
                        </span>
                        {job.is_urgent && <span className="chip chip-danger text-[13px] flex items-center gap-0.5 px-1.5 py-0"><Zap size={9} />긴급</span>}
                      </div>
                      <h4 className="text-[14px] font-extrabold text-ink truncate">{job.spaces?.name}</h4>
                      <p className="text-[13.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <Clock size={10} /> {formatScheduled(job.scheduled_at)}
                      </p>
                      <p className="text-[13.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} /> {maskAddress(job.spaces?.address || '')}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mt-0.5">
                      <div className="t-money text-[15px] text-brand-dark font-black">
                        {formatKRW(estimateWorkerPayout(job.price), { short: true })}
                      </div>
                      <p className="text-[14px] font-bold text-text-faint mt-0.5">예상 수령</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tips */}
        <section>
          <h2 className="h-section text-ink px-0.5 mb-3">쓱싹 꿀팁</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {[
              {
                icon: Zap,
                label: '긴급·심야는 정산액 100%',
                desc: '할증분은 이용료 없이 전액 내 정산액 — 알림 켜두고 먼저 신청해 선점',
                badge: '할증 전액',
                badgeColor: 'text-[#92580C] bg-sun-soft',
                bg: 'bg-sun-soft',
                color: '#FFB800',
              },
              {
                icon: TrendingUp,
                label: '등급 오르면 정산액 ↑',
                desc: '스타터→마스터, 같은 작업도 정산액 최대 +3% · 평점 4.8 + 실적',
                badge: '정산액 +3%',
                badgeColor: 'text-brand-dark bg-brand-softer',
                bg: 'bg-brand-softer',
                color: '#0EA5E9',
              },
              {
                icon: CheckCircle2,
                label: '체크리스트 100% = 분쟁 0',
                desc: '사진 빠짐없이 제출하면 분쟁 신청 자체가 막혀요',
                badge: '분쟁 방지',
                badgeColor: 'text-success bg-success-soft',
                bg: 'bg-success-soft',
                color: '#22C55E',
              },
              {
                icon: Star,
                label: '별점은 완료 당일이 핵심',
                desc: '작업 직후 공간 파트너에게 한마디 남기면 답장 별점 확률 3배',
                badge: '평점 관리',
                badgeColor: 'text-[#92580C] bg-sun-soft',
                bg: 'bg-sun-soft',
                color: '#FFB800',
              },
              {
                icon: Navigation,
                label: '첫 2건 정산액 +5%',
                desc: '신규 클린파트너 프로모션 — 첫 2건은 플랫폼 이용료 대폭 인하',
                badge: '신규 프로모션',
                badgeColor: 'text-brand-dark bg-brand-softer',
                bg: 'bg-brand-softer',
                color: '#0EA5E9',
              },
            ].map((t, i) => {
              const Icon = t.icon
              return (
                <div key={i} className="shrink-0 w-[200px] card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center`} style={{ color: t.color }}>
                      <Icon size={17} strokeWidth={2.5} />
                    </div>
                    <span className={`text-[12px] font-black px-2 py-0.5 rounded-full ${t.badgeColor}`}>{t.badge}</span>
                  </div>
                  <h4 className="text-[14.5px] font-extrabold text-ink leading-snug">{t.label}</h4>
                  <p className="text-[13px] text-text-soft font-bold leading-snug">{t.desc}</p>
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
