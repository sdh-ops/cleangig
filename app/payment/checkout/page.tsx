'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'
import { ChevronLeft, ShieldCheck, Loader2, AlertCircle, CreditCard } from 'lucide-react'
import { formatKRW } from '@/lib/utils'

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

function CheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId = searchParams.get('orderId') ?? ''
  const amount = parseInt(searchParams.get('amount') ?? '0')
  const orderName = decodeURIComponent(searchParams.get('orderName') ?? '쓱싹 청소')
  const customerName = decodeURIComponent(searchParams.get('customerName') ?? '')

  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!orderId || !amount) {
    router.replace('/requests/create')
    return null
  }

  const handlePay = async () => {
    if (paying) return
    setPaying(true)
    setErr(null)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cleangig.vercel.app'
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
      const payment = tossPayments.payment({ customerKey: ANONYMOUS })

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        customerName: customerName || undefined,
        successUrl: `${appUrl}/payment/success`,
        failUrl: `${appUrl}/payment/fail`,
      })
      // 성공 시 Toss가 successUrl로 리다이렉트 → 여기 도달 안 함
    } catch (e: any) {
      if (e?.code === 'PAYMENT_REQUEST_ABORTED' || e?.code === 'USER_CANCEL') {
        setPaying(false)
        return
      }
      setErr(e?.message ?? '결제 중 오류가 발생했습니다.')
      setPaying(false)
    }
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top border-b border-line-soft bg-surface">
        <button
          onClick={() => router.back()}
          disabled={paying}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-extrabold text-ink">결제하기</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto pb-36">
        {/* 주문 요약 카드 */}
        <div className="mx-5 mt-5 card p-5">
          <p className="text-[14.5px] font-bold text-text-faint uppercase tracking-wide mb-1">결제 금액</p>
          <p className="t-money text-[32px] text-ink">{formatKRW(amount)}</p>
          <p className="text-[14px] font-semibold text-text-soft mt-1.5">{orderName}</p>
        </div>

        {/* 안전 결제 안내 */}
        <div className="mx-5 mt-3 flex items-center gap-2 p-3 rounded-xl bg-brand-softer border border-brand/15">
          <ShieldCheck size={16} className="text-brand-dark shrink-0" />
          <p className="text-[14.5px] font-bold text-brand-dark leading-snug">
            에스크로 안전 결제 · 청소 완료 후 클린파트너에게 정산됩니다
          </p>
        </div>

        {/* 결제 수단 안내 */}
        <div className="mx-5 mt-4 card p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <CreditCard size={16} className="text-text-soft" />
            <p className="text-[15px] font-bold text-ink">결제 수단</p>
          </div>
          <p className="text-[15px] text-text-soft leading-relaxed">
            신용카드 · 체크카드 · 간편결제(카카오페이, 네이버페이 등)
          </p>
          <p className="text-[14.5px] text-text-faint mt-2">
            결제 버튼을 누르면 토스페이먼츠 결제창이 열립니다
          </p>
        </div>

        {/* 오류 */}
        {err && (
          <div className="mx-5 mt-4 p-4 rounded-2xl bg-danger-soft border border-danger/20 flex items-start gap-2.5">
            <AlertCircle size={17} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-bold text-danger leading-snug">{err}</p>
              <button
                onClick={() => setErr(null)}
                className="mt-2 text-[14.5px] font-bold text-danger underline"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 약관 동의 안내 */}
        <div className="mx-5 mt-4 text-[14.5px] text-text-faint leading-relaxed">
          결제 진행 시 토스페이먼츠 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
        </div>
      </div>

      {/* 하단 결제 버튼 */}
      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          <p className="text-center text-[13.5px] font-bold text-text-soft mb-2">
            위 내용을 확인하고 결제를 진행합니다
          </p>
          <button
            onClick={handlePay}
            disabled={paying}
            className="btn btn-primary w-full !py-4 !text-[16px] !font-extrabold disabled:opacity-50"
          >
            {paying ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                결제 처리 중...
              </>
            ) : (
              <>{formatKRW(amount)} 결제하기</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="sseuksak-shell flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  )
}
