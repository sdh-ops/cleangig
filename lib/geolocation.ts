'use client'

/**
 * 위치 권한·조회 단일 매니저.
 *
 * 문제(개편 전): getCurrentPosition을 7곳에서 개별 호출 + 45초 setInterval 패턴
 * → 일부 안드로이드 브라우저에서 권한 프롬프트 반복, 에러 침묵 무시.
 *
 * 원칙:
 * - 모든 위치 조회는 이 모듈을 통한다 (navigator.geolocation 직접 호출 금지)
 * - 마지막 성공 좌표를 모듈 레벨에 캐시 — maxAgeMs 이내면 재조회 없이 반환
 * - 추적은 watchPosition 1개로 통일 (프롬프트 1회)
 * - 에러는 타입화해서 반환 — 침묵 금지
 */

export type GeoErrorReason = 'denied' | 'unavailable' | 'timeout'

export type GeoResult =
  | { ok: true; lat: number; lng: number; accuracy: number; timestamp: number }
  | { ok: false; reason: GeoErrorReason }

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported'

// ─── 모듈 레벨 캐시 ─────────────────────────────────────────────
let lastFix: { lat: number; lng: number; accuracy: number; timestamp: number } | null = null
/** 동시 호출 합치기 — 프롬프트가 떠 있는 동안 추가 호출이 또 프롬프트 띄우지 않게 */
let inflight: Promise<GeoResult> | null = null

const DEFAULT_MAX_AGE_MS = 60_000
const DEFAULT_TIMEOUT_MS = 10_000

function toReason(err: GeolocationPositionError): GeoErrorReason {
  if (err.code === err.PERMISSION_DENIED) return 'denied'
  if (err.code === err.TIMEOUT) return 'timeout'
  return 'unavailable'
}

/** Permissions API로 현재 권한 상태 확인 (Safari 미지원 시 'prompt' 취급) */
export async function checkPermission(): Promise<PermissionState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported'
  if (!navigator.permissions?.query) return 'prompt'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'prompt'
  }
}

/**
 * 현재 위치 1회 조회. 캐시가 maxAgeMs 이내면 프롬프트·GPS 없이 즉시 반환.
 * 동시 호출은 한 요청으로 합쳐짐.
 */
export async function getPosition(opts?: {
  maxAgeMs?: number
  timeoutMs?: number
  highAccuracy?: boolean
}): Promise<GeoResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, reason: 'unavailable' }
  }

  const maxAge = opts?.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  if (lastFix && Date.now() - lastFix.timestamp <= maxAge) {
    return { ok: true, ...lastFix }
  }

  if (inflight) return inflight

  inflight = new Promise<GeoResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        }
        resolve({ ok: true, ...lastFix })
      },
      (err) => resolve({ ok: false, reason: toReason(err) }),
      {
        enableHighAccuracy: opts?.highAccuracy ?? true,
        timeout: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maximumAge: maxAge,
      },
    )
  }).finally(() => { inflight = null })

  return inflight
}

/**
 * 연속 추적 — watchPosition 1개 (권한 프롬프트 1회).
 * 반환된 stop()을 반드시 cleanup에서 호출할 것.
 *
 * @param onFix 새 좌표 수신 (throttleMs 간격으로 콜백 — DB 쓰기 부하 제어)
 * @param onError 권한 거부 등 — 한 번만 호출됨
 */
export function startTracking(
  onFix: (fix: { lat: number; lng: number; accuracy: number }) => void,
  onError: (reason: GeoErrorReason) => void,
  opts?: { throttleMs?: number },
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('unavailable')
    return () => {}
  }

  const throttleMs = opts?.throttleMs ?? 45_000
  let lastEmit = 0
  let errored = false

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      lastFix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Date.now(),
      }
      const now = Date.now()
      if (now - lastEmit >= throttleMs || lastEmit === 0) {
        lastEmit = now
        onFix({ lat: lastFix.lat, lng: lastFix.lng, accuracy: lastFix.accuracy })
      }
    },
    (err) => {
      if (errored) return
      errored = true
      onError(toReason(err))
    },
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 },
  )

  return () => navigator.geolocation.clearWatch(watchId)
}

/** 캐시된 마지막 좌표 (없으면 null) — 프롬프트 없이 즉시 */
export function getCachedFix(): { lat: number; lng: number; timestamp: number } | null {
  return lastFix ? { lat: lastFix.lat, lng: lastFix.lng, timestamp: lastFix.timestamp } : null
}
