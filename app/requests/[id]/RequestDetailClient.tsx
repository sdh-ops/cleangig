'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useJobRealtime, type JobRealtimeRow } from '@/lib/useJobRealtime'
import {
  ChevronLeft,
  Home,
  Clock,
  MapPin,
  Star,
  MessageSquare,
  Phone,
  CheckCircle2,
  Loader2,
  X,
  AlertTriangle,
  Trash2,
  Heart,
  Check,
  ThumbsUp,
  ThumbsDown,
  Navigation,
  Sparkles,
  DollarSign,
} from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import StatusStepper from '@/components/common/StatusStepper'
import ReviewModal from '@/components/common/ReviewModal'
import DisputeModal from '@/components/common/DisputeModal'
import WorkerLiveMap from '@/components/common/WorkerLiveMap'
import { formatKRW, formatScheduled, spaceTypeLabel } from '@/lib/utils'
import { cancelRefundRate } from '@/lib/pricing'
import { notify } from '@/lib/notifications'
import type { JobStatus, SpaceType } from '@/lib/types'

type SupplyLevel = 'low' | 'out'
type SupplyStatusItem = { name: string; level: SupplyLevel }
type ExtraChargeStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'

const SUPPLY_LEVEL_LABELS: Record<SupplyLevel, string> = { low: '거의 다 씀', out: '없음' }
const SUPPLY_LEVEL_COLORS: Record<SupplyLevel, string> = {
  low: 'bg-sun-soft text-[#92580C] border-sun/30',
  out: 'bg-danger-soft text-danger border-danger/25',
}

type JobFull = {
  id: string
  status: JobStatus
  operator_id: string
  worker_id?: string | null
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  special_instructions?: string
  price_breakdown?: {
    total: number
    host_fee?: number
    worker_fee?: number
    platform_revenue?: number
    estimated_withholding?: number
    estimated_worker_payout?: number
    worker_payout_if_business?: number
    platform_fee?: number
    worker_payout?: number
    items?: { label: string; amount: number; kind: string }[]
  }
  checklist?: { id: string; label: string; required?: boolean; completed?: boolean; photo_url?: string }[]
  checklist_completed?: { id: string; label: string; required?: boolean; completed?: boolean; photo_url?: string }[]
  supply_shortages?: string[] | null
  supply_status?: SupplyStatusItem[] | null
  extra_charge_status?: ExtraChargeStatus | null
  extra_charge_amount?: number | null
  extra_charge_reason?: string | null
  extra_charge_photos?: string[] | null
  spaces?: {
    id: string
    name: string
    type: SpaceType
    address: string
    address_detail?: string
    photos?: string[]
    location?: { coordinates?: [number, number] } | null
  }
  users?: {
    id: string
    name: string
    avg_rating?: number
    total_jobs?: number
    sparkle_score?: number
    tier?: string
    profile_image?: string
    phone?: string
  } | null
}

type Props = {
  job: JobFull
  userId: string
  initialIsFavorite?: boolean
}

// ─── 티어 메타 ───────────────────────────────────────────────
const TIER_META: Record<string, { color: string; bg: string; label: string }> = {
  STARTER: { color: '#64748B', bg: 'rgba(100,116,139,0.10)', label: '스타터' },
  SILVER:  { color: '#475569', bg: 'rgba(71,85,105,0.10)',   label: '실버' },
  GOLD:    { color: '#D97706', bg: 'rgba(217,119,6,0.10)',   label: '골드' },
  MASTER:  { color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)',  label: '마스터' },
}

// ─── 워커 프로필 카드 컴포넌트 ──────────────────────────────
type WorkerMeta = NonNullable<JobFull['users']>
type WorkerCardProps = {
  worker: WorkerMeta
  jobId: string
  jobStatus: string
  isFavorite: boolean
  onToggleFavorite: () => void
}

function WorkerProfileCard({ worker, jobId, jobStatus, isFavorite, onToggleFavorite }: WorkerCardProps) {
  const tier = worker.tier ?? 'STARTER'
  const tierMeta = TIER_META[tier] ?? TIER_META.STARTER
  const rating = worker.avg_rating ?? 0
  const totalJobs = worker.total_jobs ?? 0
  const isTrusted = rating >= 4.5 && totalJobs >= 20
  const isActive = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(jobStatus)

  return (
    <div className="card mb-4 overflow-hidden">
      {/* 상단 배너 */}
      <div
        className="relative px-4 pt-4 pb-5"
        style={{ background: `linear-gradient(135deg, ${tierMeta.bg.replace('0.10','0.18')} 0%, transparent 100%)` }}
      >
        <div className="flex items-start gap-3">
          {/* 아바타 + 티어 뱃지 */}
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xl text-white"
              style={{ background: `linear-gradient(135deg, ${tierMeta.color}cc 0%, ${tierMeta.color}88 100%)` }}
            >
              {worker.profile_image ? (
                <img src={worker.profile_image} alt={worker.name} className="w-full h-full object-cover" />
              ) : (
                worker.name.charAt(0)
              )}
            </div>
            {/* 티어 뱃지 (오른쪽 하단) */}
            <div
              className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-full"
              style={{
                background: tierMeta.color,
                fontSize: 9,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '0.05em',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              }}
            >
              {tierMeta.label.toUpperCase()}
            </div>
          </div>

          {/* 이름 + 신뢰 태그 */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-[15px] font-extrabold text-ink">{worker.name}</h4>
              {isTrusted && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}
                >
                  검증 파트너
                </span>
              )}
            </div>

            {/* 핵심 지표 3가지 */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-0.5">
                  <Star size={11} className="text-sun" fill="currentColor" />
                  <span className="text-[13px] font-black text-ink">{rating.toFixed(1)}</span>
                </div>
                <span className="text-[9.5px] font-bold text-text-faint mt-0.5">평점</span>
              </div>
              <div className="w-px h-7 bg-line-soft" />
              <div className="flex flex-col items-center">
                <span className="text-[13px] font-black text-ink">
                  {totalJobs >= 1000 ? `${Math.floor(totalJobs / 100) / 10}k` : totalJobs}
                </span>
                <span className="text-[9.5px] font-bold text-text-faint mt-0.5">완료 건수</span>
              </div>
              {worker.sparkle_score !== undefined && worker.sparkle_score !== null && (
                <>
                  <div className="w-px h-7 bg-line-soft" />
                  <div className="flex flex-col items-center">
                    <span className="text-[13px] font-black text-ink">{worker.sparkle_score}</span>
                    <span className="text-[9.5px] font-bold text-text-faint mt-0.5">활동 점수</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 단골 버튼 */}
          <button
            onClick={onToggleFavorite}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isFavorite ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-text-faint hover:text-danger hover:bg-danger-soft'
            }`}
            aria-label={isFavorite ? '단골 해제' : '단골 등록'}
          >
            <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 단골 안내 문구 */}
        {isFavorite && (
          <div
            className="mt-3 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5"
            style={{ background: 'rgba(239,68,68,0.07)', color: '#B91C1C' }}
          >
            <Heart size={11} fill="currentColor" />
            단골 파트너 등록됨 — 다음 요청 시 우선 배정 요청 가능
          </div>
        )}
      </div>

      {/* 연락 버튼 (활성 상태일 때만) */}
      {isActive && (
        <div className="px-4 pb-4 flex gap-2">
          <Link href={`/chat/${jobId}`} className="flex-1 btn btn-ghost !min-h-[42px] !text-sm">
            <MessageSquare size={15} /> 채팅
          </Link>
          {worker.phone && (
            <a href={`tel:${worker.phone}`} className="flex-1 btn btn-secondary !min-h-[42px] !text-sm">
              <Phone size={15} /> 통화
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function RequestDetailClient({ job: initialJob, userId, initialIsFavorite = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [job, setJob] = useState<JobFull>(initialJob)
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [approving, setApproving] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [respondingExtra, setRespondingExtra] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // router.refresh()로 서버 컴포넌트가 새 props를 내려보내면 로컬 상태에 동기화
  useEffect(() => { setJob(initialJob) }, [initialJob])

  // 실시간 — 워커의 출발/도착/청소중/완료보고가 새로고침 없이 보임 (#1 불만 시나리오)
  useJobRealtime(job.id, {
    onUpdate: (row: JobRealtimeRow) => {
      setJob((j) => ({ ...j, ...row } as JobFull))
      // 워커 join(users)은 payload에 없음 — 새로 배정되면 서버에서 프로필 재로드
      if (row.worker_id && !initialJob.users?.id) router.refresh()
    },
    refetch: () => router.refresh(),
  })

  const checklist = job.checklist_completed?.length ? job.checklist_completed : (job.checklist || [])
  const extraStatus = job.extra_charge_status ?? 'NONE'

  const toggleFavorite = async () => {
    if (!job.users?.id) return
    setIsFavorite((v) => !v)
    if (!isFavorite) {
      await supabase.from('favorite_partners').insert({ operator_id: userId, worker_id: job.users!.id })
    } else {
      await supabase.from('favorite_partners').delete().eq('operator_id', userId).eq('worker_id', job.users!.id)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    setErr(null)
    try {
      const res = await fetch('/api/jobs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!data?.ok) throw new Error(data?.error || '승인 실패')

      setJob((j) => ({ ...j, status: 'APPROVED' as JobStatus }))
      setApproving(false)
      if (job.users?.id) setShowReview(true)
      else router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '승인 실패')
      setApproving(false)
    }
  }

  const handleCancel = async () => {
    setCanceling(true)
    setErr(null)
    try {
      const res = await fetch('/api/jobs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!data?.ok) throw new Error(data?.error || '취소 실패')
      setShowCancel(false)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '취소 실패')
    }
    setCanceling(false)
  }

  const handleExtraCharge = async (approve: boolean) => {
    if (!job.worker_id) return
    setRespondingExtra(true)
    setErr(null)
    try {
      const newStatus: ExtraChargeStatus = approve ? 'APPROVED' : 'REJECTED'
      const { error } = await supabase
        .from('jobs')
        .update({ extra_charge_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      if (error) throw error
      setJob((j) => ({ ...j, extra_charge_status: newStatus }))
      // 클린파트너 알림
      notify({
        userId: job.worker_id,
        title: approve ? '추가 청구가 승인됐어요!' : '추가 청구가 거절됐어요',
        message: approve
          ? `${formatKRW(job.extra_charge_amount ?? 0)} 추가 청구가 승인됐습니다. 정산에 포함됩니다.`
          : `${job.spaces?.name ?? '작업'}의 추가 청구 요청이 거절됐습니다.`,
        url: `/clean/job/${job.id}`,
        type: approve ? 'extra_charge_approved' : 'extra_charge_rejected',
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '처리 실패')
    } finally {
      setRespondingExtra(false)
    }
  }

  const isOwner = job.operator_id === userId
  // API(/api/jobs/cancel)는 EN_ROUTE/ARRIVED까지 허용 — UI도 정렬
  const canCancel = isOwner && ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(job.status)
  const canApprove = isOwner && job.status === 'SUBMITTED'
  const canReview = isOwner && ['APPROVED', 'PAID_OUT'].includes(job.status) && !!job.users?.id
  const canDispute = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].includes(job.status)

  return (
    <div className="sseuksak-shell">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <div className="flex items-center gap-0.5">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
              <ChevronLeft size={22} />
            </button>
            <Link href="/requests" aria-label="요청 목록" className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-muted">
              <Home size={16} className="text-text-soft" />
            </Link>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[14.5px] font-extrabold text-ink">요청 상세</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 pb-28 overflow-y-auto">
        {/* Hero */}
        <div className="relative bg-ink text-white px-5 pt-5 pb-8">
          <div className="absolute -top-10 -right-8 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <StatusChip kind="job" status={job.status} />
              {job.is_urgent && <span className="chip chip-danger !text-[10px]">긴급</span>}
            </div>
            <div className="chip chip-brand !text-[10.5px] mb-2">
              {spaceTypeLabel(job.spaces?.type || 'other')}
            </div>
            <h2 className="text-[22px] font-black leading-tight">{job.spaces?.name}</h2>
            <p className="text-[13px] text-white/80 font-semibold mt-2 flex items-center gap-1.5">
              <Clock size={13} /> {formatScheduled(job.scheduled_at)} · {job.estimated_duration ?? 90}분
            </p>
            <p className="text-[13px] text-white/80 font-semibold mt-1 flex items-center gap-1.5">
              <MapPin size={13} /> {job.spaces?.address}
            </p>
            <div className="mt-5">
              <p className="text-[11px] text-white/60 font-bold">총 결제 금액</p>
              <p className="t-money text-[26px] text-white">{formatKRW(job.price)}</p>
              {extraStatus === 'APPROVED' && job.extra_charge_amount && (
                <p className="text-[12px] text-brand-light font-bold mt-0.5">
                  + 추가 청구 {formatKRW(job.extra_charge_amount)} 승인됨
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 진행 현황 — 사용자용 5단계 (내부 상태 10개 대신) */}
        <div className="px-5 pt-3 pb-1 relative z-10">
          <div className="card p-4 mb-0">
            <StatusStepper status={job.status} role="operator" />
          </div>
        </div>

        <div className="px-5 -mt-4 relative z-10">
          {/* Worker card */}
          {job.users ? (
            <WorkerProfileCard
              worker={job.users}
              jobId={job.id}
              jobStatus={job.status}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ) : job.status === 'OPEN' ? (
            <div className="card p-4 mb-4 bg-brand-softer border border-brand/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center">
                  <Loader2 size={18} className="text-brand-dark animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-extrabold text-ink">매칭 중입니다</p>
                  <p className="text-[11.5px] font-bold text-text-muted mt-0.5">
                    근처 클린파트너에게 알림을 보냈어요. 곧 매칭돼요
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Live worker location */}
          {['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && job.spaces?.location?.coordinates && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-3">실시간 위치</h3>
              <WorkerLiveMap
                jobId={job.id}
                spaceLat={job.spaces.location.coordinates[1]}
                spaceLng={job.spaces.location.coordinates[0]}
                spaceName={job.spaces.name}
                height={220}
              />
            </div>
          )}

          {/* Instructions */}
          {job.special_instructions && (
            <div className="card p-4 mb-4 bg-sun-soft border border-sun/20">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} className="text-[#92580C]" />
                <span className="text-[12px] font-black text-[#92580C] uppercase tracking-wide">특별 요청사항</span>
              </div>
              <p className="text-[13.5px] font-semibold text-ink leading-snug">{job.special_instructions}</p>
            </div>
          )}

          {/* 비품 부족 알림 (supply_status: 2레벨) */}
          {((job.supply_status && job.supply_status.length > 0) || (job.supply_shortages && job.supply_shortages.length > 0)) && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-1">채워야 할 비품</h3>
              <p className="text-[11.5px] text-text-soft font-medium mb-3 leading-snug">
                클린파트너가 이번 청소 중 부족을 확인한 소모품이에요.
              </p>
              <div className="flex flex-wrap gap-2">
                {job.supply_status && job.supply_status.length > 0
                  ? job.supply_status.map((s) => (
                      <span
                        key={s.name}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold border ${SUPPLY_LEVEL_COLORS[s.level]}`}
                      >
                        {s.name}
                        <span className="ml-1 text-[10.5px]">({SUPPLY_LEVEL_LABELS[s.level]})</span>
                      </span>
                    ))
                  : job.supply_shortages?.map((s) => (
                      <span key={s} className="px-3 py-1.5 rounded-full text-[12.5px] font-bold bg-sun-soft text-[#92580C] border border-sun/30">
                        {s}
                      </span>
                    ))}
              </div>
            </div>
          )}

          {/* 추가 청구 요청 (host 승인/거절) */}
          {extraStatus === 'REQUESTED' && job.extra_charge_amount && (
            <div className="card p-4 mb-4 border-2 border-sun/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-sun animate-pulse" />
                <h3 className="text-[13.5px] font-extrabold text-ink">추가 청구 요청</h3>
              </div>
              <p className="text-[13px] font-bold text-ink mb-0.5">{formatKRW(job.extra_charge_amount)}</p>
              <p className="text-[12px] text-text-soft font-medium mb-3 leading-snug">{job.extra_charge_reason}</p>
              {job.extra_charge_photos && job.extra_charge_photos.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {job.extra_charge_photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-line-soft" />
                  ))}
                </div>
              )}
              {err && <p className="text-[12px] text-danger font-bold mb-2">{err}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => handleExtraCharge(false)}
                  disabled={respondingExtra}
                  className="flex-1 btn btn-ghost !text-danger !border-danger/20 !text-sm"
                >
                  {respondingExtra ? <Loader2 size={14} className="animate-spin" /> : <><ThumbsDown size={14} /> 거절</>}
                </button>
                <button
                  onClick={() => handleExtraCharge(true)}
                  disabled={respondingExtra}
                  className="flex-1 btn btn-primary !text-sm"
                >
                  {respondingExtra ? <Loader2 size={14} className="animate-spin" /> : <><ThumbsUp size={14} /> 승인</>}
                </button>
              </div>
            </div>
          )}

          {extraStatus === 'APPROVED' && job.extra_charge_amount && (
            <div className="card p-3 mb-4 bg-brand-softer border border-brand/20">
              <p className="text-[12.5px] font-bold text-brand-dark flex items-center gap-1.5">
                <Check size={14} /> 추가 청구 {formatKRW(job.extra_charge_amount)} 승인 완료
              </p>
            </div>
          )}

          {extraStatus === 'REJECTED' && (
            <div className="card p-3 mb-4 bg-surface-muted border border-line-soft">
              <p className="text-[12.5px] font-bold text-text-soft">추가 청구 거절됨</p>
            </div>
          )}

          {/* Checklist + photos */}
          {checklist.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-3">체크리스트</h3>
              <ul className="flex flex-col gap-2.5">
                {checklist.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${c.completed ? 'bg-brand text-white' : 'bg-surface-muted'}`}>
                      {c.completed && <CheckCircle2 size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {c.label}
                        {c.required && <span className="ml-1.5 text-[10.5px] font-black text-danger">필수</span>}
                      </p>
                      {c.photo_url && (
                        <img src={c.photo_url} alt="" className="mt-2 w-24 h-24 rounded-lg object-cover border border-line-soft" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price breakdown */}
          {job.price_breakdown && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-3">가격 상세</h3>
              <div className="flex flex-col gap-2">
                {job.price_breakdown.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="font-semibold text-text-muted">{it.label}</span>
                    <span className="t-money text-ink">
                      {it.kind === 'sub' ? '-' : ''}
                      {formatKRW(Math.abs(it.amount))}
                    </span>
                  </div>
                ))}
                <div className="divider" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-bold text-text-soft">총 결제 (VAT 포함)</span>
                  <span className="t-money text-[18px] text-ink">{formatKRW(job.price_breakdown.total ?? job.price)}</span>
                </div>
                {(job.price_breakdown.host_fee !== undefined || job.price_breakdown.worker_fee !== undefined) && (
                  <div className="mt-3 pt-3 border-t border-line-soft text-[11.5px] text-text-soft font-bold space-y-1">
                    <div className="flex justify-between">
                      <span>플랫폼 공간파트너 수수료</span>
                      <span>{formatKRW(job.price_breakdown.host_fee || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>플랫폼 클린파트너 수수료</span>
                      <span>{formatKRW(job.price_breakdown.worker_fee || 0)}</span>
                    </div>
                    {job.price_breakdown.estimated_worker_payout !== undefined && (
                      <div className="flex justify-between text-brand-dark">
                        <span>클린파트너 정산액 (세금 전)</span>
                        <span>{formatKRW(job.price_breakdown.worker_payout_if_business || 0)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {err && extraStatus !== 'REQUESTED' && (
            <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/15 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[13px] font-bold text-danger leading-snug">{err}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {canApprove && (
              <button onClick={handleApprove} disabled={approving} className="btn btn-primary w-full">
                {approving ? <Loader2 size={18} className="animate-spin" /> : <>승인하고 정산 진행 <CheckCircle2 size={18} /></>}
              </button>
            )}
            {canReview && (
              <button onClick={() => setShowReview(true)} className="btn btn-secondary w-full">
                <Star size={16} /> {job.users?.name} 님께 리뷰 남기기
              </button>
            )}
            {canCancel && job.status === 'OPEN' && (
              <button onClick={() => setShowCancel(true)} className="btn btn-secondary w-full !border-danger/30 !text-danger">
                <Trash2 size={16} /> 요청 취소 ({cancelRefundRate(job.scheduled_at).label})
              </button>
            )}
            {canCancel && job.status !== 'OPEN' && (
              <button onClick={() => setShowCancel(true)} className="btn btn-ghost w-full !text-danger">
                <Trash2 size={16} /> 요청 취소
              </button>
            )}
            {canDispute && (
              <button onClick={() => setShowDispute(true)} className="btn btn-ghost w-full !text-danger">
                <AlertTriangle size={16} /> 문제 신고
              </button>
            )}
          </div>
        </div>
      </div>

      {job.users?.id && (
        <ReviewModal
          open={showReview}
          onClose={() => { setShowReview(false); router.refresh() }}
          onSubmitted={() => {
            if (job.worker_id) {
              notify({
                userId: job.worker_id,
                title: '공간파트너가 리뷰를 남겼어요',
                message: `${job.spaces?.name ?? '작업'}에 대한 리뷰가 등록됐습니다.`,
                url: `/clean/job/${job.id}`,
                type: 'review_received',
              })
            }
            setShowReview(false)
          }}
          jobId={job.id}
          revieweeId={job.users.id}
          revieweeName={job.users.name}
          reviewType="operator_to_worker"
        />
      )}

      <DisputeModal
        open={showDispute}
        onClose={() => setShowDispute(false)}
        jobId={job.id}
        onSubmitted={() => router.refresh()}
      />

      {/* Cancel modal */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowCancel(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="h-section">요청 취소</h3>
              <button onClick={() => setShowCancel(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            {(() => {
              const policy = cancelRefundRate(job.scheduled_at)
              const refund = Math.round((job.price || 0) * policy.rate)
              const fee = (job.price || 0) - refund
              const hoursLeft = (new Date(job.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60)
              const willChargeDeposit = hoursLeft < 24 && !!job.worker_id
              return (
                <>
                  <p className="t-caption mb-4">{policy.label}</p>
                  <div className="card p-4 bg-surface-soft mb-4">
                    <div className="flex justify-between text-[13px] font-semibold text-text-muted py-1">
                      <span>요청 금액</span>
                      <span>{formatKRW(job.price || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[13px] font-semibold text-danger py-1">
                      <span>취소 수수료 (정책 기준)</span>
                      <span>−{formatKRW(fee)}</span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between text-[14px] font-black text-ink py-1">
                      <span>환불 예정액</span>
                      <span>{formatKRW(refund)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-faint font-semibold mb-3">
                    ※ 취소 정책에 따라 환불이 처리됩니다. 환불은 결제 수단으로 3~5 영업일 내 입금됩니다.
                  </p>
                  {willChargeDeposit && (
                    <div className="p-3 rounded-xl bg-danger-soft border border-danger/20 mb-4">
                      <p className="text-[12px] font-bold text-danger leading-snug">
                        ⚠️ 24시간 이내 취소 + 클린파트너 배정 상태입니다. 보증금 5,000원이 추가로 차감됩니다.
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
            {err && <p className="text-[12.5px] text-danger font-bold mb-3">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)} className="flex-1 btn btn-ghost">유지하기</button>
              <button onClick={handleCancel} disabled={canceling} className="flex-1 btn btn-primary !bg-danger">
                {canceling ? <Loader2 size={18} className="animate-spin" /> : '취소하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
