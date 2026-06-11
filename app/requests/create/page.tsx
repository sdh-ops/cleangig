'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
  Clock,
  Building2,
  Sparkles,
  Check,
  AlertCircle,
  Calendar,
  MessageSquare,
  Plus,
  X,
  ListChecks,
} from 'lucide-react'
import { calculatePrice, suggestBasePrice, DEFAULT_FEES, type FeeSettings } from '@/lib/pricing'
import { getFeeSettings } from '@/lib/settings'
import { formatKRW, formatScheduled, spaceTypeLabel, rid } from '@/lib/utils'
import AccessCodesEditor, { makeAccessCode, type AccessCode } from '@/components/common/AccessCodesEditor'
import { Lock } from 'lucide-react'
import type { SpaceType, ChecklistItem } from '@/lib/types'

type EditableCheck = { id: string; label: string; required: boolean }

// 공간파트너가 요청 시 고르는 비품 — 워커는 이 중 고른 것만 상태 체크
const SUPPLY_OPTIONS = ['휴지', '물티슈', '종량제봉투', '주방세제', '핸드워시', '섬유유연제', '청소세제', '수세미', '키친타월', '일회용장갑']

type Space = {
  id: string
  name: string
  type: SpaceType
  address: string
  base_price: number
  size_sqm?: number
  checklist_template?: ChecklistItem[]
  access_codes?: { id?: string; label: string; value: string }[] | null
  entry_code?: string | null
  ical_url?: string | null
}

type CleaningSlot = { date: string; time: string | null; summary: string; dateOnly: boolean }

// 2화면 플로우: ① 어디를·언제 ② 확인(가격 크게 + 출입 비밀번호 + 결제)
// 난이도·가격조정·체크리스트·요청사항은 ②의 "자세히 설정" 접기 안으로.
type StepId = 1 | 2

export default function CreateRequestPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<StepId>(1)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceId, setSpaceId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [when, setWhen] = useState<'now' | 'schedule'>('now')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [durationChoice, setDurationChoice] = useState<number>(90) // 예상 소요(분)
  const [isUrgent, setIsUrgent] = useState(false)

  const [difficulty, setDifficulty] = useState<'쉬움' | '보통' | '어려움'>('보통')
  const [customPrice, setCustomPrice] = useState<number | null>(null) // null = 자동추천 사용
  const [instructions, setInstructions] = useState('')
  const [checklist, setChecklist] = useState<EditableCheck[]>([]) // 이번 청소용 (공간 템플릿에서 복제)
  const [newCheckItem, setNewCheckItem] = useState('')
  // 비품 체크 요청 — 고른 항목만 클린파트너가 상태 체크 (안 고르면 워커 화면에 비품 카드 미표시)
  const [supplyCheckItems, setSupplyCheckItems] = useState<string[]>([])
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY')
  const [occurrences, setOccurrences] = useState(4)
  const [showAdvanced, setShowAdvanced] = useState(false)
  // "이 청소 다시 요청" 프리필 — 이전 작업의 공간·체크리스트·요청사항 복사
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const [{ data: spaces }, feeSettings] = await Promise.all([
        supabase
          .from('spaces')
          .select('id, name, type, address, base_price, size_sqm, checklist_template, access_codes, entry_code, ical_url')
          .eq('operator_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        getFeeSettings(),
      ])
      setSpaces((spaces || []) as Space[])
      const params = new URLSearchParams(window.location.search)
      if (spaces && spaces.length > 0) {
        const paramSpaceId = params.get('space')
        const matched = spaces.find((s) => s.id === paramSpaceId)
        setSpaceId(matched ? matched.id : spaces[0].id)
      }
      // ?recurring=true → 일정 지정 모드만 pre-select (정기 결제 기능 준비 중이라 isRecurring 자동 활성화 안 함)
      if (params.get('recurring') === 'true') {
        setWhen('schedule')
      }
      // ?from={jobId} → "이 청소 다시 요청": 이전 작업 내용 복사, 날짜만 고르면 됨
      const fromJobId = params.get('from')
      if (fromJobId) {
        const { data: prevJob } = await supabase
          .from('jobs')
          .select('id, space_id, special_instructions, checklist, supply_check_items')
          .eq('id', fromJobId)
          .eq('operator_id', user.id)
          .maybeSingle()
        if (prevJob) {
          if (spaces?.some((s) => s.id === prevJob.space_id)) setSpaceId(prevJob.space_id)
          if (prevJob.special_instructions) setInstructions(prevJob.special_instructions)
          if (Array.isArray(prevJob.supply_check_items)) setSupplyCheckItems(prevJob.supply_check_items)
          if (Array.isArray(prevJob.checklist) && prevJob.checklist.length > 0) {
            prefillChecklistRef.current = prevJob.checklist
              .map((c: any) => ({ id: rid('ck'), label: String(c.label ?? ''), required: !!c.required }))
              .filter((c: EditableCheck) => c.label)
          }
          setPrefilledFrom(prevJob.id)
          setWhen('schedule')
        }
      }
      setFees(feeSettings)
      setLoadingSpaces(false)

      const d = new Date()
      d.setHours(d.getHours() + 2)
      setScheduledDate(d.toISOString().slice(0, 10))
      setScheduledTime(`${String(d.getHours()).padStart(2, '0')}:00`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedSpace = useMemo(() => spaces.find((s) => s.id === spaceId), [spaces, spaceId])

  // ─── iCal 예약 캘린더 → 예약 종료 후 청소 슬롯 ─────────────────────
  const [slots, setSlots] = useState<CleaningSlot[]>([])
  const [icalLoading, setIcalLoading] = useState(false)
  useEffect(() => {
    setSlots([])
    if (!selectedSpace?.ical_url) return
    let cancelled = false
    setIcalLoading(true)
    fetch(`/api/spaces/ical?space_id=${selectedSpace.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.ok) setSlots(d.slots ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIcalLoading(false) })
    return () => { cancelled = true }
  }, [selectedSpace?.id, selectedSpace?.ical_url])

  // 슬롯 선택 → 예약 종료 +60분 버퍼를 '청소 가능 시작'으로 (손님 퇴실 여유). 마감은 자동 제안되도록 비움
  const pickSlot = (slot: CleaningSlot) => {
    setWhen('schedule')
    if (slot.time) {
      const [h, m] = slot.time.split(':').map(Number)
      const total = h * 60 + m + 60 // +60분 버퍼
      const nextDay = total >= 24 * 60
      const t = total % (24 * 60)
      setScheduledTime(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
      // 버퍼가 자정을 넘기면 날짜도 +1
      if (nextDay) {
        const d = new Date(`${slot.date}T00:00:00`)
        d.setDate(d.getDate() + 1)
        setScheduledDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      } else {
        setScheduledDate(slot.date)
      }
    } else {
      setScheduledDate(slot.date)
      setScheduledTime('11:00') // 체크아웃형(날짜만): 오전 11시 기본
    }
    setEndTime('')
  }

  // ─── 출입 비밀번호 — 워커가 못 들어가는 사고 방지 ───────────────────
  // 갭(개편 전): 요청 생성이 access_codes를 조회조차 안 해서
  // 비밀번호 미등록 공간도 경고 없이 진행됐음.
  const hasAccessInfo = useMemo(() => {
    if (!selectedSpace) return false
    const codes = selectedSpace.access_codes ?? []
    return codes.some((c) => c.value?.trim()) || !!selectedSpace.entry_code?.trim()
  }, [selectedSpace])

  const [editCodes, setEditCodes] = useState<AccessCode[]>([])
  const [savingCodes, setSavingCodes] = useState(false)
  const [proceedWithoutCodes, setProceedWithoutCodes] = useState(false)

  // 공간 선택 시 해당 공간 체크리스트 템플릿을 이번 청소용으로 복제 (여기서 자유 수정 가능)
  const prefillChecklistRef = useRef<EditableCheck[] | null>(null)
  useEffect(() => {
    // 재요청 프리필이 대기 중이면 템플릿 대신 이전 작업 체크리스트 사용 (1회)
    if (prefillChecklistRef.current) {
      setChecklist(prefillChecklistRef.current)
      prefillChecklistRef.current = null
      return
    }
    const tpl = selectedSpace?.checklist_template ?? []
    setChecklist(
      tpl.map((c: any) => ({ id: rid('ck'), label: c.label, required: !!c.required })),
    )
    // 공간 바뀌면 비밀번호 입력/동의 상태 초기화
    setEditCodes([makeAccessCode()])
    setProceedWithoutCodes(false)
  }, [spaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 비밀번호를 공간에 저장 (이번 요청뿐 아니라 다음 요청에도 재사용)
  const saveAccessCodes = async () => {
    if (!selectedSpace) return
    const valid = editCodes.filter((c) => c.label.trim() && c.value.trim())
    if (valid.length === 0) {
      setErr('비밀번호를 입력해주세요. (예: 공동현관 1234)')
      return
    }
    setSavingCodes(true)
    setErr(null)
    const { error } = await supabase
      .from('spaces')
      .update({ access_codes: valid, updated_at: new Date().toISOString() })
      .eq('id', selectedSpace.id)
    setSavingCodes(false)
    if (error) {
      setErr('비밀번호 저장에 실패했어요. 다시 시도해주세요.')
      return
    }
    // 로컬 spaces 상태에도 반영 → hasAccessInfo 즉시 true
    setSpaces((list) => list.map((s) => (s.id === selectedSpace.id ? { ...s, access_codes: valid } : s)))
  }

  const [nowBase, setNowBase] = useState<string>('')
  useEffect(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 30)
    setNowBase(d.toISOString())
  }, [])

  const scheduledAt = useMemo(() => {
    if (when === 'now') return nowBase || new Date().toISOString()
    if (scheduledDate && scheduledTime) {
      return new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
    }
    return nowBase || new Date().toISOString()
  }, [when, scheduledDate, scheduledTime, nowBase])

  // 윈도우 모델: scheduledTime=청소 가능 시작, endTime=마감 시각(다음 예약 전), durationChoice=예상 소요(분)
  //  - 마감이 가능 시작보다 빠르거나 같으면 다음날 마감(자정 넘김)으로 해석
  //  - 마감 − 시작 == 소요 → 사실상 시간 고정 / 더 넓으면 워커가 그 안에서 자율 선택
  const isOvernight = when === 'schedule' && !!scheduledTime && !!endTime && endTime <= scheduledTime
  const scheduledEndAt = useMemo(() => {
    if (when !== 'schedule' || !scheduledDate || !scheduledTime || !endTime) return null
    const end = new Date(`${scheduledDate}T${endTime}:00`)
    if (endTime <= scheduledTime) end.setDate(end.getDate() + 1) // 자정 넘김
    return end.toISOString()
  }, [when, scheduledDate, scheduledTime, endTime])

  // 예상 소요시간(분) — 윈도우 폭과 별개. '지금 요청'은 기본 90분
  const durationMin = when === 'schedule' ? durationChoice : 90

  // 윈도우 폭(분). 소요보다 짧으면 무효(마감 안에 청소 못 끝냄)
  const windowMin = useMemo(() => {
    if (when !== 'schedule' || !scheduledEndAt) return 0
    return Math.round((new Date(scheduledEndAt).getTime() - new Date(scheduledAt).getTime()) / 60000)
  }, [when, scheduledAt, scheduledEndAt])
  const windowValid = when !== 'schedule' || (windowMin >= durationMin && windowMin <= 720)
  const isFlexible = when === 'schedule' && windowMin > durationMin + 15 // 여유 15분 이상이면 '시간대 자유'

  // 가능 시작 선택 시 마감을 (시작 + 소요)로 자동 제안 (마감이 비어있을 때만)
  useEffect(() => {
    if (!scheduledTime || endTime) return
    const [h, m] = scheduledTime.split(':').map(Number)
    const total = (h * 60 + m + durationChoice) % (24 * 60)
    setEndTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledTime])

  // 면적+난이도로 추천 기본가 산출 (요청마다 난이도 다르게 가능)
  const suggestedPrice = useMemo(() => {
    if (!selectedSpace) return 0
    const pyeong = selectedSpace.size_sqm ? selectedSpace.size_sqm / 3.3 : null
    let p = suggestBasePrice(selectedSpace.type, pyeong, difficulty)
    if (isUrgent || when === 'now') p += 10000 // 긴급 할증
    if (isRecurring) p = Math.round(p * 0.95 / 1000) * 1000 // 정기 할인 5%
    return Math.max(25000, p)
  }, [selectedSpace, difficulty, isUrgent, when, isRecurring])

  // 실제 가격 = 공간파트너가 조정했으면 그 값, 아니면 추천가
  const finalPrice = customPrice ?? suggestedPrice

  const priceBreakdown = useMemo(() => {
    if (!selectedSpace) return null
    // 최종가를 base로 넣고 추가 할증 없이 수수료/정산만 계산 (할증은 이미 suggestedPrice에 반영)
    return calculatePrice({
      base_price: finalPrice,
      space_type: selectedSpace.type,
      scheduled_at: scheduledAt,
      night_premium: false,
      fees,
    })
  }, [selectedSpace, finalPrice, scheduledAt, fees])

  const canProceed = (() => {
    if (step === 1) {
      if (!spaceId || !scheduledAt) return false
      // 예약 모드: 날짜·가능시작·마감 모두 + 마감이 소요시간 이상 확보
      if (when === 'schedule') return !!scheduledEndAt && windowValid
      return true
    }
    // 출입 방법이 있거나, "비밀번호 없이 진행"을 명시적으로 선택해야 결제 가능
    if (step === 2) return !!priceBreakdown && (hasAccessInfo || proceedWithoutCodes)
    return false
  })()

  const handleSubmit = async () => {
    if (!selectedSpace || !priceBreakdown) return
    // 과거 시각 예약 차단 (최소 30분 이후) — 서버도 검증하지만 친절한 안내 우선
    if (when === 'schedule' && scheduledAt && new Date(scheduledAt).getTime() < Date.now() + 30 * 60 * 1000) {
      setStep(1)
      setErr('예약 시간은 지금부터 최소 30분 이후로 선택해주세요.')
      return
    }
    setLoading(true)
    setErr(null)
    // '지금 요청'은 제출 시점 기준으로 재계산 — 페이지에 머무는 동안 nowBase(로드+30분)가
    // 낡아져 서버의 최소 30분 검증에 걸리는 문제 방지
    const effectiveScheduledAt = when === 'now'
      ? new Date(Date.now() + 35 * 60 * 1000).toISOString()
      : scheduledAt
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 고정 청소: 결제 없이 생성 (정기 요금은 별도 정산)
      if (isRecurring) {
        const res = await fetch('/api/jobs/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            space_id: selectedSpace.id,
            first_scheduled_at: effectiveScheduledAt,
            estimated_duration: durationMin,
            price: priceBreakdown.total,
            price_breakdown: priceBreakdown,
            checklist: checklist.map((c) => ({ ...c, completed: false })),
            special_instructions: instructions || null,
            frequency,
            occurrences,
            supply_check_items: supplyCheckItems,
          }),
        })
        const data = await res.json()
        if (!data?.ok) throw new Error(data?.error || '고정 청소 생성 실패')
        router.replace(data.first_job_id ? `/requests/${data.first_job_id}` : '/requests?tab=active')
        return
      }

      // 일반 청소: Toss 결제 플로우
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: selectedSpace.id,
          scheduled_at: effectiveScheduledAt,
          estimated_duration: durationMin,
          time_window_start: when === 'schedule' ? scheduledAt : null,
          time_window_end: scheduledEndAt,
          price: priceBreakdown.total,
          price_breakdown: priceBreakdown,
          checklist: checklist.map((c) => ({ ...c, completed: false })),
          special_instructions: instructions || null,
          is_urgent: isUrgent || when === 'now',
          is_recurring: false,
          supply_check_items: supplyCheckItems,
        }),
      })
      const orderData = await res.json()
      if (!orderData?.ok) {
        const errorMessages: Record<string, string> = {
          invalid_scheduled_at: '청소 시작 시간은 지금부터 최소 30분 이후여야 해요. 시간을 다시 선택해주세요.',
          invalid_price: '결제 금액이 올바르지 않아요. 페이지를 새로고침 후 다시 시도해주세요.',
          space_not_found: '공간 정보를 찾을 수 없어요. 공간이 삭제되지 않았는지 확인해주세요.',
          space_inactive: '비활성화된 공간이에요. 공간 설정에서 활성화 후 다시 요청해주세요.',
          missing_required_fields: '필수 정보가 누락됐어요. 공간과 시간을 다시 확인해주세요.',
        }
        throw new Error(errorMessages[orderData?.error] || '주문 생성에 실패했어요. 잠시 후 다시 시도해주세요.')
      }

      const params = new URLSearchParams({
        orderId: orderData.orderId,
        amount: String(orderData.amount),
        orderName: encodeURIComponent(orderData.orderName),
        customerName: encodeURIComponent(user.user_metadata?.name ?? ''),
      })
      router.replace(`/payment/checkout?${params.toString()}`)
    } catch (e) {
      setErr((e as any)?.message || '요청 생성에 실패했습니다.')
      setLoading(false)
    }
  }

  if (loadingSpaces) {
    return (
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    )
  }

  if (spaces.length === 0) {
    return (
      <div className="sseuksak-shell">
        <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted">
            <ChevronLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-[15px] font-extrabold">청소 요청</h1>
          <div className="w-10" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center mb-5">
            <Building2 size={28} />
          </div>
          <h2 className="h-section">등록된 공간이 없어요</h2>
          <p className="t-caption mt-2">먼저 청소를 요청할 공간을 등록해주세요.</p>
          <button onClick={() => router.push('/spaces/create')} className="btn btn-primary mt-6">
            공간 등록하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button
          onClick={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as StepId))}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted active:scale-95 transition"
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[16px] font-extrabold text-ink">청소 요청</h1>
          <p className="text-[13.5px] text-text-soft font-bold">{step === 1 ? '어디를, 언제' : '확인하고 결제'} · {step}/2</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-5 pt-4 pb-1 bg-surface">
        <div className="flex gap-1.5">
          {[1, 2].map((n) => (
            <div key={n} className={`flex-1 h-2 rounded-full ${n <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-6 pb-32">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {prefilledFrom && (
                <div className="p-3.5 rounded-2xl bg-brand-softer border border-brand/20 flex items-center gap-2.5">
                  <Check size={18} className="text-brand-dark shrink-0" strokeWidth={3} />
                  <p className="text-[15px] font-bold text-brand-dark">지난 청소 내용을 그대로 가져왔어요. 날짜만 고르면 돼요!</p>
                </div>
              )}
              <div>
                <h2 className="h-title text-ink">어느 공간을 청소할까요?</h2>
                <p className="t-caption mt-1.5">공간을 선택하면 자동으로 체크리스트가 적용돼요.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {spaces.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpaceId(s.id)}
                    className={`card-interactive p-4 flex items-center gap-3 text-left !border-2 ${spaceId === s.id ? '!border-brand bg-brand-softer' : ''}`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-brand-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14.5px] font-extrabold text-ink truncate">{s.name}</h4>
                      <p className="text-[13.5px] text-text-soft font-bold truncate mt-0.5">
                        {spaceTypeLabel(s.type)} · {s.address.split(' ').slice(0, 3).join(' ')}
                      </p>
                    </div>
                    {spaceId === s.id && <Check size={20} className="text-brand shrink-0" strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <h2 className="h-title text-ink">언제 청소할까요?</h2>
              </div>

              {/* iCal 예약 캘린더 → 예약 종료 후 청소 슬롯 빠른 선택 */}
              {selectedSpace?.ical_url && (icalLoading || slots.length > 0) && (
                <div className="rounded-2xl border-2 border-brand/20 bg-brand-softer p-3.5">
                  <p className="text-[14px] font-extrabold text-brand-dark flex items-center gap-1.5 mb-2">
                    <Calendar size={15} strokeWidth={2.6} /> 예약 종료 후 청소 잡기
                  </p>
                  {icalLoading ? (
                    <p className="text-[14px] font-bold text-text-soft">예약 캘린더를 불러오는 중…</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {slots.slice(0, 8).map((s) => {
                        const d = new Date(`${s.date}T00:00:00`)
                        const dLabel = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                        const active = when === 'schedule' && scheduledDate === s.date && (scheduledTime === (s.time ?? '11:00'))
                        return (
                          <button
                            key={`${s.date}-${s.time ?? 'd'}`}
                            onClick={() => pickSlot(s)}
                            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 border-2 text-left transition ${active ? 'border-brand bg-white' : 'border-transparent bg-white/70'}`}
                          >
                            <span className="text-[15px] font-extrabold text-ink">{dLabel}</span>
                            <span className="text-[13px] font-bold text-brand-dark">
                              {s.dateOnly ? '체크아웃' : `${s.time} 종료 후`}
                            </span>
                          </button>
                        )
                      })}
                      <p className="text-[13px] text-text-soft font-medium mt-0.5 ml-0.5">선택하면 종료 시각이 시작 시간으로 들어가요. 아래에서 조정 가능.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setWhen('now')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${when === 'now' ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${when === 'now' ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
                    <Zap size={18} strokeWidth={2.6} />
                  </div>
                  <h4 className="text-[14px] font-extrabold text-ink">지금 요청</h4>
                  <p className="text-[13px] font-bold text-text-soft mt-0.5">
                    {nowBase ? new Date(nowBase).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }) + ' 시작' : '30분 후 시작'}
                  </p>
                  <p className="text-[13.5px] font-black text-danger mt-0.5">긴급 수수료 +10,000원</p>
                </button>
                <button
                  onClick={() => setWhen('schedule')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${when === 'schedule' ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${when === 'schedule' ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
                    <Calendar size={18} strokeWidth={2.6} />
                  </div>
                  <h4 className="text-[14px] font-extrabold text-ink">날짜/시간 예약</h4>
                  <p className="text-[13.5px] text-text-soft font-bold mt-0.5">원하는 시간 지정</p>
                </button>
              </div>

              {when === 'schedule' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="req-date" className="t-meta block mb-2 ml-1">날짜</label>
                    <input id="req-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="input" min={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="req-start" className="t-meta block mb-2 ml-1">청소 가능 시작</label>
                      <input id="req-start" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input" step={1800} />
                    </div>
                    <div>
                      <label htmlFor="req-end" className="t-meta block mb-2 ml-1">마감 (다음 예약 전)</label>
                      <input id="req-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" step={1800} />
                    </div>
                  </div>

                  {/* 예상 소요시간 — 윈도우 폭과 별개 */}
                  <div>
                    <label className="t-meta block mb-2 ml-1">예상 소요시간</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { m: 60, l: '1시간' },
                        { m: 90, l: '1시간 반' },
                        { m: 120, l: '2시간' },
                        { m: 180, l: '3시간' },
                      ].map((opt) => (
                        <button
                          key={opt.m}
                          onClick={() => setDurationChoice(opt.m)}
                          aria-pressed={durationChoice === opt.m}
                          className={`h-11 rounded-xl text-[14px] font-extrabold border-2 transition ${durationChoice === opt.m ? 'border-brand bg-brand-softer text-brand-dark' : 'border-line-soft bg-surface text-text-muted'}`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {scheduledEndAt && !windowValid && (
                    <p className="text-[14px] font-bold text-danger ml-1">
                      마감까지 시간이 예상 소요({Math.floor(durationMin / 60) > 0 ? `${Math.floor(durationMin / 60)}시간 ` : ''}{durationMin % 60 > 0 ? `${durationMin % 60}분` : ''})보다 짧아요. 마감을 늦추거나 소요를 줄여주세요.
                    </p>
                  )}
                  {scheduledEndAt && windowValid && (
                    <div className="rounded-xl bg-surface-muted px-3.5 py-3 -mt-1">
                      {isFlexible ? (
                        <p className="text-[14px] font-bold text-ink leading-relaxed">
                          🕒 이 시간대 안에서 <span className="text-brand-dark">클린파트너가 시간을 정해</span> 청소해요 (약 {Math.floor(durationMin / 60) > 0 ? `${Math.floor(durationMin / 60)}시간 ` : ''}{durationMin % 60 > 0 ? `${durationMin % 60}분` : ''} 소요)
                          {isOvernight && <span className="text-brand-dark"> · 마감 다음날</span>}
                        </p>
                      ) : (
                        <p className="text-[14px] font-bold text-ink leading-relaxed">
                          ⏱ 약 {Math.floor(durationMin / 60) > 0 ? `${Math.floor(durationMin / 60)}시간 ` : ''}{durationMin % 60 > 0 ? `${durationMin % 60}분` : ''} 소요 예정 (시간 거의 고정)
                          {isOvernight && <span className="text-brand-dark"> · 마감 다음날</span>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {when === 'schedule' && !isUrgent && (
                <button onClick={() => setIsUrgent(true)} className="card-interactive p-3.5 flex items-center gap-3 border-line-soft">
                  <div className="w-8 h-8 rounded-full bg-sun-soft text-[#92580C] flex items-center justify-center">
                    <Zap size={15} strokeWidth={2.6} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[15px] font-extrabold text-ink">긴급 요청으로 변경</p>
                    <p className="text-[13.5px] text-text-soft font-bold">+10,000원 · 마스터 클린파트너 우선 배정</p>
                  </div>
                  <ChevronRight size={16} className="text-text-faint" />
                </button>
              )}

              {when === 'schedule' && isUrgent && (
                <div className="card p-3.5 bg-sun-soft border border-sun/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sun text-ink flex items-center justify-center">
                    <Zap size={15} strokeWidth={2.6} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-extrabold text-ink">긴급 요청 활성화</p>
                    <p className="text-[13.5px] text-ink-soft font-bold">+10,000원 · 우선 매칭</p>
                  </div>
                  <button onClick={() => setIsUrgent(false)} className="text-[14.5px] font-bold text-text-muted">해제</button>
                </div>
              )}

              {/* Recurring cleaning toggle — 결제·회차 매칭 모델 확정 전까지 비활성 (준비 중) */}
              {when === 'schedule' && (
                <div className="card p-3.5 border-2 border-line-soft opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-muted text-text-muted">
                      <Calendar size={15} strokeWidth={2.6} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-extrabold text-ink flex items-center gap-1.5">
                        고정 청소로 예약
                        <span className="text-[12px] font-bold text-text-faint bg-surface-muted px-1.5 py-0.5 rounded-full">준비 중</span>
                      </p>
                      <p className="text-[13.5px] text-text-soft font-bold">정기 결제 기능 준비 중이에요. 우선 단건으로 예약해주세요.</p>
                    </div>
                    <div className="w-11 h-6 rounded-full flex items-center px-0.5 bg-line-strong justify-start">
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                  {false && (
                    <div className="mt-3 pt-3 border-t border-brand/15 grid grid-cols-2 gap-3">
                      <div>
                        <label className="t-meta block mb-1.5 ml-0.5">반복 주기</label>
                        <div className="flex gap-1">
                          {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFrequency(f)}
                              className={`flex-1 h-9 rounded-lg text-[13.5px] font-extrabold ${frequency === f ? 'bg-ink text-white' : 'bg-surface text-text-muted'}`}
                            >
                              {f === 'WEEKLY' ? '매주' : f === 'BIWEEKLY' ? '2주' : '매월'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="t-meta block mb-1.5 ml-0.5">반복 횟수</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={occurrences}
                            onChange={(e) => setOccurrences(Math.max(1, Math.min(12, parseInt(e.target.value) || 4)))}
                            className="input !min-h-[40px] !py-2 pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint text-xs font-bold">회</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedSpace && priceBreakdown && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">이대로 진행할까요?</h2>
                <p className="t-caption mt-1.5">내용을 확인하고 결제하면 끝이에요.</p>
              </div>

              <div className="card p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-softer flex items-center justify-center">
                  <Sparkles size={18} className="text-brand-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[16px] font-extrabold text-ink truncate">{selectedSpace.name}</h4>
                  <p className="text-[14.5px] text-text-soft font-bold truncate mt-0.5 flex items-center gap-1">
                    <Clock size={13} />
                    {when === 'schedule' && scheduledEndAt
                      ? `${formatScheduled(scheduledAt)} ~ ${new Date(scheduledEndAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}${isFlexible ? ' 사이' : ''}`
                      : formatScheduled(scheduledAt)}
                  </p>
                  {when === 'schedule' && (
                    <p className="text-[13.5px] text-text-faint font-bold truncate flex items-center gap-1 mt-0.5">
                      {isFlexible ? '이 시간대 안에서 청소' : '예정 시간 청소'} · 약 {Math.floor(durationMin / 60) > 0 ? `${Math.floor(durationMin / 60)}시간 ` : ''}{durationMin % 60 > 0 ? `${durationMin % 60}분` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[14.5px] font-bold text-brand-dark underline shrink-0"
                >
                  변경
                </button>
              </div>

              {/* 결제 금액 — 가장 크게, 한눈에 */}
              <div className="card-rich p-5 text-center">
                <p className="text-[14.5px] font-bold text-text-soft">결제 금액 (VAT 포함)</p>
                <p className="t-amount text-[40px] text-ink mt-1.5 leading-none">
                  {formatKRW(priceBreakdown.total)}
                </p>
                <p className="text-[14px] font-bold text-text-faint mt-2.5">
                  {difficulty} 난이도 기준 자동 계산 · 아래 &lsquo;자세히 설정&rsquo;에서 조정할 수 있어요
                </p>
              </div>

              {/* 출입 비밀번호 — 클린파트너가 들어갈 수 있는지 확인 */}
              {hasAccessInfo ? (
                <div className="card p-4 border border-success/25 bg-success-soft/40">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
                      <Lock size={15} />
                    </div>
                    <p className="text-[14px] font-extrabold text-ink flex-1">출입 비밀번호 등록됨</p>
                    <button
                      type="button"
                      onClick={() => router.push(`/spaces/${selectedSpace.id}/edit`)}
                      className="text-[14.5px] font-bold text-brand-dark underline"
                    >
                      수정
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 pl-10">
                    {(selectedSpace.access_codes ?? []).filter((c) => c.value?.trim()).map((c, i) => (
                      <p key={i} className="text-[15px] font-bold text-ink-soft">
                        {c.label} · ••••
                      </p>
                    ))}
                    {(selectedSpace.access_codes ?? []).filter((c) => c.value?.trim()).length === 0 &&
                      selectedSpace.entry_code?.trim() && (
                        <p className="text-[15px] font-bold text-ink-soft">출입문 · ••••</p>
                      )}
                  </div>
                  <p className="text-[14.5px] text-text-soft font-semibold mt-2 pl-10">
                    배정된 클린파트너에게만 보여요.
                  </p>
                </div>
              ) : (
                <div className="card p-4 border-2 border-sun/40 bg-sun-soft">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-sun/20 text-[#92580C] flex items-center justify-center shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14.5px] font-extrabold text-ink leading-snug">
                        출입 방법이 등록되지 않았어요
                      </p>
                      <p className="text-[14.5px] text-ink-soft font-semibold mt-1 leading-relaxed">
                        비밀번호가 없으면 클린파트너가 못 들어가요. 지금 등록해 두면 다음 요청에도 자동으로 쓰여요.
                      </p>
                    </div>
                  </div>
                  <AccessCodesEditor codes={editCodes} onChange={setEditCodes} />
                  <button
                    type="button"
                    onClick={saveAccessCodes}
                    disabled={savingCodes}
                    className="btn btn-primary w-full mt-3 !min-h-[48px]"
                  >
                    {savingCodes ? <Loader2 size={18} className="animate-spin" /> : '비밀번호 저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProceedWithoutCodes((v) => !v)}
                    className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-bold transition ${
                      proceedWithoutCodes
                        ? 'bg-ink text-white'
                        : 'text-text-muted underline'
                    }`}
                  >
                    {proceedWithoutCodes && <Check size={15} strokeWidth={3} />}
                    비밀번호 없이 진행할게요 (문이 열려 있거나 직접 열어줄 거예요)
                  </button>
                </div>
              )}

              {/* 자세히 설정 — 난이도·가격조정·체크리스트·요청사항 (기본 접힘) */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="card-interactive p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-muted text-text-muted flex items-center justify-center shrink-0">
                  <ListChecks size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[16px] font-extrabold text-ink">자세히 설정</p>
                  <p className="text-[14px] text-text-soft font-bold mt-0.5">난이도 · 가격 조정 · 체크리스트 · 요청사항</p>
                </div>
                <ChevronRight size={18} className={`text-text-faint transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>

              {showAdvanced && (
              <>
              {/* 난이도 */}
              <div>
                <label className="t-meta block mb-2 ml-1">청소 난이도</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['쉬움', '보통', '어려움'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDifficulty(d); setCustomPrice(null) }}
                      className={`rounded-xl border-2 p-3 text-[15px] font-extrabold transition ${difficulty === d ? 'border-brand bg-brand-softer text-brand-dark' : 'border-line-soft bg-surface text-text-muted'}`}
                    >
                      {d === '쉬움' ? '🟢 쉬움' : d === '보통' ? '🟡 보통' : '🔴 어려움'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 스마트 가격 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="t-meta ml-1">청소 가격</label>
                  {customPrice === null
                    ? <span className="text-[13px] font-bold text-brand-dark bg-brand-softer px-2 py-0.5 rounded-full">자동 추천</span>
                    : <button onClick={() => setCustomPrice(null)} className="text-[13px] font-bold text-text-muted underline">추천가로 되돌리기</button>}
                </div>
                <div className="card p-4 bg-surface-soft">
                  <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => setCustomPrice(Math.max(25000, finalPrice - 1000))}
                      className="w-10 h-10 rounded-full border-2 border-line-strong flex items-center justify-center text-xl font-black text-ink hover:bg-surface-muted active:scale-95">−</button>
                    <p className="t-money text-[28px] text-ink">{finalPrice.toLocaleString()}원</p>
                    <button type="button" onClick={() => setCustomPrice(finalPrice + 1000)}
                      className="w-10 h-10 rounded-full border-2 border-line-strong flex items-center justify-center text-xl font-black text-ink hover:bg-surface-muted active:scale-95">+</button>
                  </div>
                  <input type="range" min={25000} max={150000} step={1000} value={finalPrice}
                    onChange={(e) => setCustomPrice(parseInt(e.target.value))} className="w-full accent-brand" />
                  <div className="flex justify-between text-[13px] text-text-faint font-bold mt-1">
                    <span>최소 2.5만</span><span>최대 15만</span>
                  </div>
                </div>
              </div>

              {/* 이번 청소 체크리스트 (공간 템플릿에서 복제 → 자유 수정) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="t-meta ml-1 flex items-center gap-1.5">
                    <ListChecks size={13} /> 이번 청소 체크리스트
                  </label>
                  <span className="text-[13px] font-bold text-text-faint">{checklist.length}개 · 이번 요청만 적용</span>
                </div>
                <div className="flex flex-col gap-2">
                  {checklist.map((item) => (
                    <div key={item.id} className="card p-3 flex items-center gap-2.5">
                      <input
                        value={item.label}
                        onChange={(e) =>
                          setChecklist((list) => list.map((c) => (c.id === item.id ? { ...c, label: e.target.value } : c)))
                        }
                        className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-ink min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setChecklist((list) => list.map((c) => (c.id === item.id ? { ...c, required: !c.required } : c)))
                        }
                        className={`chip ${item.required ? 'chip-brand' : 'chip-muted'} !text-[13px] px-2 py-0.5 shrink-0`}
                      >
                        {item.required ? '필수' : '선택'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChecklist((list) => list.filter((c) => c.id !== item.id))}
                        className="text-text-faint hover:text-danger transition p-0.5 shrink-0"
                        aria-label="삭제"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      placeholder="항목 추가 (예: 냉장고 내부 정리)"
                      className="input flex-1 !min-h-[46px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCheckItem.trim()) {
                          setChecklist((l) => [...l, { id: rid('ck'), label: newCheckItem.trim(), required: false }])
                          setNewCheckItem('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!newCheckItem.trim()}
                      onClick={() => {
                        setChecklist((l) => [...l, { id: rid('ck'), label: newCheckItem.trim(), required: false }])
                        setNewCheckItem('')
                      }}
                      className="btn btn-secondary !min-h-[46px] !px-4 shrink-0"
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 비품 체크 요청 — 고른 항목만 클린파트너가 청소 중 상태 체크 */}
              <div>
                <label className="t-meta block mb-1 ml-1">비품 확인 요청 (선택)</label>
                <p className="text-[13.5px] text-text-soft font-semibold mb-2.5 ml-1 leading-snug">
                  떨어지면 곤란한 비품을 골라주세요. 클린파트너가 청소하면서 남은 양을 체크해 알려줘요. 안 고르면 비품 확인은 생략돼요.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUPPLY_OPTIONS.map((name) => {
                    const on = supplyCheckItems.includes(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setSupplyCheckItems((list) =>
                            on ? list.filter((s) => s !== name) : [...list, name],
                          )
                        }
                        className={`px-3.5 py-2 rounded-full text-[15px] font-bold border-2 transition active:scale-95 ${
                          on
                            ? 'bg-brand-softer border-brand text-brand-dark'
                            : 'bg-surface border-line-soft text-text-muted'
                        }`}
                      >
                        {on && <Check size={14} className="inline -mt-0.5 mr-1" strokeWidth={3} />}
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="t-meta mb-2 ml-1 flex items-center gap-1.5">
                  <MessageSquare size={12} /> 특별 요청사항
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="예) 침대 시트 교체 부탁드려요"
                  className="input min-h-[90px]"
                  rows={3}
                />
              </div>

              <div className="card p-4">
                <h4 className="text-[15px] font-extrabold text-ink mb-3">가격 상세</h4>
                <div className="flex flex-col gap-2">
                  {priceBreakdown.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-[15px]">
                      <span className={`font-semibold ${it.kind === 'sub' ? 'text-brand-dark' : 'text-text-muted'}`}>{it.label}</span>
                      <span className={`t-money ${it.kind === 'sub' ? 'text-brand-dark' : 'text-ink'}`}>
                        {it.kind === 'sub' ? '-' : ''}{formatKRW(Math.abs(it.amount))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[15px] font-bold text-text-soft">결제 금액 (VAT 포함)</span>
                  <span className="t-money text-[22px] text-ink">{formatKRW(priceBreakdown.total)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-line-soft text-[13.5px] text-text-soft font-bold space-y-1">
                  <div className="flex justify-between">
                    <span>공간파트너 수수료 ({Math.round(fees.host_fee_rate * 100 * 10) / 10}%)</span>
                    <span>{formatKRW(priceBreakdown.host_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>클린파트너 수수료 ({Math.round(fees.worker_fee_rate * 100 * 10) / 10}%)</span>
                    <span>{formatKRW(priceBreakdown.worker_fee)}</span>
                  </div>
                  <div className="flex justify-between text-brand-dark">
                    <span>클린파트너 예상 수령 (프리랜서 기준)</span>
                    <span>{formatKRW(priceBreakdown.estimated_worker_payout)}</span>
                  </div>
                </div>
              </div>
              </>
              )}

              <div className="p-4 rounded-2xl bg-brand-softer border border-brand/15 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-brand-dark shrink-0 mt-0.5" />
                <div className="text-[14.5px] text-brand-dark font-semibold leading-snug">
                  <b>안전 결제</b>: 청소 완료 후 공간파트너가 승인하면 클린파트너에게 자동 정산됩니다.
                </div>
              </div>
            </div>
          )}

        {err && <div className="mt-4 p-3 bg-danger-soft rounded-xl text-[15px] font-bold text-danger">{err}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          {step === 2 && priceBreakdown && (
            <div className="flex items-baseline justify-between mb-2.5 px-1">
              <span className="text-[14.5px] font-bold text-text-soft">결제 금액</span>
              <span className="t-money text-[18px] text-ink">{formatKRW(priceBreakdown.total)}</span>
            </div>
          )}
          <button
            onClick={step === 2 ? handleSubmit : () => setStep(2)}
            disabled={!canProceed || loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === 2 ? (
              isRecurring
                ? <>고정 청소 신청하기 <ChevronRight size={20} /></>
                : <>결제하고 요청하기 <ChevronRight size={20} /></>
            ) : (
              <>다음 <ChevronRight size={20} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}