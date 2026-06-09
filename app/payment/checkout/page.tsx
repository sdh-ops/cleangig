'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'
import { ChevronLeft, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { formatKRW } from '@/lib/utils'

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

function CheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId = searchParams.get('orderId') ?? ''
  const amount = parseInt(searchParams.get('amount') ?? '0')
  const orderName = decodeURIComponent(searchParams.get('orderName') ?? '쓱싹 청소')
  const customerName = decodeURIComponent(searchParams.get('customerName') ?? '')

  const widgetsRef = useRef<Awaited<ReturnType<Awaited<ReturnType<typeof loadTossPayments>>['widgets']>> | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || !amount) {
      router.replace('/requests/create')
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
        if (!mounted) return

        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS })
        widgetsRef.current = widgets

        await widgets.setAmount({ currency: 'KRW', value: amount })
        await widgets.renderPaymentMethods({ selector: '#payment-widget' })
        await widgets.renderAgreement({ selector: '#agreement' })

        if (mounted) setWidgetReady(true)
      } catch (e: any) {
        console.error('[checkout] widget error', e)
        if (mounted) setErr('결제 위젯을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
    })()

    return () => {
      mounted = false
    }
  }, [orderId, amount]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = async () => {
    if (!widgetsRef.current || !widgetReady || paying) return
    setPaying(true)
    setErr(null)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cleangig.vercel.app'
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        customerName: customerName || undefined,
        successUrl: `${appUrl}/payment/success`,
        failUrl: `${appUrl}/payment/fail`,
      })
    } catch (e: any) {
      if (e?.code === 'USER_CANCEL') {
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
          <p className="text-[12px] font-bold text-text-faint uppercase tracking-wide mb-1">결제 금액</p>
          <p className="t-money text-[32px] text-ink">{formatKRW(amount)}</p>
          <p className="text-[14px] font-semibold text-text-soft mt-1.5">{orderName}</p>
        </div>

        {/* 안전 결제 안내 */}
        <div className="mx-5 mt-3 flex items-center gap-2 p-3 rounded-xl bg-brand-softer border border-brand/15">
          <ShieldCheck size={16} className="text-brand-dark shrink-0" />
          <p className="text-[12.5px] font-bold text-brand-dark leading-snug">
            에스크로 안전 결제 · 청소 완료 후 클린파트너에게 정산됩니다
          </p>
        </div>

        {/* 로딩 상태 */}
        {!widgetReady && !err && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-5">
            <Loader2 size={32} className="animate-spin text-brand" />
            <p className="text-[13px] font-semibold text-text-soft">결제 수단 불러오는 중...</p>
          </div>
        )}

        {/* 오류 */}
        {err && (
          <div className="mx-5 mt-5 p-4 rounded-2xl bg-danger-soft border border-danger/20 flex items-start gap-2.5">
            <AlertCircle size={17} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-danger leading-snug">{err}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-[12px] font-bold text-danger underline"
              >
                새로고침
              </button>
            </div>
          </div>
        )}

        {/* Toss 결제 위젯 */}
        <div id="payment-widget" className="mt-5" />
        <div id="agreement" className="mx-5 mt-2" />
      </div>

      {/* 하단 결제 버튼 */}
      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5">
          {widgetReady && (
            <p className="text-center text-[11.5px] font-bold text-text-soft mb-2">
              위 내용에 동의하고 결제를 진행합니다
            </p>
          )}
          <button
            onClick={handlePay}
            disabled={!widgetReady || paying}
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
