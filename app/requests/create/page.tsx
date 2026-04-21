'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { calculatePrice, DEFAULT_FEES, type FeeSettings } from '@/lib/pricing'
import { getFeeSettings } from '@/lib/settings'
import { formatKRW, formatScheduled, spaceTypeLabel } from '@/lib/utils'
import type { SpaceType, ChecklistItem } from '@/lib/types'

type Space = {
  id: string
  name: string
  type: SpaceType
  address: string
  base_price: number
  size_sqm?: number
  checklist_template?: ChecklistItem[]
}

type StepId = 1 | 2 | 3

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
  const [isUrgent, setIsUrgent] = useState(false)

  const [extraTrash, setExtraTrash] = useState(false)
  const [heavySoil, setHeavySoil] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY')
  const [occurrences, setOccurrences] = useState(4)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const [{ data: spaces }, feeSettings] = await Promise.all([
        supabase
          .from('spaces')
          .select('id, name, type, address, base_price, size_sqm, checklist_template')
          .eq('operator_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        getFeeSettings(),
      ])
      setSpaces((spaces || []) as Space[])
      if (spaces && spaces.length > 0) setSpaceId(spaces[0].id)
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

  const scheduledAt = useMemo(() => {
    if (when === 'now') {
      const d = new Date()
      d.setMinutes(d.getMinutes() + 30)
      return d.toISOString()
    }
    if (scheduledDate && scheduledTime) {
      return new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
    }
    return new Date().toISOString()
  }, [when, scheduledDate, scheduledTime])

  const priceBreakdown = useMemo(() => {
    if (!selectedSpace) return null
    return calculatePrice({
      base_price: selectedSpace.base_price,
      space_type: selectedSpace.type,
      size_sqm: selectedSpace.size_sqm,
      scheduled_at: scheduledAt,
      is_urgent: isUrgent || when === 'now',
      extra_trash: extraTrash,
      has_heavy_soil: heavySoil,
      recurring_discount: isRecurring,
      fees,
    })
  }, [selectedSpace, scheduledAt, isUrgent, when, extraTrash, heavySoil, isRecurring, fees])

  const canProceed = (() => {
    if (step === 1) return !!spaceId
    if (step === 2) return !!scheduledAt
    if (step === 3) return !!priceBreakdown
    return false
  })()

  const handleSubmit = async () => {
    if (!selectedSpace || !priceBreakdown) return
    setLoading(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 고정 청소 분기
      if (isRecurring) {
        const res = await fetch('/api/jobs/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            space_id: selectedSpace.id,
            first_scheduled_at: scheduledAt,
            estimated_duration: 90,
            price: priceBreakdown.total,
            price_breakdown: priceBreakdown,
            checklist: selectedSpace.checklist_template ?? [],
            special_instructions: instructions || null,
            frequency,
            occurrences,
          }),
        })
        const data = await res.json()
        if (!data?.ok) throw new Error(data?.error || '고정 청소 생성 실패')
        router.replace(data.first_job_id ? `/requests/${data.first_job_id}` : '/requests?tab=active')
        return
      }

      const payload = {
        space_id: selectedSpace.id,
        operator_id: user.id,
        status: 'OPEN',
        scheduled_at: scheduledAt,
        estimated_duration: 90,
        price: priceBreakdown.total,
        price_breakdown: priceBreakdown as unknown as Record<string, number>,
        checklist: selectedSpace.checklist_template ?? [],
        special_instructions: instructions || null,
        is_urgent: isUrgent || when === 'now',
        is_recurring: false,
        auto_approved: false,
      }
      const { data, error } = await supabase.from('jobs').insert(payload).select('id').single()
      if (error) throw error
      if (data?.id) {
        fetch('/api/jobs/notify-workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: data.id }),
        }).catch(() => {})
      }
      router.replace(data?.id ? `/requests/${data.id}` : '/dashboard')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '요청 생성에 실패했습니다.')
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
          <h1 className="text-[15px] font-extrabold text-ink">청소 요청</h1>
          <p className="text-[11px] text-text-soft font-bold">{step}/3</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-5 pt-4 pb-1 bg-surface">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
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
                      <p className="text-[11.5px] text-text-soft font-bold truncate mt-0.5">
                        {spaceTypeLabel(s.type)} · {s.address.split(' ').slice(0, 3).join(' ')}
                      </p>
                    </div>
                    {spaceId === s.id && <Check size={20} className="text-brand shrink-0" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">언제 청소할까요?</h2>
                <p className="t-caption mt-1.5">지금 요청 또는 예약을 선택하세요.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setWhen('now')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${when === 'now' ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${when === 'now' ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
                    <Zap size={18} strokeWidth={2.6} />
                  </div>
                  <h4 className="text-[14px] font-extrabold text-ink">지금 요청</h4>
                  <p className="text-[11.5px] text-text-soft font-bold mt-0.5">긴급 수수료 +10,000원</p>
                </button>
                <button
                  onClick={() => setWhen('schedule')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${when === 'schedule' ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${when === 'schedule' ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
                    <Calendar size={18} strokeWidth={2.6} />
                  </div>
                  <h4 className="text-[14px] font-extrabold text-ink">날짜/시간 예약</h4>
                  <p className="text-[11.5px] text-text-soft font-bold mt-0.5">원하는 시간 지정</p>
                </button>
              </div>

              {when === 'schedule' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="t-meta block mb-2 ml-1">날짜</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="t-meta block mb-2 ml-1">시간</label>
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input" step={1800} />
                  </div>
                </motion.div>
              )}

              {when === 'schedule' && !isUrgent && (
                <button onClick={() => setIsUrgent(true)} className="card-interactive p-3.5 flex items-center gap-3 border-line-soft">
                  <div className="w-8 h-8 rounded-full bg-sun-soft text-[#92580C] flex items-center justify-center">
                    <Zap size={15} strokeWidth={2.6} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-extrabold text-ink">긴급 요청으로 변경</p>
                    <p className="text-[11px] text-text-soft font-bold">+10,000원 · 마스터 작업자 우선 배정</p>
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
                    <p className="text-[13px] font-extrabold text-ink">긴급 요청 활성화</p>
                    <p className="text-[11px] text-ink-soft font-bold">+10,000원 · 우선 매칭</p>
                  </div>
                  <button onClick={() => setIsUrgent(false)} className="text-[12px] font-bold text-text-muted">해제</button>
                </div>
              )}

              {/* Recurring cleaning toggle */}
              {when === 'schedule' && (
                <div className={`card p-3.5 border-2 ${isRecurring ? 'border-brand bg-brand-softer' : 'border-line-soft'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRecurring ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'}`}>
                      <Calendar size={15} strokeWidth={2.6} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-extrabold text-ink">고정 청소로 예약</p>
                      <p className="text-[11px] text-text-soft font-bold">주기적으로 동일 시간에 자동 예약 · 최대 5% 할인</p>
                    </div>
                    <button
                      onClick={() => setIsRecurring((v) => !v)}
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition ${isRecurring ? 'bg-brand justify-end' : 'bg-line-strong justify-start'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                  {isRecurring && (
                    <div className="mt-3 pt-3 border-t border-brand/15 grid grid-cols-2 gap-3">
                      <div>
                        <label className="t-meta block mb-1.5 ml-0.5">반복 주기</label>
                        <div className="flex gap-1">
                          {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFrequency(f)}
                              className={`flex-1 h-9 rounded-lg text-[11.5px] font-extrabold ${frequency === f ? 'bg-ink text-white' : 'bg-surface text-text-muted'}`}
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
            </motion.div>
          )}

          {step === 3 && selectedSpace && priceBreakdown && (
            <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">
              <div>
                <h2 className="h-title text-ink">추가 옵션 · 확인</h2>
                <p className="t-caption mt-1.5">필요한 옵션을 추가하고 가격을 확인하세요.</p>
              </div>

              <div className="card p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-softer flex items-center justify-center">
                  <Sparkles size={18} className="text-brand-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14.5px] font-extrabold text-ink truncate">{selectedSpace.name}</h4>
                  <p className="text-[11.5px] text-text-soft font-bold truncate mt-0.5 flex items-center gap-1">
                    <Clock size={11} /> {formatScheduled(scheduledAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <OptionToggle label="쓰레기 다량" sublabel="+10,000원" checked={extraTrash} onChange={setExtraTrash} />
                <OptionToggle label="심한 오염" sublabel="+15,000원" checked={heavySoil} onChange={setHeavySoil} />
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
                <h4 className="text-[13px] font-extrabold text-ink mb-3">가격 상세</h4>
                <div className="flex flex-col gap-2">
                  {priceBreakdown.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-[13px]">
                      <span className={`font-semibold ${it.kind === 'sub' ? 'text-brand-dark' : 'text-text-muted'}`}>{it.label}</span>
                      <span className={`t-money ${it.kind === 'sub' ? 'text-brand-dark' : 'text-ink'}`}>
                        {it.kind === 'sub' ? '-' : ''}{formatKRW(Math.abs(it.amount))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-bold text-text-soft">결제 금액 (VAT 포함)</span>
                  <span className="t-money text-[22px] text-ink">{formatKRW(priceBreakdown.total)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-line-soft text-[11.5px] text-text-soft font-bold space-y-1">
                  <div className="flex justify-between">
                    <span>호스트 수수료 ({Math.round(fees.host_fee_rate * 100 * 10) / 10}%)</span>
                    <span>{formatKRW(priceBreakdown.host_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>워커 수수료 ({Math.round(fees.worker_fee_rate * 100 * 10) / 10}%)</span>
                    <span>{formatKRW(priceBreakdown.worker_fee)}</span>
                  </div>
                  <div className="flex justify-between text-brand-dark">
                    <span>워커 예상 수령 (프리랜서 기준)</span>
                    <span>{formatKRW(priceBreakdown.estimated_worker_payout)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-info-soft border border-info/15 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-info shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-ink-soft font-semibold leading-snug">
                  <b>베타 기간</b>: 실결제 없이 요청이 생성됩니다. 정식 오픈 시 Toss 에스크로 결제와 자동 정산이 적용됩니다.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {err && <div className="mt-4 p-3 bg-danger-soft rounded-xl text-[13px] font-bold text-danger">{err}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          {step === 3 && priceBreakdown && (
            <div className="flex items-baseline justify-between mb-2.5 px-1">
              <span className="text-[12px] font-bold text-text-soft">결제 예정</span>
              <span className="t-money text-[18px] text-ink">{formatKRW(priceBreakdown.total)}</span>
            </div>
          )}
          <button
            onClick={step === 3 ? handleSubmit : () => setStep((s) => (s + 1) as StepId)}
            disabled={!canProceed || loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === 3 ? (
              <>요청 보내기 <ChevronRight size={20} /></>
            ) : (
              <>다음 <ChevronRight size={20} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionToggle({ label, sublabel, checked, onChange }: { label: string; sublabel: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border-2 p-4 flex items-center gap-3 text-left transition ${checked ? 'border-brand bg-brand-softer' : 'border-line-soft bg-surface'}`}
    >
      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${checked ? 'bg-brand text-white' : 'bg-surface-muted'}`}>
        {checked && <Check size={15} strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
      </div>
      <span className="text-[13px] font-bold text-brand-dark">{sublabel}</span>
    </button>
  )
}
