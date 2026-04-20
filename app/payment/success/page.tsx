import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string; amount?: string; jobId?: string }>
}) {
  const sp = (await searchParams) || {}
  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-softer flex items-center justify-center mb-6">
          <CheckCircle2 size={52} className="text-brand-dark" strokeWidth={2.5} />
        </div>
        <h1 className="h-hero text-ink">결제 완료!</h1>
        <p className="t-body text-text-muted mt-3 leading-relaxed">
          에스크로로 안전하게 보관되었어요.
          <br />
          작업 승인 후 작업자에게 정산됩니다.
        </p>
        {sp.amount && (
          <div className="mt-6 card p-4 w-full max-w-[280px]">
            <p className="text-[11px] text-text-soft font-bold">결제 금액</p>
            <p className="t-money text-[24px] text-ink mt-1">{parseInt(sp.amount).toLocaleString()}원</p>
            {sp.orderId && <p className="text-[11px] text-text-faint mt-2">주문번호: {sp.orderId}</p>}
          </div>
        )}
        <div className="mt-8 w-full max-w-[280px] flex flex-col gap-2">
          {sp.jobId && (
            <Link href={`/requests/${sp.jobId}`} className="btn btn-primary w-full">
              요청 상세 보기
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
