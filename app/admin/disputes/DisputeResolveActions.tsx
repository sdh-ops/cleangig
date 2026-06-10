'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, RotateCcw } from 'lucide-react'
import { formatKRW } from '@/lib/utils'

type Verdict = 'APPROVE_WORK' | 'REFUND' | 'DISMISS'

export default function DisputeResolveActions({ disputeId, jobPrice }: { disputeId: string; jobPrice: number }) {
  const router = useRouter()
  const [open, setOpen] = useState<Verdict | null>(null)
  const [note, setNote] = useState('')
  const [refund, setRefund] = useState(jobPrice || 0)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (verdict: Verdict) => {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispute_id: disputeId,
          verdict,
          refund_amount: verdict === 'REFUND' ? refund : 0,
          note,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data?.ok) {
        throw new Error(
          data?.error === 'server_misconfigured'
            ? 'service_role 키 설정이 필요합니다 (SUPABASE_SERVICE_ROLE_KEY)'
            : data?.error === 'already_resolved'
              ? '이미 처리된 분쟁입니다'
              : '처리 실패',
        )
      }
      setOpen(null)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const VERDICTS: { key: Verdict; label: string; tone: string }[] = [
    { key: 'APPROVE_WORK', label: '작업 인정', tone: 'chip-success' },
    { key: 'REFUND', label: '환불', tone: 'chip-danger' },
    { key: 'DISMISS', label: '기각', tone: 'chip-muted' },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-line-soft">
      {!open ? (
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-bold text-text-faint mr-1">조치:</span>
          {VERDICTS.map((v) => (
            <button
              key={v.key}
              onClick={() => { setOpen(v.key); setErr(null) }}
              className={`chip ${v.tone} !text-[13.5px] !px-3 !py-1.5 hover:opacity-80`}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[14.5px] font-extrabold text-ink">
              {open === 'APPROVE_WORK' ? '클린파트너 작업을 인정하고 승인 처리할까요?'
                : open === 'REFUND' ? '요청자에게 환불 처리할까요?'
                  : '신고를 기각할까요?'}
            </p>
            <button onClick={() => setOpen(null)} className="w-7 h-7 rounded-full hover:bg-surface-muted flex items-center justify-center">
              <X size={15} />
            </button>
          </div>

          {open === 'REFUND' && (
            <div>
              <label className="text-[13.5px] font-bold text-text-soft block mb-1">환불액 (최대 {formatKRW(jobPrice || 0)})</label>
              <input
                type="number"
                min={0}
                max={jobPrice || undefined}
                value={refund}
                onChange={(e) => setRefund(Math.max(0, Math.min(jobPrice || 0, parseInt(e.target.value) || 0)))}
                className="input !min-h-[38px] !py-1.5 text-[15px]"
              />
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="처리 사유 (선택, 기록용)"
            className="input !min-h-[60px] text-[15px]"
            rows={2}
            maxLength={500}
          />

          {err && <p className="text-[14.5px] font-bold text-danger">{err}</p>}

          <div className="flex gap-2">
            <button onClick={() => setOpen(null)} disabled={submitting} className="flex-1 btn btn-ghost !min-h-[40px] !text-[15px]">
              <RotateCcw size={14} /> 취소
            </button>
            <button onClick={() => submit(open)} disabled={submitting} className="flex-1 btn btn-primary !min-h-[40px] !text-[15px]">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <><Check size={14} /> 확정</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
