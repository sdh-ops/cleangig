/**
 * 쓱싹 Naver Maps helpers
 * Client-side geocoding via /api/geocode + map lifecycle
 */

/** 네이버 지도 SDK 스크립트를 head에 주입 (중복 방지). NaverMap·JobsMap 모두 사용 */
export function loadNaverMapsScript(): void {
  if (typeof document === 'undefined') return
  // process.env.NEXT_PUBLIC_* 는 함수 내부에서 직접 참조해야 빌드 타임 정적 치환이 적용됨
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  if (!clientId) return
  if (document.getElementById('naver-maps-script')) return
  const script = document.createElement('script')
  script.id = 'naver-maps-script'
  // 2025년 네이버 인증 체계 변경: ncpClientId → ncpKeyId (기존 Client ID 그대로 사용)
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
  script.async = true
  document.head.appendChild(script)
}

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
    // Require naver.maps.Marker to be present — auth failure leaves maps stub without Marker
    if (window.naver?.maps?.Marker) return resolve(window.naver)
    const start = Date.now()
    const tick = () => {
      if (window.naver?.maps?.Marker) return resolve(window.naver)
      if (Date.now() - start >= timeoutMs) return resolve(null)
      setTimeout(tick, 120)
    }
    tick()
  })
}

function openExternalUrl(url: string): void {
  // <a> click approach: reliable external navigation in all PWA/iOS contexts
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function openNaverRoute(dest: { lat: number; lng: number; name?: string }): void {
  const name = dest.name ? encodeURIComponent(dest.name) : '목적지'
  const url = `https://map.naver.com/v5/directions/-/-/-/driving/?c=${dest.lng},${dest.lat},15,0,0,0,dh&dname=${name}`
  openExternalUrl(url)
}

export function openKakaoRoute(dest: { lat: number; lng: number; name?: string }): void {
  const url = `https://map.kakao.com/?rt=,,${dest.lng},${dest.lat}&rt1=${dest.lng},${dest.lat}`
  openExternalUrl(url)
}

export function searchNaverAddress(address: string): void {
  openExternalUrl(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`)
}

export function searchKakaoAddress(address: string): void {
  openExternalUrl(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`)
}
