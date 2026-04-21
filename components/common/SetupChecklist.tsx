'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type SetupItem = {
  key: string
  label: string
  href: string
  done: boolean
  badge?: string
}

type Props = {
  items: SetupItem[]
  title?: string
  storageKey?: string
}

/**
 * Onboarding progress checklist card.
 * Auto-hides when all items done or user dismisses.
 */
export default function SetupChecklist({ items, title = '계정 설정을 완료하고 바로 시작하세요', storageKey = 'sseuksak:setup_dismissed' }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return !!localStorage.getItem(storageKey) } catch { return false }
  })

  const done = items.filter((i) => i.done).length
  const total = items.length
  const allDone = done === total

  if (dismissed || allDone || total === 0) return null

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1') } catch {}
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative card p-4 border-2 border-brand/20 bg-brand-softer/40"
      >
        <button
          onClick={dismiss}
          aria-label="닫기"
          className="absolute top-2 right-2 w-8 h-8 rounded-full hover:bg-white/60 flex items-center justify-center text-text-faint"
        >
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-11 h-11">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#E6FAF3" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#00C896"
                strokeWidth="4"
                strokeDasharray={`${(done / total) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-brand-dark">
              {done}/{total}
            </div>
          </div>
          <div className="flex-1 pr-6">
            <p className="text-[13.5px] font-extrabold text-ink leading-tight">{title}</p>
            <p className="text-[11px] text-text-soft font-bold mt-0.5">모두 완료하면 매칭 성공률 2배</p>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.done ? 'opacity-60' : 'hover:bg-white/60'}`}
              >
                {item.done ? (
                  <CheckCircle2 size={18} className="text-brand-dark shrink-0" />
                ) : (
                  <Circle size={18} className="text-text-faint shrink-0" />
                )}
                <span className={`flex-1 text-[13px] ${item.done ? 'line-through font-semibold text-text-soft' : 'font-extrabold text-ink'}`}>
                  {item.label}
                </span>
                {item.badge && !item.done && (
                  <span className="chip chip-warning !text-[10px] !px-2 !py-0">{item.badge}</span>
                )}
                {!item.done && <ChevronRight size={14} className="text-text-faint" />}
              </Link>
            </li>
          ))}
        </ul>
      </motion.section>
    </AnimatePresence>
  )
}
