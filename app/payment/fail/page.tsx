import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string; code?: string }>
}) {
  const sp = (await searchParams) || {}
  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-danger-soft flex items-center justify-center mb-6">
          <XCircle size={52} className="text-danger" strokeWidth={2.5} />
        </div>
        <h1 className="h-hero text-ink">결제 실패</h1>
        <p className="t-body text-text-muted mt-3 leading-relaxed">
          결제가 정상적으로 이뤄지지 않았어요.
          <br />
          다시 시도해주세요.
        </p>
        {sp.message && (
          <p className="mt-5 text-[13px] font-bold text-danger max-w-[280px]">{decodeURIComponent(sp.message)}</p>
        )}
        <div className="mt-8 w-full max-w-[280px] flex flex-col gap-2">
          <Link href="/requests/create" className="btn btn-primary w-full">
            다시 시도
          </Link>
          <Link href="/dashboard" className="btn btn-ghost w-full">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
