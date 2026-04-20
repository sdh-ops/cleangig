/**
 * 쓱싹 Naver Maps helpers
 * Client-side geocoding via /api/geocode + map lifecycle
 */

export type GeoResult = {
  lat: number
  lng: number
  roadAddress?: string
  jibunAddress?: string
}

export async function geocode(query: string): Promise<GeoResult | null> {
  if (!query) return null
  try {
    const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`)
    const json = await res.json()
    const first = json?.addresses?.[0]
    if (!first) return null
    return {
      lat: Number(first.y),
      lng: Number(first.x),
      roadAddress: first.roadAddress,
      jibunAddress: first.jibunAddress,
    }
  } catch {
    return null
  }
}

// Naver Maps JS SDK types (minimal)
declare global {
  interface Window {
    naver?: any
  }
}

export function waitForNaverMaps(timeoutMs = 8000): Promise<typeof window.naver | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null)
    if (window.naver?.maps) return resolve(window.naver)
    const start = Date.now()
    const tick = () => {
      if (window.naver?.maps) return resolve(window.naver)
      if (Date.now() - start >= timeoutMs) return resolve(null)
      setTimeout(tick, 120)
    }
    tick()
  })
}

export function openNaverRoute(dest: { lat: number; lng: number; name?: string }): void {
  const name = dest.name ? encodeURIComponent(dest.name) : '목적지'
  const url = `https://map.naver.com/v5/directions/-/-/-/driving/?c=${dest.lng},${dest.lat},15,0,0,0,dh&dname=${name}`
  window.open(url, '_blank')
}

export function openKakaoRoute(dest: { lat: number; lng: number; name?: string }): void {
  const url = `https://map.kakao.com/?rt=,,${dest.lng},${dest.lat}&rt1=${dest.lng},${dest.lat}`
  window.open(url, '_blank')
}
