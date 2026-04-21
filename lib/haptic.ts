/**
 * 쓱싹 Haptic feedback helper
 * iOS Safari는 PWA standalone에서만 vibrate 지원. 다른 곳은 silent fallback.
 */
type Pattern = number | number[]

function v(p: Pattern): void {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(p)
  } catch {
    // ignore
  }
}

export const haptic = {
  tick: () => v(5),
  light: () => v(10),
  medium: () => v(20),
  heavy: () => v(40),
  success: () => v([15, 30, 15]),
  warning: () => v([20, 40, 20]),
  error: () => v([30, 60, 30, 60]),
  tap: () => v(8),
}
