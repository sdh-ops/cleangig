'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * 클릭 한 번으로 클립보드 복사 — 수동 이체 시 계좌번호·송금액을 뱅킹앱에 붙여넣기.
 * 표시 텍스트(label)와 실제 복사값(value)을 분리해 "1,000원" 보여주고 "1000"만 복사 가능.
 */
export default function CopyField({
  value,
  label,
  className = '',
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 거부 환경 — 조용히 무시 (텍스트는 여전히 보임)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="복사"
      className={`inline-flex items-center gap-1 transition active:scale-95 ${className}`}
    >
      <span>{label ?? value}</span>
      {copied ? (
        <Check size={12} className="text-emerald-500 shrink-0" />
      ) : (
        <Copy size={12} className="text-slate-400 shrink-0" />
      )}
    </button>
  )
}
