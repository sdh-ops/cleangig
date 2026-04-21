'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { haptic } from '@/lib/haptic'

type Props = {
  onRefresh: () => void | Promise<void>
  /** Max translate in px while pulling */
  maxPull?: number
  /** Activation threshold */
  threshold?: number
  /** Disable on desktop */
  disableOnDesktop?: boolean
}

/**
 * Window-level pull-to-refresh for PWA/mobile.
 * Only activates when document is scrolled to top and user drags down.
 */
export default function PullToRefresh({
  onRefresh,
  maxPull = 96,
  threshold = 72,
  disableOnDesktop = true,
}: Props) {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const triggered = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (disableOnDesktop && !matchMedia('(pointer: coarse)').matches) return

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) {
        isPulling.current = false
        return
      }
      startY.current = e.touches[0].clientY
      isPulling.current = true
      triggered.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      if (window.scrollY > 0) {
        isPulling.current = false
        setPullY(0)
        return
      }
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        setPullY(0)
        return
      }
      // damped
      const damped = Math.min(delta * 0.4, maxPull)
      setPullY(damped)
      if (damped >= threshold && !triggered.current) {
        triggered.current = true
        haptic.tick()
      }
      if (damped > 10) {
        // prevent Safari native overscroll when we're handling pull
        try { e.preventDefault() } catch {}
      }
    }

    const onTouchEnd = async () => {
      if (!isPulling.current) return
      isPulling.current = false
      const y = pullY
      if (y >= threshold && !refreshing) {
        setRefreshing(true)
        setPullY(threshold * 0.7)
        haptic.light()
        try {
          await Promise.resolve(onRefresh())
        } catch {
          // ignore
        }
        setRefreshing(false)
      }
      setPullY(0)
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    // Need non-passive to preventDefault on move (for iOS)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [pullY, refreshing, onRefresh, maxPull, threshold, disableOnDesktop])

  const visible = pullY > 4 || refreshing
  const progress = Math.min(pullY / threshold, 1)

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      style={{
        transform: `translate(-50%, ${Math.max(pullY, refreshing ? threshold * 0.7 : 0) - 48}px)`,
        opacity: visible ? 1 : 0,
        transition: isPulling.current ? 'none' : 'transform 0.25s, opacity 0.25s',
        marginTop: 'env(safe-area-inset-top, 0)',
      }}
      aria-hidden="true"
    >
      <div className="w-11 h-11 rounded-full bg-surface shadow-lg border border-line-soft flex items-center justify-center">
        <RefreshCw
          size={18}
          className={`text-brand-dark ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  )
}
