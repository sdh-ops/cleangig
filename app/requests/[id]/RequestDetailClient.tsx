'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
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
} from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import ReviewModal from '@/components/common/ReviewModal'
import { formatKRW, formatScheduled, spaceTypeLabel } from '@/lib/utils'
import type { JobStatus, SpaceType } from '@/lib/types'

type JobFull = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  special_instructions?: string
  price_breakdown?: {
    total: number
    platform_fee: number
    worker_payout: number
    items?: { label: string; amount: number; kind: string }[]
  }
  checklist?: { id: string; label: string; required?: boolean; completed?: boolean; photo_url?: string }[]
  checklist_completed?: { id: string; label: string; required?: boolean; completed?: boolean; photo_url?: string }[]
  spaces?: {
    id: string
    name: string
    type: SpaceType
    address: string
    address_detail?: string
    photos?: string[]
  }
  users?: {
    id: string
    name: string
    avg_rating?: number
    tier?: string
    profile_image?: string
    phone?: string
  } | null
}

type Props = {
  job: JobFull
  photos: any[]
  payment: any
  applications: any[]
  userId: string
  initialIsFavorite?: boolean
}

export default function RequestDetailClient({ job, userId, initialIsFavorite = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [approving, setApproving] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const checklist = job.checklist_completed?.length ? job.checklist_completed : (job.checklist || [])

  const toggleFavorite = async () => {
    if (!job.users?.id) return
    setIsFavorite((v) => !v)
    if (!isFavorite) {
      await supabase.from('favorite_partners').insert({ operator_id: userId, worker_id: job.users.id })
    } else {
      await supabase.from('favorite_partners').delete().eq('operator_id', userId).eq('worker_id', job.users.id)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    setErr(null)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('id', job.id)
      if (error) throw error
      setApproving(false)
      // 승인 후 곧바로 리뷰 작성 유도
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
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'CANCELED', updated_at: new Date().toISOString() })
        .eq('id', job.id)
      if (error) throw error
      setShowCancel(false)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '취소 실패')
    }
    setCanceling(false)
  }

  const canCancel = ['OPEN', 'ASSIGNED'].includes(job.status)
  const canApprove = job.status === 'SUBMITTED'
  const canReview = ['APPROVED', 'PAID_OUT'].includes(job.status) && !!job.users?.id

  return (
    <div className="sseuksak-shell">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[14.5px] font-extrabold text-ink">요청 상세</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 pb-28">
        {/* Hero */}
        <div className="relative bg-ink text-white px-5 pt-5 pb-8">
          <div className="absolute -top-10 -right-8 w-48 h-48 bg-brand/25 rounded-full blur-3xl" />
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
            </div>
          </div>
        </div>

        <div className="px-5 -mt-4 relative z-10">
          {/* Worker card */}
          {job.users ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-black shrink-0">
                  {job.users.profile_image ? (
                    <img src={job.users.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    job.users.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14.5px] font-extrabold text-ink truncate">{job.users.name}</h4>
                  <div className="flex items-center gap-2 text-[11.5px] font-bold text-text-soft mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star size={11} className="text-sun" fill="currentColor" />
                      {(job.users.avg_rating ?? 0).toFixed(1)}
                    </span>
                    {job.users.tier && (
                      <>
                        <span>·</span>
                        <span>{job.users.tier}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={toggleFavorite}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isFavorite ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-text-faint'}`}
                  aria-label="단골 등록"
                >
                  <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              {['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                <div className="mt-3 flex gap-2">
                  <Link href={`/chat/${job.id}`} className="flex-1 btn btn-ghost !min-h-[42px] !text-sm">
                    <MessageSquare size={16} /> 채팅
                  </Link>
                  {job.users.phone && (
                    <a href={`tel:${job.users.phone}`} className="flex-1 btn btn-secondary !min-h-[42px] !text-sm">
                      <Phone size={16} /> 통화
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ) : job.status === 'OPEN' ? (
            <div className="card p-4 mb-4 bg-brand-softer border border-brand/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center">
                  <Loader2 size={18} className="text-brand-dark animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-extrabold text-ink">매칭 중입니다</p>
                  <p className="text-[11.5px] font-bold text-text-muted mt-0.5">
                    근처 마스터 작업자에게 알림을 보냈어요. 평균 4분
                  </p>
                </div>
              </div>
            </div>
          ) : null}

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
                  <span className="text-[13px] font-bold text-text-soft">총 결제</span>
                  <span className="t-money text-[18px] text-ink">{formatKRW(job.price_breakdown.total)}</span>
                </div>
              </div>
            </div>
          )}

          {err && (
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
            {canCancel && (
              <button onClick={() => setShowCancel(true)} className="btn btn-ghost w-full !text-danger">
                <Trash2 size={16} /> 요청 취소
              </button>
            )}
          </div>
        </div>
      </div>

      {job.users?.id && (
        <ReviewModal
          open={showReview}
          onClose={() => { setShowReview(false); router.refresh() }}
          onSubmitted={() => router.refresh()}
          jobId={job.id}
          revieweeId={job.users.id}
          revieweeName={job.users.name}
        />
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowCancel(false)}>
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="h-section">요청 취소</h3>
              <button onClick={() => setShowCancel(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="t-caption mb-5">취소 수수료가 발생할 수 있습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)} className="flex-1 btn btn-ghost">유지하기</button>
              <button onClick={handleCancel} disabled={canceling} className="flex-1 btn btn-primary !bg-danger">
                {canceling ? <Loader2 size={18} className="animate-spin" /> : '취소하기'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
