'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="sseuksak-shell">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-warning-soft text-warning flex items-center justify-center mb-6">
          <AlertTriangle size={36} />
        </div>
        <h1 className="h-title text-ink">일시적인 오류가 발생했어요</h1>
        <p className="t-caption mt-2 max-w-[300px]">
          잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터로 문의해주세요.
        </p>
        <div className="mt-6 flex flex-col gap-2 w-full max-w-[260px]">
          <button onClick={reset} className="btn btn-primary">
            <RefreshCcw size={16} /> 다시 시도
          </button>
          <Link href="/" className="btn btn-ghost">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
