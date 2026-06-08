'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { formatKRW } from '@/lib/utils'

function SuccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const paymentKey = searchParams.get('paymentKey') ?? ''
  const orderId = searchParams.get('orderId') ?? ''
  const amount = parseInt(searchParams.get('amount') ?? '0')

  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming')
  const [jobId, setJobId] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const calledRef = useRef(false)

  useEffect(() => {
    // 파라미터 없으면 메인으로
    if (!paymentKey || !orderId || !amount) {
      router.replace('/dashboard')
      return
    }

    // Strict Mode 이중 호출 방지
    if (calledRef.current) return
    calledRef.current = true

    ;(async () => {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        })
        const data = await res.json()

        if (!data?.ok) {
          setErrMsg(data?.message ?? '결제 확인에 실패했습니다. 고객센터로 문의해주세요.')
          setStatus('error')
          return
        }

        setJobId(data.jobId)
        setStatus('success')
      } catch {
        setErrMsg('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        setStatus('error')
      }
    })()
  }, [paymentKey, orderId, amount]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'confirming') {
    return (
      <div className="sseuksak-shell flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-brand" />
          <div className="text-center">
            <p className="text-[16px] font-extrabold text-ink">결제 확인 중</p>
            <p className="text-[13px] text-text-soft font-semibold mt-1">잠시만 기다려주세요...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="sseuksak-shell">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-danger-soft flex items-center justify-center mb-6">
            <XCircle size={52} className="text-danger" strokeWidth={2.5} />
          </div>
          <h1 className="text-[26px] font-black text-ink">결제 확인 실패</h1>
          <p className="text-[14px] text-text-muted font-semibold mt-3 leading-relaxed max-w-[280px]">
            {errMsg ?? '결제 확인 중 오류가 발생했습니다.'}
          </p>
          <p className="text-[12px] text-text-faint font-bold mt-3">
            결제가 됐다면 고객센터로 문의해주세요.<br />주문번호: {orderId}
          </p>
          <div className="mt-8 w-full max-w-[280px] flex flex-col gap-2">
            <Link href="/requests" className="btn btn-primary w-full">
              요청 목록 확인
            </Link>
            <Link href="/dashboard" className="btn btn-ghost w-full">
              홈으로
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-softer flex items-center justify-center mb-6">
          <CheckCircle2 size={52} className="text-brand-dark" strokeWidth={2.5} />
        </div>
        <h1 className="text-[26px] font-black text-ink">결제 완료!</h1>
        <p className="text-[14px] text-text-muted font-semibold mt-3 leading-relaxed">
          에스크로로 안전하게 보관됐어요.
          <br />
          청소 완료 후 클린파트너에게 정산됩니다.
        </p>

        <div className="mt-6 card p-5 w-full max-w-[280px]">
          <p className="text-[11px] text-text-soft font-bold">결제 금액</p>
          <p className="t-money text-[26px] text-ink mt-1">{formatKRW(amount)}</p>
          <p className="text-[11px] text-text-faint mt-2 font-semibold">주문번호: {orderId}</p>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-brand-softer border border-brand/15 w-full max-w-[280px]">
          <p className="text-[12.5px] font-bold text-brand-dark">
            🔍 주변 클린파트너를 찾고 있어요. 매칭되면 알림을 보내드릴게요!
          </p>
        </div>

        <div className="mt-6 w-full max-w-[280px] flex flex-col gap-2">
          {jobId && (
            <Link href={`/requests/${jobId}`} className="btn btn-primary w-full !py-4 !text-[15px]">
              요청 현황 보기
            </Link>
          )}
          <Link href="/dashboard" className="btn btn-ghost w-full">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    }>
      <SuccessInner />
    </Suspense>
  )
}
