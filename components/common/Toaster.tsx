'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { TOAST_EVENT, type ToastPayload } from '@/lib/toast'

type ToastItem = ToastPayload & { id: number }

const AUTO_DISMISS_MS = 3500
const MAX_VISIBLE = 3

/** 전역 토스트 표시기 — layout에 1회 마운트. 큰 글자·고대비로 시니어도 놓치지 않게. */
export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    let seq = 0
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail
      if (!detail?.message) return
      const id = ++seq
      setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), { ...detail, id }])
      setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id))
      }, AUTO_DISMISS_MS)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (items.length === 0) return null

  return (
    <div
      className="fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-5 pointer-events-none"
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`w-full max-w-[440px] flex items-start gap-2.5 px-4 py-3.5 rounded-2xl shadow-lg animate-slide-up ${
            t.kind === 'error'
              ? 'bg-[#7F1D1D] text-white'
              : t.kind === 'success'
                ? 'bg-[#14532D] text-white'
                : 'bg-ink text-white'
          }`}
        >
          {t.kind === 'error' ? (
            <AlertTriangle size={19} className="shrink-0 mt-0.5" />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={19} className="shrink-0 mt-0.5" />
          ) : (
            <Info size={19} className="shrink-0 mt-0.5" />
          )}
          <p className="text-[15.5px] font-bold leading-snug">{t.message}</p>
        </div>
      ))}
    </div>
  )
}
