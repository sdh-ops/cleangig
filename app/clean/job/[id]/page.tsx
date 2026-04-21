'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft,
  Clock,
  MapPin,
  Navigation,
  CheckCircle2,
  Camera,
  Loader2,
  Phone,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  Zap,
} from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import DisputeModal from '@/components/common/DisputeModal'
import { formatKRW, formatScheduled, spaceTypeLabel, maskAddress, haversineKm } from '@/lib/utils'
import type { ChecklistItem, JobStatus, SpaceType } from '@/lib/types'

type JobFull = {
  id: string
  status: JobStatus
  worker_id?: string | null
  operator_id: string
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  special_instructions?: string
  checklist?: ChecklistItem[]
  spaces?: {
    id: string
    name: string
    type: SpaceType
    address: string
    address_detail?: string
    cleaning_tool_location?: string
    parking_guide?: string
    trash_guide?: string
    photos?: string[]
    location?: { coordinates?: [number, number] } | null
  }
  users?: { id: string; name: string; phone?: string; profile_image?: string; avg_rating?: number } | null
}

const STATUS_FLOW: Partial<Record<JobStatus, { next: JobStatus; label: string; btnLabel: string; icon: typeof Navigation }>> = {
  ASSIGNED: { next: 'EN_ROUTE', label: '배정 완료', btnLabel: '현장으로 출발하기', icon: Navigation },
  EN_ROUTE: { next: 'ARRIVED', label: '이동 중', btnLabel: '현장 도착', icon: MapPin },
  ARRIVED: { next: 'IN_PROGRESS', label: '도착', btnLabel: '청소 시작하기', icon: Sparkles },
  IN_PROGRESS: { next: 'SUBMITTED', label: '청소 중', btnLabel: '작업 완료 보고', icon: CheckCircle2 },
}

export default function WorkerJobDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [job, setJob] = useState<JobFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [showConsent, setShowConsent] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [currentChecklistIdx, setCurrentChecklistIdx] = useState<number | null>(null)
  const [workerReady, setWorkerReady] = useState<{ bank: boolean; tax: boolean } | null>(null)

  // Periodic GPS ping while worker is traveling/working (host can see live location)
  useEffect(() => {
    if (!job || !userId || job.worker_id !== userId) return
    if (!['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status)) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          supabase.from('worker_locations').insert({
            job_id: job.id,
            worker_id: userId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      )
    }
    ping()
    const t = setInterval(ping, 45_000) // 45s
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, userId, job?.id])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('bank_account, tax_type')
        .eq('id', user.id)
        .single()
      if (profile) {
        setWorkerReady({
          bank: !!profile.bank_account?.account_number,
          tax: !!profile.tax_type,
        })
      }

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, status, worker_id, operator_id, price, scheduled_at,
          estimated_duration, is_urgent, special_instructions, checklist,
          spaces(id, name, type, address, address_detail, cleaning_tool_location, parking_guide, trash_guide, photos, location),
          users:worker_id(id, name, phone, profile_image, avg_rating)
        `)
        .eq('id', id)
        .single()
      if (error || !data) {
        setErr('작업을 찾을 수 없습니다.')
        setLoading(false)
        return
      }
      setJob(data as any)
      setChecklist(((data as any).checklist as ChecklistItem[]) ?? [])
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const isMine = !!userId && job?.worker_id === userId
  const isOpen = job?.status === 'OPEN'
  const flow = job ? STATUS_FLOW[job.status] : undefined

  const apply = async () => {
    if (!userId || !job) return
    setTransitioning(true)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ worker_id: userId, status: 'ASSIGNED', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'OPEN')
      if (error) throw error
      setJob((j) => (j ? { ...j, worker_id: userId, status: 'ASSIGNED' } : j))
      setShowConsent(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '신청 실패')
    }
    setTransitioning(false)
  }

  const advanceStatus = async () => {
    if (!job || !flow) return
    // ARRIVED: require GPS proximity verification (simple)
    if (job.status === 'EN_ROUTE') {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        })
        const coords = job.spaces?.location?.coordinates
        if (coords && coords.length === 2) {
          const km = haversineKm(pos.coords.latitude, pos.coords.longitude, coords[1], coords[0])
          if (km > 0.2) {
            setErr(`현장에서 약 ${km.toFixed(1)}km 떨어져 있어요. 현장 100m 이내에서 도착을 눌러주세요.`)
            return
          }
        }
      } catch {
        // ignore if user refused geolocation
      }
    }
    setTransitioning(true)
    try {
      const payload: Record<string, unknown> = { status: flow.next, updated_at: new Date().toISOString() }
      if (flow.next === 'IN_PROGRESS') payload.started_at = new Date().toISOString()
      if (flow.next === 'SUBMITTED') {
        const required = checklist.filter((c) => c.required)
        const notDone = required.filter((c) => !c.completed)
        if (notDone.length > 0) {
          setErr(`필수 체크리스트 ${notDone.length}개가 남아있어요.`)
          setTransitioning(false)
          return
        }
        payload.completed_at = new Date().toISOString()
        payload.checklist_completed = checklist
      }
      const { error } = await supabase.from('jobs').update(payload).eq('id', job.id)
      if (error) throw error

      // GPS 트레일 기록 (EN_ROUTE, ARRIVED 시)
      if (flow.next === 'EN_ROUTE' || flow.next === 'ARRIVED') {
        if (navigator.geolocation && userId) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              supabase.from('worker_locations').insert({
                job_id: job.id,
                worker_id: userId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              })
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 },
          )
        }
      }

      // SUBMITTED 시 AI 검수 호출
      if (flow.next === 'SUBMITTED') {
        fetch('/api/ai-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job.id,
            checklist_results: checklist,
          }),
        }).catch(() => {})
      }

      setJob((j) => (j ? { ...j, status: flow.next, ...(payload as any) } : j))
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '상태 변경 실패')
    }
    setTransitioning(false)
  }

  const toggleChecklist = (idx: number) => {
    setChecklist((list) => list.map((c, i) => (i === idx ? { ...c, completed: !c.completed } : c)))
    // also persist
    if (job) {
      const updated = checklist.map((c, i) => (i === idx ? { ...c, completed: !c.completed } : c))
      supabase.from('jobs').update({ checklist: updated }).eq('id', job.id)
    }
  }

  const openCamera = (idx: number) => {
    setCurrentChecklistIdx(idx)
    fileRef.current?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || currentChecklistIdx === null || !job) return
    setUploadingIdx(currentChecklistIdx)
    try {
      const path = `jobs/${job.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      const idx = currentChecklistIdx
      setChecklist((list) => {
        const next = list.map((c, i) => (i === idx ? { ...c, completed: true, photo_url: urlData.publicUrl } : c))
        supabase.from('jobs').update({ checklist: next }).eq('id', job.id)
        return next
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '사진 업로드 실패')
    } finally {
      setUploadingIdx(null)
      setCurrentChecklistIdx(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const openNaverDirections = () => {
    if (!job?.spaces) return
    const dest = encodeURIComponent(job.spaces.address)
    window.open(`https://map.naver.com/v5/search/${dest}`, '_blank')
  }

  if (loading) {
    return (
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="sseuksak-shell flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={40} className="text-warning mb-4" />
        <h2 className="h-section">작업을 찾을 수 없습니다</h2>
        <button className="btn btn-primary mt-5" onClick={() => router.back()}>돌아가기</button>
      </div>
    )
  }

  const durationMin = job.estimated_duration ?? 90
  const requiredCount = checklist.filter((c) => c.required).length
  const completedRequired = checklist.filter((c) => c.required && c.completed).length

  return (
    <div className="sseuksak-shell">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[14.5px] font-extrabold text-ink">작업 상세</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 pb-40">
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
              <Clock size={13} /> {formatScheduled(job.scheduled_at)} · {durationMin}분 소요
            </p>
            <p className="text-[13px] text-white/80 font-semibold mt-1 flex items-center gap-1.5">
              <MapPin size={13} /> {isMine ? job.spaces?.address : maskAddress(job.spaces?.address || '')}
              {job.spaces?.address_detail && isMine ? ` ${job.spaces.address_detail}` : ''}
            </p>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-white/60 font-bold">예상 정산</p>
                <p className="t-money text-[26px] text-brand-light">{formatKRW(Math.round(job.price * 0.88))}</p>
              </div>
              {isMine && (
                <button
                  onClick={openNaverDirections}
                  className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-white/15 text-white text-sm font-bold hover:bg-white/25"
                >
                  <Navigation size={15} /> 길찾기
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 -mt-4 relative z-10">
          {/* Contact host */}
          {isMine && job.status !== 'OPEN' && (
            <div className="card p-3 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-softer flex items-center justify-center text-brand-dark font-black">
                H
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-text-soft">공간 파트너 연락</p>
                <p className="text-[13px] font-extrabold text-ink">채팅 및 통화 가능</p>
              </div>
              <Link href={`/chat/${job.id}`} className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
                <MessageSquare size={17} className="text-ink-soft" />
              </Link>
              {job.users?.phone && (
                <a href={`tel:${job.users.phone}`} className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
                  <Phone size={17} />
                </a>
              )}
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

          {/* Onsite guide (once assigned) */}
          {isMine && (job.spaces?.cleaning_tool_location || job.spaces?.parking_guide || job.spaces?.trash_guide) && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-3">현장 안내</h3>
              <div className="flex flex-col gap-2.5">
                {job.spaces?.parking_guide && (
                  <GuideRow label="주차 안내" value={job.spaces.parking_guide} />
                )}
                {job.spaces?.cleaning_tool_location && (
                  <GuideRow label="청소도구 위치" value={job.spaces.cleaning_tool_location} />
                )}
                {job.spaces?.trash_guide && (
                  <GuideRow label="쓰레기 분리" value={job.spaces.trash_guide} />
                )}
              </div>
            </div>
          )}

          {/* Checklist (after arrived) */}
          {isMine && ['ARRIVED', 'IN_PROGRESS'].includes(job.status) && checklist.length > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13.5px] font-extrabold text-ink">체크리스트</h3>
                <span className="text-[12px] font-black text-brand-dark">
                  {completedRequired}/{requiredCount} 완료
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {checklist.map((c, i) => (
                  <li key={c.id} className={`p-3 rounded-xl border-2 ${c.completed ? 'bg-brand-softer border-brand/30' : 'bg-surface border-line-soft'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleChecklist(i)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition ${c.completed ? 'bg-brand text-white' : 'bg-surface-muted'}`}
                      >
                        {c.completed && <Check size={15} strokeWidth={3} />}
                      </button>
                      <div className="flex-1">
                        <p className="text-[13.5px] font-semibold text-ink leading-snug">
                          {c.label}
                          {c.required && <span className="ml-1.5 text-[10.5px] font-black text-danger">필수</span>}
                        </p>
                        {c.photo_url && (
                          <div className="mt-2">
                            <img src={c.photo_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-line-soft" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openCamera(i)}
                        disabled={uploadingIdx === i}
                        className="shrink-0 flex items-center gap-1 px-2.5 h-8 rounded-lg bg-surface text-text-muted text-xs font-bold border border-line-soft hover:bg-surface-muted"
                      >
                        {uploadingIdx === i ? <Loader2 size={12} className="animate-spin" /> : <Camera size={13} />}
                        {c.photo_url ? '변경' : '사진'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </div>
          )}

          {err && (
            <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/15 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[13px] font-bold text-danger leading-snug">{err}</p>
            </div>
          )}

          {/* Apply / status action */}
          {isOpen && (
            <div className="card p-4 mb-4">
              <h3 className="text-[13.5px] font-extrabold text-ink mb-2">이 작업에 지원하시겠어요?</h3>
              <p className="t-caption mb-4">지원하면 공간 파트너가 확인 후 배정합니다.</p>
              {workerReady && (!workerReady.bank || !workerReady.tax) ? (
                <div className="p-3.5 rounded-xl bg-warning-soft border border-warning/20 mb-3">
                  <p className="text-[12.5px] font-extrabold text-[#B45309] mb-1.5">정산 설정이 완료되지 않았어요</p>
                  <p className="text-[11.5px] font-semibold text-ink-soft mb-2 leading-snug">
                    작업 수행 전에 아래 항목을 먼저 등록해주세요. 정산이 지연되지 않도록 도와드려요.
                  </p>
                  <div className="flex gap-2">
                    {!workerReady.bank && (
                      <Link href="/profile/bank" className="flex-1 btn btn-primary !min-h-[40px] !text-xs">정산 계좌 등록</Link>
                    )}
                    {!workerReady.tax && (
                      <Link href="/profile/tax" className="flex-1 btn btn-secondary !min-h-[40px] !text-xs">세금 유형 선택</Link>
                    )}
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => setShowConsent(true)}
                disabled={workerReady ? (!workerReady.bank || !workerReady.tax) : false}
                className="btn btn-primary w-full"
              >
                지원하기 <Zap size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Report button (for in-progress/completed jobs the worker is assigned to) */}
          {isMine && ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].includes(job.status) && (
            <button
              onClick={() => setShowDispute(true)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-bold text-text-muted hover:text-danger"
            >
              <AlertTriangle size={14} /> 문제 신고하기
            </button>
          )}
        </div>
      </div>

      {/* Bottom action for in-progress work */}
      {isMine && flow && (
        <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
          <div className="max-w-[480px] mx-auto px-5 py-3.5">
            <button
              onClick={advanceStatus}
              disabled={transitioning}
              className="btn btn-primary w-full"
            >
              {transitioning ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <flow.icon size={18} strokeWidth={2.5} />
                  {flow.btnLabel}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Consent modal */}
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowConsent(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="h-section">작업 신청 동의</h3>
                <button onClick={() => setShowConsent(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <p className="t-caption mb-5">아래 사항을 확인하고 지원해주세요.</p>
              <ul className="flex flex-col gap-2.5 mb-5">
                {[
                  '본인은 프리랜서/개인사업자로 작업을 수행합니다',
                  '노쇼 시 1회 경고, 2회 계정 정지됩니다',
                  '체크리스트와 사진 인증을 필수로 완료합니다',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-brand shrink-0 mt-0.5" />
                    <span className="text-[13.5px] font-semibold text-ink-soft leading-snug">{t}</span>
                  </li>
                ))}
              </ul>
              <button onClick={apply} disabled={transitioning} className="btn btn-primary w-full">
                {transitioning ? <Loader2 size={20} className="animate-spin" /> : '동의하고 지원하기'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DisputeModal
        open={showDispute}
        onClose={() => setShowDispute(false)}
        jobId={job.id}
        onSubmitted={() => router.refresh()}
      />
    </div>
  )
}

function GuideRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-[13.5px] font-semibold text-ink leading-snug mt-0.5">{value}</p>
    </div>
  )
}
