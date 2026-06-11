'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X } from 'lucide-react'

/**
 * 인증 심사 — 승인/반려. 반려 시 사유 입력받아 워커·공간파트너에게 재제출 요청.
 */
export default function VerifyActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const call = async (payload: Record<string, unknown>, kind: 'approve' | 'reject') => {
    setLoading(kind)
    setErr(null)
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...payload }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || '처리 실패')
      setDone(kind === 'approve' ? 'approved' : 'rejected')
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '처리 실패')
    } finally {
      setLoading(null)
    }
  }

  if (done) {
    return (
      <span className={`inline-flex items-center gap-1 text-[14.5px] font-black ${
        done === 'approved' ? 'text-emerald-600' : 'text-slate-500'
      }`}>
        <Check size={14} /> {done === 'approved' ? '승인 완료' : '반려됨'}
      </span>
    )
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="반려 사유 (예: 사진이 흐려 식별 불가, 정보 불일치)"
          className="input min-h-[64px] !text-[14px]"
          rows={2}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => call({ action: 'reject', reason: reason.trim() || undefined }, 'reject')}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[14.5px] font-black bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-60"
          >
            {loading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            반려 확정
          </button>
          <button
            onClick={() => { setShowReject(false); setReason('') }}
            disabled={loading !== null}
            className="px-3 py-2 rounded-xl text-[14.5px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            취소
          </button>
        </div>
        {err && <p className="text-[13.5px] text-red-500 font-bold">{err}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
      <div className="flex gap-2">
        <button
          onClick={() => call({ is_verified: true }, 'approve')}
          disabled={loading !== null}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[14.5px] font-black bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95 disabled:opacity-60"
        >
          {loading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          승인
        </button>
        <button
          onClick={() => setShowReject(true)}
          disabled={loading !== null}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[14.5px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95 disabled:opacity-60"
        >
          <X size={14} /> 반려
        </button>
      </div>
      {err && <p className="text-[13.5px] text-red-500 font-bold">{err}</p>}
    </div>
  )
}
