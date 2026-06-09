'use client'

import { useState } from 'react'
import { Loader2, Zap, CheckCircle2 } from 'lucide-react'

type Action = 'release' | 'mark_paid'

export default function SettlementActions({
  paymentId,
  action,
  label,
  tone,
}: {
  paymentId: string
  action: Action
  label: string
  tone: 'warning' | 'success'
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handle = async () => {
    if (done || loading) return
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/settle-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, action }),
      })
      const data = await res.json()
      if (data.ok) {
        setDone(true)
      } else {
        setErr(data.error || '처리 실패')
      }
    } catch {
      setErr('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-[12px] font-black text-emerald-600">
        <CheckCircle2 size={14} /> 완료
      </span>
    )
  }

  const cls =
    tone === 'warning'
      ? 'bg-amber-400 hover:bg-amber-500 text-amber-900'
      : 'bg-emerald-500 hover:bg-emerald-600 text-white'

  return (
    <div>
      <button
        onClick={handle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black transition active:scale-95 ${cls} disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Zap size={13} />
        )}
        {label}
      </button>
      {err && <p className="text-[11px] text-red-500 font-bold mt-1">{err}</p>}
    </div>
  )
}
