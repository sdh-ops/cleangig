'use client'

import { useEffect } from 'react'
import { haptic } from '@/lib/haptic'

/**
 * Global tap haptic provider.
 * Listens once on document and fires a lightweight vibration on primary CTAs.
 */
export default function HapticProvider() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (typeof navigator === 'undefined' || !navigator.vibrate) return

    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const el = target.closest('button, a, [role="button"]') as HTMLElement | null
      if (!el) return
      const cls = el.className || ''
      if (typeof cls !== 'string') return

      if (cls.includes('btn-primary')) haptic.medium()
      else if (cls.includes('btn-secondary') || cls.includes('btn-kakao')) haptic.light()
      else if (cls.includes('tab-item') || cls.includes('fab')) haptic.tick()
      else if (cls.includes('chip') && !cls.includes('chip-muted')) haptic.tick()
      // others: silent (avoid buzz fatigue)
    }

    document.addEventListener('pointerdown', handler, { passive: true })
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  return null
}
