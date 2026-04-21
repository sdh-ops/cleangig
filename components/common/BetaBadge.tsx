'use client'

import { useEffect, useState } from 'react'
import { X, Beaker } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'sseuksak:beta_notice_dismissed'
const TTL_DAYS = 30

function dismissedRecently(): boolean {
  try {
    const ts = Number(localStorage.getItem(STORAGE_KEY))
    if (!ts) return false
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24)
    return days < TTL_DAYS
  } catch {
    return false
  }
}

export default function BetaBadge() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (dismissedRecently()) return
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed top-0 inset-x-0 z-[55] flex justify-center"
          style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
        >
          <div className="w-full max-w-[480px] px-3 pt-2">
            <div className="flex items-center gap-2 bg-ink text-white rounded-full pl-3 pr-2 py-2 shadow-lg border border-white/10">
              <div className="w-6 h-6 rounded-full bg-sun text-ink flex items-center justify-center shrink-0">
                <Beaker size={12} strokeWidth={2.5} />
              </div>
              <p className="text-[11.5px] font-bold flex-1 leading-tight min-w-0">
                <span className="font-black text-sun">베타 테스트</span>
                <span className="text-white/70"> · 실결제는 곧 오픈됩니다</span>
              </p>
              <button
                onClick={dismiss}
                aria-label="닫기"
                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
