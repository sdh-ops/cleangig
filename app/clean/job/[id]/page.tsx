'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useJobRealtime, type JobRealtimeRow } from '@/lib/useJobRealtime'
import Link from 'next/link'
import {
  ChevronLeft,
  Home,
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
  Star,
  Plus,
  ImageIcon,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react'
import StatusChip from '@/components/common/StatusChip'
import StatusStepper from '@/components/common/StatusStepper'
import DisputeModal from '@/components/common/DisputeModal'
import ReviewModal from '@/components/common/ReviewModal'
import { formatKRW, formatScheduled, spaceTypeLabel, maskAddress, haversineKm } from '@/lib/utils'
import { notify } from '@/lib/notifications'
import { toast } from '@/lib/toast'
import { openNaverRoute, searchNaverAddress } from '@/lib/naver'
import { getPosition, startTracking, getCachedFix, type GeoErrorReason } from '@/lib/geolocation'
import LocationPermissionGate from '@/components/common/LocationPermissionGate'
import type { ChecklistItem, JobStatus, SpaceType } from '@/lib/types'

type SupplyLevel = 'low' | 'out'
type SupplyStatusItem = { name: string; level: SupplyLevel }
type ExtraChargeStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'

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
  supply_shortages?: string[] | null
  supply_status?: SupplyStatusItem[] | null
  supply_check_items?: string[] | null
  extra_charge_amount?: number | null
  extra_charge_reason?: string | null
  extra_charge_status?: ExtraChargeStatus | null
  extra_charge_photos?: string[] | null
  price_breakdown?: { estimated_worker_payout?: number } | null
  spaces?: {
    id: string
    name: string
    type: SpaceType
    address: string
    address_detail?: string
    entry_code?: string
    access_codes?: { label: string; value: string }[]
    caution_notes?: string
    cleaning_tool_location?: string
    parking_guide?: string
    trash_guide?: string
    photos?: string[]
    location?: { coordinates?: [number, number] } | null
  }
  users?: { id: string; name: string; phone?: string; profile_image?: string; avg_rating?: number } | null
}

const STATUS_FLOW: Partial<Record<JobStatus, { next: JobStatus; label: string; btnLabel: string; icon: typeof Navigation }>> = {
  ASSIGNED: { next: 'EN_ROUTE', label: '배정 완료', btnLabel: '출발했어요', icon: Navigation },
  EN_ROUTE: { next: 'ARRIVED', label: '이동 중', btnLabel: '도착했어요', icon: MapPin },
  ARRIVED: { next: 'IN_PROGRESS', label: '도착', btnLabel: '청소 시작', icon: Sparkles },
  IN_PROGRESS: { next: 'SUBMITTED', label: '청소 중', btnLabel: '다 끝났어요', icon: CheckCircle2 },
}

const SUPPLY_OPTIONS = ['휴지', '물티슈', '종량제봉투', '주방세제', '핸드워시', '섬유유연제', '청소세제', '수세미', '키친타월', '일회용장갑']

/** 완료 사진 최소 장수 — 전체 공간 + 세부 사진을 마지막에 한번에 */
const MIN_COMPLETION_PHOTOS = 5

const LEVEL_LABELS: Record<SupplyLevel, string> = {
  low: '거의 다 씀',
  out: '없음',
}

const LEVEL_COLORS: Record<SupplyLevel, string> = {
  low: 'bg-sun-soft text-[#92580C] border-sun/40',
  out: 'bg-danger-soft text-danger border-danger/30',
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
  const [supplyStatus, setSupplyStatus] = useState<SupplyStatusItem[]>([])
  const [showConsent, setShowConsent] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showExtraCharge, setShowExtraCharge] = useState(false)
  const extraPhotoRef = useRef<HTMLInputElement>(null)
  const [workerReady, setWorkerReady] = useState<{ bank: boolean; tax: boolean } | null>(null)
  const [codeRevealed, setCodeRevealed] = useState(false)
  // 위치 권한 거부/실패 상태 — 안내 카드 노출용
  const [geoDenied, setGeoDenied] = useState<GeoErrorReason | null>(null)
  // 위치 확인 없이 도착 처리 확인 다이얼로그
  const [showUnverifiedArrival, setShowUnverifiedArrival] = useState(false)

  // 완료 증거 사진 (SUBMITTED 전 최소 1장 필수)
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([])
  const [uploadingCompletion, setUploadingCompletion] = useState(false)
  const completionPhotoRef = useRef<HTMLInputElement>(null)

  // Extra charge state
  const [extraAmount, setExtraAmount] = useState('')
  const [extraReason, setExtraReason] = useState('')
  const [extraPhotos, setExtraPhotos] = useState<string[]>([])
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const [submittingExtra, setSubmittingExtra] = useState(false)

  // 이동·작업 중 위치 공유 — watchPosition 1개 (권한 프롬프트 1회), DB 쓰기는 45초 스로틀.
  // 기존 setInterval+getCurrentPosition 패턴은 일부 안드로이드에서 프롬프트가 반복되던 원인.
  useEffect(() => {
    if (!job || !userId || job.worker_id !== userId) return
    if (!['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status)) return

    const stop = startTracking(
      (fix) => {
        supabase
          .from('worker_locations')
          .insert({ job_id: job.id, worker_id: userId, lat: fix.lat, lng: fix.lng })
          .then(({ error }) => {
            // 위치 기록 실패는 작업 진행을 막지 않음 — 콘솔에만 남김
            if (error) console.warn('[worker_locations] insert 실패:', error.message)
          })
      },
      (reason) => setGeoDenied(reason),
      { throttleMs: 45_000 },
    )
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, userId, job?.id])

  const fetchJob = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, status, worker_id, operator_id, price, scheduled_at,
        estimated_duration, is_urgent, special_instructions, checklist, supply_shortages,
        supply_status, supply_check_items, extra_charge_status, extra_charge_amount, extra_charge_reason, extra_charge_photos,
        price_breakdown,
        spaces(id, name, type, address, address_detail, entry_code, access_codes, caution_notes, cleaning_tool_location, parking_guide, trash_guide, photos, location),
        users:operator_id(id, name, phone, profile_image, avg_rating)
      `)
      .eq('id', id)
      .single()
    if (error || !data) {
      setErr('작업을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    const fetched = data as unknown as JobFull
    setJob(fetched)
    setChecklist(fetched.checklist ?? [])
    setSupplyStatus(fetched.supply_status ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    ;(async () => {
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

      await fetchJob()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 실시간 상태 반영 — 사장님 승인·분쟁·추가청구 결정이 새로고침 없이 보임
  useJobRealtime(id, {
    onUpdate: (row: JobRealtimeRow) => {
      // join(spaces/users)은 payload에 없음 → 기존 상태에 병합.
      // checklist/supply 로컬 편집 상태는 클로버 방지 위해 realtime 병합에서 제외.
      setJob((j) => {
        if (!j) return j
        const { checklist: _c, supply_status: _s, ...rest } = row
        return { ...j, ...rest } as JobFull
      })
    },
    refetch: fetchJob,
  })

  const isMine = !!userId && job?.worker_id === userId
  const isOpen = job?.status === 'OPEN'
  const flow = job ? STATUS_FLOW[job.status] : undefined

  // 도착하면 비밀번호 자동 펼침 — 문 앞에서 탭 한 번 더 시키지 않기
  useEffect(() => {
    if (job?.status === 'ARRIVED') setCodeRevealed(true)
  }, [job?.status])

  // 출입 비밀번호 카드 — ARRIVED일 땐 첫 번째 카드 + 큰 글자, 그 외엔 기존 위치
  const renderAccessCodes = () => {
    if (!job || !isMine) return null
    const isArrived = job.status === 'ARRIVED'
    const rawCodes = (job.spaces?.access_codes as { label: string; value: string }[] | null) || []
    const codes = rawCodes.length > 0
      ? rawCodes.filter((c) => c?.value)
      : job.spaces?.entry_code
        ? [{ label: '출입문', value: job.spaces.entry_code }]
        : []
    if (codes.length === 0) return null
    return (
      <div className="card p-4 mb-4 border-2 border-brand/30 bg-brand-softer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🔑</span>
            <h3 className="text-[15px] font-extrabold text-ink">출입 방법 / 비밀번호</h3>
          </div>
          <button
            onClick={() => setCodeRevealed((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-brand text-white text-[15px] font-extrabold active:scale-95 transition"
          >
            {codeRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
            {codeRevealed ? '숨기기' : '모두 보기'}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {codes.map((c, i) => (
            <div key={i} className="bg-white/70 rounded-xl px-4 py-3 border border-brand/15 flex items-center justify-between gap-3">
              <span className="text-[15px] font-extrabold text-brand-dark shrink-0">{c.label}</span>
              <p
                className={`${isArrived ? 'text-[28px]' : 'text-[17px]'} font-extrabold leading-relaxed text-right flex-1 ${
                  codeRevealed ? 'tracking-wide text-ink' : 'tracking-[0.25em] text-text-soft select-none'
                }`}
              >
                {codeRevealed ? c.value : '● ● ● ●'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[14.5px] font-semibold text-brand-dark mt-2.5">
          ⚠ 이 정보는 배정된 클린파트너 본인에게만 공개됩니다. 외부 유출 금지
        </p>
      </div>
    )
  }

  const apply = async () => {
    if (!userId || !job) return
    setTransitioning(true)
    try {
      // claim_job: 서버측 원자적 배정 — 동시 지원 시 한 명만 성공 (postgres function)
      const { data: claimed, error } = await supabase.rpc('claim_job', { p_job_id: job.id })
      if (error) throw error
      if (!claimed) {
        setErr('이미 다른 클린파트너가 배정된 작업입니다.')
        setTransitioning(false)
        return
      }
      setJob((j) => (j ? { ...j, worker_id: userId, status: 'ASSIGNED' } : j))
      setShowConsent(false)
      // 공간파트너에게 배정 알림
      notify({
        userId: job.operator_id,
        title: '클린파트너가 배정됐어요!',
        message: `${job.spaces?.name ?? '작업'}에 클린파트너가 배정됐습니다. 예약 시간에 방문 예정이에요.`,
        url: `/requests/${job.id}`,
        type: 'job_assigned',
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '신청 실패')
    }
    setTransitioning(false)
  }

  const advanceStatus = async (opts?: { skipArrivalCheck?: boolean }) => {
    if (!job || !flow) return
    let arrivalUnverified = false
    if (job.status === 'EN_ROUTE' && !opts?.skipArrivalCheck) {
      // 추적 중이라 캐시가 신선함 — 추가 프롬프트 없이 검증
      const pos = await getPosition({ maxAgeMs: 30_000, timeoutMs: 10_000 })
      if (pos.ok) {
        const coords = job.spaces?.location?.coordinates
        if (coords && coords.length === 2) {
          const km = haversineKm(pos.lat, pos.lng, coords[1], coords[0])
          if (km > 0.2) {
            setErr(`현장에서 약 ${km.toFixed(1)}km 떨어져 있어요. 현장 100m 이내에서 도착을 눌러주세요.`)
            return
          }
        }
      } else {
        // 기존엔 침묵 통과 → 이제 명시적 확인 (위치 없이 도착 처리할지)
        setGeoDenied(pos.reason)
        setShowUnverifiedArrival(true)
        return
      }
    }
    if (opts?.skipArrivalCheck) arrivalUnverified = true
    setTransitioning(true)
    try {
      const payload: Record<string, unknown> = { status: flow.next, updated_at: new Date().toISOString() }
      if (arrivalUnverified && flow.next === 'ARRIVED') payload.arrival_unverified = true
      if (flow.next === 'IN_PROGRESS') payload.started_at = new Date().toISOString()
      if (flow.next === 'SUBMITTED') {
        const required = checklist.filter((c) => c.required)
        const notDone = required.filter((c) => !c.completed)
        if (notDone.length > 0) {
          setErr(`필수 체크리스트 ${notDone.length}개가 남아있어요.`)
          setTransitioning(false)
          return
        }
        // 완료 사진 최소 5장 필수 (전체 + 세부)
        if (completionPhotos.length < MIN_COMPLETION_PHOTOS) {
          setErr(`청소 완료 사진을 최소 ${MIN_COMPLETION_PHOTOS}장 올려주세요. (전체 공간 + 세부)`)
          setTransitioning(false)
          return
        }
        payload.completed_at = new Date().toISOString()
        payload.checklist_completed = checklist
        payload.completion_photos = completionPhotos
        // 비품 상태도 최종 저장
        if (supplyStatus.length > 0) {
          payload.supply_status = supplyStatus
          payload.supply_shortages = supplyStatus.map((s) => s.name)
        }
      }
      const { error } = await supabase.from('jobs').update(payload).eq('id', job.id)
      if (error) throw error

      if (flow.next === 'EN_ROUTE' || flow.next === 'ARRIVED') {
        // 추적(watchPosition)이 곧 시작/진행 중 — 캐시 좌표만 기록, 추가 프롬프트 없음
        const cached = getCachedFix()
        if (cached && userId) {
          supabase
            .from('worker_locations')
            .insert({ job_id: job.id, worker_id: userId, lat: cached.lat, lng: cached.lng })
            .then(({ error }) => {
              if (error) console.warn('[worker_locations] insert 실패:', error.message)
            })
        }
      }

      // 상태별 공간파트너 알림
      if (flow.next === 'EN_ROUTE') {
        notify({
          userId: job.operator_id,
          title: '클린파트너가 출발했어요 🚶',
          message: `${job.spaces?.name ?? '작업'}으로 클린파트너가 이동 중입니다.`,
          url: `/requests/${job.id}`,
          type: 'job_en_route',
        })
      }

      if (flow.next === 'ARRIVED') {
        notify({
          userId: job.operator_id,
          title: '클린파트너가 현장에 도착했어요 📍',
          message: `${job.spaces?.name ?? '작업'}에 클린파트너가 도착했습니다.`,
          url: `/requests/${job.id}`,
          type: 'job_arrived',
        })
      }

      if (flow.next === 'IN_PROGRESS') {
        notify({
          userId: job.operator_id,
          title: '청소를 시작했어요 🧹',
          message: `${job.spaces?.name ?? '작업'} 청소가 시작됐습니다.`,
          url: `/requests/${job.id}`,
          type: 'job_in_progress',
        })
      }

      if (flow.next === 'SUBMITTED') {
        fetch('/api/ai-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: job.id, checklist_results: checklist }),
        }).catch(() => {})

        // 공간파트너에게 완료 알림
        notify({
          userId: job.operator_id,
          title: '청소가 완료됐어요! 확인 후 승인해주세요.',
          message: `${job.spaces?.name ?? '작업'} 청소가 완료됐습니다. 사진 확인 후 승인해주세요.`,
          url: `/requests/${job.id}`,
          type: 'job_submitted',
        })
        if (supplyStatus.length > 0) {
          notify({
            userId: job.operator_id,
            title: '부족한 비품이 있어요',
            message: `${supplyStatus.map((s) => `${s.name}(${LEVEL_LABELS[s.level]})`).join(', ')} 보충이 필요합니다.`,
            url: `/requests/${job.id}`,
            type: 'supply_shortage',
          })
        }
      }

      setJob((j) => (j ? { ...j, status: flow.next, ...(payload as any) } : j))
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '상태 변경 실패')
    }
    setTransitioning(false)
  }

  const toggleChecklist = (idx: number) => {
    if (!job) return
    const updated = checklist.map((c, i) => (i === idx ? { ...c, completed: !c.completed } : c))
    setChecklist(updated)
    supabase.from('jobs').update({ checklist: updated }).eq('id', job.id)
      .then(({ error }) => {
        if (error) toast('체크 저장에 실패했어요. 인터넷 연결을 확인해주세요.', 'error')
      })
  }

  // supply_status 2레벨 사이클: none → low → out → none
  const cycleSupply = (name: string) => {
    if (!job) return
    setSupplyStatus((prev) => {
      const existing = prev.find((s) => s.name === name)
      let next: SupplyStatusItem[]
      if (!existing) {
        next = [...prev, { name, level: 'low' }]
      } else if (existing.level === 'low') {
        next = prev.map((s) => (s.name === name ? { ...s, level: 'out' as SupplyLevel } : s))
      } else {
        next = prev.filter((s) => s.name !== name)
      }
      supabase.from('jobs').update({ supply_status: next, supply_shortages: next.map((s) => s.name) }).eq('id', job.id)
        .then(({ error }) => {
          if (error) toast('비품 상태 저장에 실패했어요. 다시 시도해주세요.', 'error')
        })
      return next
    })
  }

  const handleExtraPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !job) return
    setUploadingExtra(true)
    try {
      const path = `jobs/${job.id}/extra-${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      setExtraPhotos((prev) => [...prev, urlData.publicUrl])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '사진 업로드 실패')
    } finally {
      setUploadingExtra(false)
      if (extraPhotoRef.current) extraPhotoRef.current.value = ''
    }
  }

  const handleCompletionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !job) return
    setUploadingCompletion(true)
    try {
      // 한번에 여러 장 선택 가능 — 순차 업로드 후 모아서 추가
      const uploaded: string[] = []
      for (const file of files) {
        const path = `jobs/${job.id}/completion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`
        const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
        uploaded.push(urlData.publicUrl)
      }
      setCompletionPhotos((prev) => [...prev, ...uploaded])
    } catch (e) {
      setErr(e instanceof Error ? e.message : '사진 업로드 실패')
    } finally {
      setUploadingCompletion(false)
      if (completionPhotoRef.current) completionPhotoRef.current.value = ''
    }
  }

  const submitExtraCharge = async () => {
    if (!job || !userId) return
    const amount = parseInt(extraAmount.replace(/[^0-9]/g, ''), 10)
    if (!amount || amount < 1000) {
      setErr('추가 청구 금액은 1,000원 이상이어야 합니다.')
      return
    }
    if (!extraReason.trim()) {
      setErr('추가 청구 사유를 입력해주세요.')
      return
    }
    setSubmittingExtra(true)
    setErr(null)
    try {
      const { error } = await supabase.from('jobs').update({
        extra_charge_amount: amount,
        extra_charge_reason: extraReason.trim(),
        extra_charge_status: 'REQUESTED',
        extra_charge_photos: extraPhotos,
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)
      if (error) throw error
      setJob((j) => j ? {
        ...j,
        extra_charge_amount: amount,
        extra_charge_reason: extraReason.trim(),
        extra_charge_status: 'REQUESTED',
        extra_charge_photos: extraPhotos,
      } : j)
      setShowExtraCharge(false)
      // 공간파트너에게 알림
      notify({
        userId: job.operator_id,
        title: '추가 청구 요청이 왔어요',
        message: `${job.spaces?.name ?? '작업'}에 ${formatKRW(amount)} 추가 청구 요청이 있습니다. 확인 후 승인/거절해주세요.`,
        url: `/requests/${job.id}`,
        type: 'extra_charge_requested',
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '추가 청구 요청 실패')
    } finally {
      setSubmittingExtra(false)
    }
  }

  const openNaverDirections = () => {
    if (!job?.spaces) return
    const coords = job.spaces.location?.coordinates
    if (coords && coords.length === 2) {
      openNaverRoute({ lat: coords[1], lng: coords[0], name: job.spaces.name })
    } else {
      // 좌표 없으면 주소 검색 fallback
      searchNaverAddress(job.spaces.address)
    }
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
  // 공간파트너가 요청 시 고른 비품만 체크 — 안 골랐으면 비품 카드 미표시
  const requestedSupplies = Array.isArray(job.supply_check_items) ? job.supply_check_items : []
  const completedRequired = checklist.filter((c) => c.required && c.completed).length
  const extraStatus = job.extra_charge_status ?? 'NONE'

  return (
    <div className="sseuksak-shell">
      <header className="sticky top-0 z-20 glass border-b border-line-soft safe-top">
        <div className="flex items-center h-14 px-3">
          <div className="flex items-center gap-0.5">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
              <ChevronLeft size={22} />
            </button>
            <Link href="/clean" aria-label="홈" className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-muted">
              <Home size={16} className="text-text-soft" />
            </Link>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[14.5px] font-extrabold text-ink">작업 상세</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 pb-40">
        {/* Hero */}
        <div className="relative bg-ink text-white px-5 pt-5 pb-8">
          <div className="absolute -top-10 -right-8 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <StatusChip kind="job" status={job.status} />
              {job.is_urgent && <span className="chip chip-danger !text-[13px]">긴급</span>}
            </div>
            <div className="chip chip-brand !text-[13px] mb-2">
              {spaceTypeLabel(job.spaces?.type || 'other')}
            </div>
            <h2 className="text-[22px] font-black leading-tight">{job.spaces?.name}</h2>
            <p className="text-[15px] text-white/80 font-semibold mt-2 flex items-center gap-1.5">
              <Clock size={13} /> {formatScheduled(job.scheduled_at)} · {durationMin}분 소요
            </p>
            <p className="text-[15px] text-white/80 font-semibold mt-1 flex items-center gap-1.5">
              <MapPin size={13} /> {isMine ? job.spaces?.address : maskAddress(job.spaces?.address || '')}
              {job.spaces?.address_detail && isMine ? ` ${job.spaces.address_detail}` : ''}
            </p>
            <div className="mt-5">
              <p className="text-[13.5px] text-white/60 font-bold">예상 수령 (세금 3.3% 차감)</p>
              <p className="t-money text-[26px] text-brand-light">{formatKRW(job.price_breakdown?.estimated_worker_payout ?? Math.round(job.price * 0.80 * 0.967))}</p>
            </div>
          </div>
        </div>

        <div className="px-5 -mt-4 relative z-10">
          {/* 진행 현황 — 사용자용 5단계 */}
          {isMine && (
            <div className="card p-4 mb-4">
              <StatusStepper status={job.status} role="worker" />
            </div>
          )}

          {/* 도착 직후엔 출입 비밀번호가 첫 번째 — 문 앞에서 바로 보이게 */}
          {job.status === 'ARRIVED' && renderAccessCodes()}

          {/* 지도 네비게이션 카드 — 출발 전(배정·이동 중)에만 표시. 도착/청소 중엔 숨김 */}
          {isMine && (job.status === 'ASSIGNED' || job.status === 'EN_ROUTE') && job.spaces?.address && (
            <div className="card p-4 mb-4">
              <h3 className="text-[15px] font-extrabold text-ink mb-3 flex items-center gap-2">
                <MapPin size={17} className="text-brand-dark" />
                현장으로 출발하기
              </h3>
              <p className="text-[15px] text-text-soft font-semibold mb-3 leading-snug">{job.spaces.address}{job.spaces.address_detail ? ` ${job.spaces.address_detail}` : ''}</p>
              <button
                onClick={openNaverDirections}
                className="w-full flex items-center justify-center gap-2 h-13 py-3.5 rounded-xl font-extrabold text-[15px] text-white active:scale-95 transition"
                style={{ background: '#03C75A' }}
              >
                <Navigation size={18} strokeWidth={2.5} />
                네이버지도로 출발
              </button>
            </div>
          )}

          {/* Contact host */}
          {isMine && job.status !== 'OPEN' && (
            <div className="card p-3 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-softer flex items-center justify-center text-brand-dark font-black">
                {job.users?.name?.charAt(0) ?? 'H'}
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-bold text-text-soft">공간파트너 연락</p>
                <p className="text-[15px] font-extrabold text-ink">채팅 및 통화 가능</p>
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
                <span className="text-[14.5px] font-black text-[#92580C] uppercase tracking-wide">특별 요청사항</span>
              </div>
              <p className="text-[15px] font-semibold text-ink leading-snug">{job.special_instructions}</p>
            </div>
          )}

          {/* 출입 안내 — ARRIVED일 땐 위(별도 렌더)에서 이미 표시 */}
          {job.status !== 'ARRIVED' && renderAccessCodes()}

          {/* 주의사항 (caution_notes) */}
          {isMine && job.spaces?.caution_notes && (
            <div className="card p-4 mb-4 bg-sun-soft border border-sun/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-[#92580C]" />
                <span className="text-[14px] font-black text-[#92580C]">공간 주의사항</span>
              </div>
              <p className="text-[15px] font-semibold text-ink leading-relaxed whitespace-pre-wrap">
                {job.spaces.caution_notes}
              </p>
            </div>
          )}

          {/* Onsite guide */}
          {isMine && (job.spaces?.cleaning_tool_location || job.spaces?.parking_guide || job.spaces?.trash_guide) && (
            <div className="card p-4 mb-4">
              <h3 className="text-[15px] font-extrabold text-ink mb-3">현장 안내</h3>
              <div className="flex flex-col gap-2.5">
                {job.spaces?.parking_guide && <GuideRow icon="🚗" label="주차 안내" value={job.spaces.parking_guide} />}
                {job.spaces?.cleaning_tool_location && <GuideRow icon="🧽" label="청소도구 위치" value={job.spaces.cleaning_tool_location} />}
                {job.spaces?.trash_guide && <GuideRow icon="🗑" label="쓰레기 분리" value={job.spaces.trash_guide} />}
              </div>
            </div>
          )}

          {/* Checklist — 청소 시작(IN_PROGRESS) 후부터. 도착 화면은 비밀번호·주의사항에 집중 */}
          {isMine && job.status === 'IN_PROGRESS' && checklist.length > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-extrabold text-ink">체크리스트</h3>
                <span className="text-[14.5px] font-black text-brand-dark">
                  {completedRequired}/{requiredCount} 완료
                </span>
              </div>
              <p className="text-[14px] text-text-soft font-semibold mb-3 leading-snug">
                항목을 누르면 체크돼요. 사진은 청소가 다 끝난 뒤 아래에서 한번에 올리면 돼요.
              </p>
              <ul className="flex flex-col gap-2.5">
                {checklist.map((c, i) => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggleChecklist(i)}
                      className={`w-full p-3.5 rounded-xl border-2 flex items-center gap-3 text-left transition active:scale-[0.99] ${c.completed ? 'bg-brand-softer border-brand/30' : 'bg-surface border-line-soft'}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition ${c.completed ? 'bg-brand text-white' : 'bg-surface-muted'}`}
                      >
                        {c.completed && <Check size={17} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-[16px] font-semibold text-ink leading-snug">
                        {c.label}
                        {c.required && <span className="ml-2 text-[14.5px] font-black text-danger">필수</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 비품 상태 2레벨 체크 */}
          {/* 완료 증거 사진 (IN_PROGRESS 상태에서 업로드, SUBMITTED 전 필수) */}
          {isMine && job.status === 'IN_PROGRESS' && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[15px] font-extrabold text-ink">완료 사진</h3>
                <span className={`text-[13px] font-black px-2.5 py-1 rounded-full ${completionPhotos.length >= MIN_COMPLETION_PHOTOS ? 'text-emerald-700 bg-emerald-50' : 'text-danger bg-danger-soft'}`}>
                  {completionPhotos.length}/{MIN_COMPLETION_PHOTOS}장
                </span>
              </div>
              <p className="text-[14px] text-text-soft font-semibold mb-3 leading-snug">
                청소 다 끝나면 <b className="text-ink">전체 공간 사진 + 잘 닦인 곳 세부 사진</b>을 합쳐서 최소 {MIN_COMPLETION_PHOTOS}장 올려주세요. 한번에 여러 장 선택해도 돼요.
              </p>
              <input
                ref={completionPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleCompletionPhotoUpload}
              />
              <div className="flex gap-2 flex-wrap mb-3">
                {completionPhotos.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-line-soft" />
                    <button
                      onClick={() => setCompletionPhotos((p) => p.filter((_, j) => j !== i))}
                      aria-label="사진 삭제"
                      className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => completionPhotoRef.current?.click()}
                  disabled={uploadingCompletion}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-text-faint hover:border-brand hover:text-brand-dark transition"
                >
                  {uploadingCompletion ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} /><span className="text-[14px] font-bold">사진 추가</span></>}
                </button>
              </div>
              {completionPhotos.length > 0 && completionPhotos.length < MIN_COMPLETION_PHOTOS && (
                <p className="text-[14px] font-bold text-danger flex items-center gap-1">
                  <AlertTriangle size={13} /> {MIN_COMPLETION_PHOTOS - completionPhotos.length}장 더 올려주세요
                </p>
              )}
              {completionPhotos.length >= MIN_COMPLETION_PHOTOS && (
                <p className="text-[14px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {completionPhotos.length}장 업로드 완료
                </p>
              )}
            </div>
          )}

          {isMine && job.status === 'IN_PROGRESS' && requestedSupplies.length > 0 && (
            <div className="card p-4 mb-4">
              <h3 className="text-[15px] font-extrabold text-ink mb-1">비품 상태 체크</h3>
              <p className="text-[14px] text-text-soft font-semibold mb-3 leading-snug">
                공간파트너가 확인을 요청한 비품이에요. 남은 양에 따라 눌러주세요.
              </p>
              <div className="flex items-center gap-2 mb-3 text-[14px] font-semibold flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-sun-soft text-[#92580C] border border-sun/30 font-bold">1번 탭: 거의 다 씀</span>
                <span className="px-2.5 py-1 rounded-full bg-danger-soft text-danger border border-danger/20 font-bold">2번 탭: 없음</span>
                <span className="px-2.5 py-1 rounded-full bg-surface text-text-muted border border-line-soft font-bold">3번 탭: 정상</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {requestedSupplies.map((name) => {
                  const item = supplyStatus.find((s) => s.name === name)
                  const colorClass = item ? LEVEL_COLORS[item.level] : 'bg-surface text-text-muted border-line-soft hover:border-line-strong'
                  return (
                    <button
                      key={name}
                      onClick={() => cycleSupply(name)}
                      aria-pressed={!!item}
                      className={`px-3 py-1.5 rounded-full text-[14.5px] font-bold border transition ${colorClass}`}
                    >
                      {item && <span className="mr-1 text-[13px]">{'●'}</span>}
                      {name}
                      {item && <span className="ml-1 text-[13px]">{LEVEL_LABELS[item.level]}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 추가 청구 */}
          {isMine && ['IN_PROGRESS', 'SUBMITTED'].includes(job.status) && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[15px] font-extrabold text-ink">추가 청구</h3>
                {extraStatus === 'NONE' && (
                  <button
                    onClick={() => setShowExtraCharge((v) => !v)}
                    className="flex items-center gap-1 px-3 h-7 rounded-full bg-brand-softer text-brand-dark text-[13.5px] font-bold border border-brand/20"
                  >
                    <Plus size={12} /> 요청
                  </button>
                )}
              </div>

              {extraStatus === 'NONE' && !showExtraCharge && (
                <p className="text-[14.5px] text-text-soft font-medium leading-snug">
                  예상보다 심한 오염·처리 추가 비용이 발생하면 공간파트너에게 승인 요청할 수 있어요.
                </p>
              )}

              {extraStatus === 'NONE' && showExtraCharge && (
                <div className="flex flex-col gap-3 mt-2">
                  <div>
                    <label className="t-meta block mb-1">추가 금액</label>
                    <input
                      type="number"
                      value={extraAmount}
                      onChange={(e) => setExtraAmount(e.target.value)}
                      placeholder="예: 15000"
                      className="input"
                      min={1000}
                      step={1000}
                    />
                  </div>
                  <div>
                    <label className="t-meta block mb-1">사유</label>
                    <textarea
                      value={extraReason}
                      onChange={(e) => setExtraReason(e.target.value)}
                      placeholder="예: 심한 기름때로 인한 추가 세제 및 시간 소요"
                      className="input min-h-[72px]"
                      rows={2}
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="t-meta block mb-1">증거 사진 (선택)</label>
                    <div className="flex flex-wrap gap-2">
                      {extraPhotos.map((url, i) => (
                        <div key={i} className="relative w-16 h-16">
                          <img src={url} alt="" className="w-full h-full rounded-lg object-cover border border-line-soft" />
                          <button
                            onClick={() => setExtraPhotos((p) => p.filter((_, j) => j !== i))}
                            aria-label="사진 삭제"
                            className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {extraPhotos.length < 4 && (
                        <button
                          onClick={() => extraPhotoRef.current?.click()}
                          disabled={uploadingExtra}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-line-strong flex flex-col items-center justify-center gap-1 text-text-faint"
                        >
                          {uploadingExtra ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={16} />}
                          <span className="text-[13px] font-bold">추가</span>
                        </button>
                      )}
                    </div>
                    <input ref={extraPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleExtraPhotoUpload} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowExtraCharge(false)} className="flex-1 btn btn-ghost !text-sm">취소</button>
                    <button onClick={submitExtraCharge} disabled={submittingExtra} className="flex-1 btn btn-primary !text-sm">
                      {submittingExtra ? <Loader2 size={16} className="animate-spin" /> : '요청 보내기'}
                    </button>
                  </div>
                </div>
              )}

              {extraStatus === 'REQUESTED' && (
                <div className="mt-1 p-3 rounded-xl bg-sun-soft border border-sun/20">
                  <p className="text-[14.5px] font-bold text-[#92580C]">
                    승인 대기 중 · {formatKRW(job.extra_charge_amount ?? 0)}
                  </p>
                  <p className="text-[13.5px] text-text-soft mt-0.5">{job.extra_charge_reason}</p>
                </div>
              )}
              {extraStatus === 'APPROVED' && (
                <div className="mt-1 p-3 rounded-xl bg-brand-softer border border-brand/20">
                  <p className="text-[14.5px] font-bold text-brand-dark">
                    ✅ 승인됨 · {formatKRW(job.extra_charge_amount ?? 0)} 추가 정산 예정
                  </p>
                </div>
              )}
              {extraStatus === 'REJECTED' && (
                <div className="mt-1 p-3 rounded-xl bg-danger-soft border border-danger/20">
                  <p className="text-[14.5px] font-bold text-danger">거절됨</p>
                  <p className="text-[13.5px] text-text-soft mt-0.5">{job.extra_charge_reason}</p>
                </div>
              )}
            </div>
          )}

          {err && (
            <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/15 mb-4 flex items-start gap-2">
              <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-[15px] font-bold text-danger leading-snug">{err}</p>
            </div>
          )}

          {/* Apply */}
          {isOpen && (
            <div className="card p-4 mb-4">
              <h3 className="text-[15px] font-extrabold text-ink mb-2">이 작업에 지원하시겠어요?</h3>
              <p className="t-caption mb-4">지원하면 바로 배정돼요. 예약 시간에 맞춰 현장으로 방문해주세요.</p>
              {workerReady && (!workerReady.bank || !workerReady.tax) ? (
                <div className="p-3 rounded-xl bg-info-soft border border-info/15 mb-3">
                  <p className="text-[13.5px] font-semibold text-ink-soft leading-snug">
                    💡 지금 바로 지원할 수 있어요. <b>정산 받기 전</b>까지만{' '}
                    {!workerReady.bank && <Link href="/profile/bank" className="text-brand-dark underline font-bold">계좌</Link>}
                    {(!workerReady.bank && !workerReady.tax) && ' · '}
                    {!workerReady.tax && <Link href="/profile/tax" className="text-brand-dark underline font-bold">세금 유형</Link>}
                    {' '}등록하면 됩니다.
                  </p>
                </div>
              ) : null}
              <button onClick={() => setShowConsent(true)} className="btn btn-primary w-full">
                지원하기 <Zap size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Review prompt */}
          {isMine && ['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && job.operator_id && (
            <div className="card p-4 mb-4 bg-brand-softer border border-brand/15">
              <div className="flex items-center gap-3 mb-3">
                <Star size={18} className="text-brand-dark" fill="currentColor" />
                <p className="text-[15px] font-extrabold text-ink">공간파트너를 평가해주세요</p>
              </div>
              <p className="text-[14.5px] font-semibold text-text-soft mb-3 leading-snug">
                안내 정확도, 소통, 작업 환경에 대한 솔직한 리뷰가 다른 클린파트너에게 큰 도움이 됩니다.
              </p>
              <button onClick={() => setShowReview(true)} className="btn btn-secondary w-full !text-sm">
                <Star size={15} /> 리뷰 남기기
              </button>
            </div>
          )}

          {/* Report */}
          {isMine && ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].includes(job.status) && (
            <button
              onClick={() => setShowDispute(true)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-3 text-[14.5px] font-bold text-text-muted hover:text-danger"
            >
              <AlertTriangle size={14} /> 문제 신고하기
            </button>
          )}
        </div>
      </div>

      {/* 위치 권한 거부 안내 — 이동·작업 중에만 */}
      {isMine && geoDenied && ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
        <div className="pb-24">
          <LocationPermissionGate reason={geoDenied} />
        </div>
      )}

      {/* 위치 확인 없이 도착 처리 확인 */}
      {showUnverifiedArrival && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center"
          onClick={() => setShowUnverifiedArrival(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="h-section mb-2">위치를 확인할 수 없어요</h3>
            <p className="text-[15px] text-text-muted leading-relaxed mb-5">
              위치 권한이 꺼져 있어 현장 도착을 확인할 수 없어요.
              <br />
              위치 확인 없이 도착 처리할까요? (사장님에게 &quot;위치 미확인&quot;으로 표시될 수 있어요)
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowUnverifiedArrival(false)
                  advanceStatus({ skipArrivalCheck: true })
                }}
                className="btn btn-primary w-full"
              >
                네, 도착했어요
              </button>
              <button
                onClick={() => setShowUnverifiedArrival(false)}
                className="btn btn-ghost w-full"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action */}
      {isMine && flow && (
        <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
          <div className="max-w-[480px] mx-auto px-5 py-3.5">
            {err && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-danger-soft border border-danger/20 flex items-start gap-2">
                <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
                <p className="text-[14.5px] font-bold text-danger leading-snug">{err}</p>
              </div>
            )}
            <button onClick={() => advanceStatus()} disabled={transitioning} className="btn btn-primary w-full">
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
        {showConsent && (
          <div
            className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center"
            onClick={() => setShowConsent(false)}
          >
            <div
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
              <ul className="flex flex-col gap-2.5 mb-4">
                {[
                  '본인은 프리랜서/개인사업자로 작업을 수행합니다',
                  '노쇼 시: 1회 경고 → 2회 30일 정지 → 3회 영구 계정 정지',
                  '노쇼 발생 시 해당 건 수익은 지급되지 않습니다.',
                  '체크리스트와 사진 인증을 필수로 완료합니다',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-brand shrink-0 mt-0.5" />
                    <span className="text-[15px] font-semibold text-ink-soft leading-snug">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2.5 rounded-xl bg-info-soft border border-info/20 mb-4">
                <p className="text-[13.5px] font-semibold text-ink-soft leading-snug">
                  💳 신규 클린파트너 보증금 <b>5,000원</b>이 첫 작업 수락 시 자동 차감되며, 활동 종료 시 전액 환불됩니다.
                </p>
              </div>
              <div className="px-3 py-2.5 rounded-xl bg-danger-soft border border-danger/15 mb-5">
                <p className="text-[13.5px] font-semibold text-danger leading-snug">
                  ⚠️ 예약 24시간 이내 취소 또는 노쇼 시 보증금 5,000원이 차감됩니다.
                </p>
              </div>
              <button onClick={apply} disabled={transitioning} className="btn btn-primary w-full">
                {transitioning ? <Loader2 size={20} className="animate-spin" /> : '동의하고 지원하기'}
              </button>
            </div>
          </div>
        )}

      {job.operator_id && (
        <ReviewModal
          open={showReview}
          onClose={() => { setShowReview(false); router.refresh() }}
          onSubmitted={() => setShowReview(false)}
          jobId={job.id}
          revieweeId={job.operator_id}
          revieweeName={job.spaces?.name ?? '공간파트너'}
          reviewType="worker_to_operator"
        />
      )}

      <DisputeModal
        open={showDispute}
        onClose={() => setShowDispute(false)}
        jobId={job.id}
        onSubmitted={() => router.refresh()}
      />
    </div>
  )
}

function GuideRow({ icon, label, value }: { icon?: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      {icon && <span className="text-[20px] mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="text-[14.5px] font-black text-text-soft mb-0.5">{label}</p>
        <p className="text-[15px] font-semibold text-ink leading-relaxed whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  )
}
