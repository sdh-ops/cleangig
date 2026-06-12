'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { LocateFixed, Loader2, MapPin, X, Search } from 'lucide-react'
import { waitForNaverMaps, loadNaverMapsScript, openNaverRoute } from '@/lib/naver'
import { getPosition } from '@/lib/geolocation'
import { formatKRW, haversineKm, maskAddress, spaceTypeLabel } from '@/lib/utils'
import { parseLocation } from '@/lib/geo'
import { estimateWorkerPayout } from '@/lib/pricing'
import type { SpaceType } from '@/lib/types'

export type JobMapItem = {
  id: string
  price: number
  is_urgent?: boolean
  scheduled_at: string
  estimated_duration?: number
  spaces?: {
    name: string
    type: SpaceType
    address: string
    location?: { coordinates?: [number, number] } | null
  }
}

type Props = {
  jobs: JobMapItem[]
  selectedJobId?: string | null
  onJobSelect?: (id: string | null) => void
  userLat?: number | null
  userLng?: number | null
  /** 반경 필터 (km) — circle 오버레이 표시 */
  radius?: number | null
  /** 지도 이동 후 "이 지역 검색" 탭 시 콜백 */
  onRegionSearch?: (lat: number, lng: number) => void
  /** 지도 초기 중심. GPS 없을 때 서울 기본 */
  initialCenter?: { lat: number; lng: number }
}

const SEOUL = { lat: 37.5665, lng: 126.978 }

// ─── 핀 색상 (브랜드 블루 기본, 긴급=빨강, 고수익=황금) ────────────────
function pinStyle(price: number, urgent: boolean): { bg: string; gradient: string; ring: string; icon: string } {
  if (urgent) return {
    bg: '#EF4444',
    gradient: 'linear-gradient(145deg,#F87171,#EF4444)',
    ring: '#FCA5A5',
    icon: '⚡',
  }
  if (price >= 50000) return {
    bg: '#F59E0B',
    gradient: 'linear-gradient(145deg,#FCD34D,#F59E0B)',
    ring: '#FDE68A',
    icon: '💰',
  }
  // 기본 — 브랜드 블루
  return {
    bg: '#0EA5E9',
    gradient: 'linear-gradient(145deg,#38BDF8,#0EA5E9)',
    ring: '#BAE6FD',
    icon: '🧹',
  }
}

function buildPinHtml(job: JobMapItem, selected: boolean): string {
  const payout = estimateWorkerPayout(job.price) // 세후 실수령 (모델A STARTER 기준: 이용료 15% + 세금 3.3%)
  const { gradient, bg, ring, icon } = pinStyle(job.price, !!job.is_urgent)
  const scale = selected ? 1.18 : 1
  const shadow = selected
    ? '0 6px 22px rgba(0,0,0,0.28), 0 0 0 3px rgba(255,255,255,0.9)'
    : '0 3px 12px rgba(0,0,0,0.22)'
  const urgentRing = job.is_urgent
    ? `<div style="position:absolute;inset:-6px;border-radius:999px;border:2px solid ${ring};animation:pinpulse 1.4s infinite ease-in-out;pointer-events:none;opacity:0.7;"></div>`
    : ''
  const priceText = formatKRW(payout, { short: true })
  return `
    <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) scale(${scale});transform-origin:center bottom;transition:transform 0.18s cubic-bezier(.34,1.56,.64,1);">
      ${urgentRing}
      <div style="
        background:${gradient};
        color:#fff;
        padding:5px 11px 5px 8px;
        border-radius:24px;
        font-size:12px;
        font-weight:900;
        box-shadow:${shadow};
        border:2px solid rgba(255,255,255,${selected ? '1' : '0.75'});
        cursor:pointer;
        white-space:nowrap;
        display:flex;
        align-items:center;
        gap:4px;
        letter-spacing:-0.2px;
        line-height:1;
      ">
        <span style="font-size:13px;line-height:1;">${icon}</span>
        <span>${priceText}</span>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${bg};margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));"></div>
    </div>`
}

export default function JobsMap({
  jobs,
  selectedJobId,
  onJobSelect,
  userLat,
  userLng,
  radius,
  onRegionSearch,
  initialCenter,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const userMarkerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const idleListenerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobMapItem | null>(null)
  const [mapMoved, setMapMoved] = useState(false)
  const initialFitDone = useRef(false)
  const centeredOnUserRef = useRef(false) // GPS 최초 취득 시 1회 중심화 여부

  // ─── 지도 초기화 ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    loadNaverMapsScript()
    ;(async () => {
      const naver = await waitForNaverMaps()
      if (cancelled || !naver || !mapRef.current) {
        setLoading(false)
        return
      }
      // GPS가 이미 취득됐으면 내 위치로, 아니면 initialCenter, 최후는 서울
      const center = (userLat && userLng)
        ? { lat: userLat, lng: userLng }
        : initialCenter ?? SEOUL

      if (userLat && userLng) centeredOnUserRef.current = true

      const map = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom: 14,
        scaleControl: false,
        logoControl: true,
        mapDataControl: false,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
        disableKineticPan: false,
      })
      mapInstance.current = map

      idleListenerRef.current = naver.maps.Event.addListener(map, 'idle', () => {
        if (initialFitDone.current) setMapMoved(true)
      })

      setReady(true)
      setLoading(false)
    })()
    return () => {
      cancelled = true
      if (mapInstance.current && idleListenerRef.current) {
        const naver = (window as any).naver
        naver?.maps?.Event?.removeListener(idleListenerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── GPS 최초 취득 시 지도 중심화 (지도 탭 열었는데 GPS가 늦게 올 때) ──
  useEffect(() => {
    if (!ready || !mapInstance.current || !userLat || !userLng) return
    if (centeredOnUserRef.current) return // 이미 중심화 완료
    centeredOnUserRef.current = true
    const naver = (window as any).naver
    mapInstance.current.setCenter(new naver.maps.LatLng(userLat, userLng))
    mapInstance.current.setZoom(14)
  }, [ready, userLat, userLng])

  // ─── 사용자 위치 마커 (파란 점) ──────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current || !userLat || !userLng) return
    const naver = (window as any).naver
    if (!naver?.maps?.Marker) return
    if (userMarkerRef.current) userMarkerRef.current.setMap(null)
    userMarkerRef.current = new naver.maps.Marker({
      position: new naver.maps.LatLng(userLat, userLng),
      map: mapInstance.current,
      icon: {
        content: `<div style="width:16px;height:16px;background:#3B82F6;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.2);"></div>`,
        anchor: new naver.maps.Point(8, 8),
      },
      zIndex: 1000,
    })
  }, [ready, userLat, userLng])

  // ─── 반경 원 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current) return
    const naver = (window as any).naver
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null }
    if (radius && userLat && userLng && naver?.maps?.Circle) {
      circleRef.current = new naver.maps.Circle({
        map: mapInstance.current,
        center: new naver.maps.LatLng(userLat, userLng),
        radius: radius * 1000,
        strokeColor: '#0EA5E9',
        strokeOpacity: 0.45,
        strokeWeight: 1.5,
        fillColor: '#0EA5E9',
        fillOpacity: 0.06,
      })
      const bounds = new naver.maps.LatLngBounds()
      const step = Math.PI / 8
      for (let a = 0; a < 2 * Math.PI; a += step) {
        const dlat = (radius / 111.32) * Math.cos(a)
        const dlng = (radius / (111.32 * Math.cos((userLat * Math.PI) / 180))) * Math.sin(a)
        bounds.extend(new naver.maps.LatLng(userLat + dlat, userLng + dlng))
      }
      mapInstance.current.fitBounds(bounds, { top: 60, right: 40, bottom: 200, left: 40 })
      initialFitDone.current = false
      setTimeout(() => { initialFitDone.current = true; setMapMoved(false) }, 800)
    }
  }, [ready, radius, userLat, userLng])

  // ─── 핀 렌더링 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current) return
    const naver = (window as any).naver
    if (!naver?.maps?.Marker) return

    const validJobs = jobs.filter(j => parseLocation(j.spaces?.location) !== null)

    // 사라진 핀 제거
    const currentIds = new Set(validJobs.map(j => j.id))
    markersRef.current.forEach((m, id) => {
      if (!currentIds.has(id)) { m.setMap(null); markersRef.current.delete(id) }
    })

    validJobs.forEach(job => {
      const { lat, lng } = parseLocation(job.spaces?.location)!
      const isSel = job.id === selectedJobId

      if (markersRef.current.has(job.id)) {
        const m = markersRef.current.get(job.id)!
        m.setIcon({ content: buildPinHtml(job, isSel), anchor: new naver.maps.Point(0, 0) })
        m.setZIndex(isSel ? 200 : 100)
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map: mapInstance.current,
          icon: { content: buildPinHtml(job, isSel), anchor: new naver.maps.Point(0, 0) },
          zIndex: isSel ? 200 : 100,
        })
        naver.maps.Event.addListener(marker, 'click', () => {
          setSelected(job); onJobSelect?.(job.id); setMapMoved(false)
        })
        markersRef.current.set(job.id, marker)
      }
    })

    // 핀 있을 때 fitBounds (radius 없고 아직 fit 안 된 경우)
    if (!initialFitDone.current && validJobs.length > 0 && !radius) {
      if (validJobs.length === 1) {
        const c = parseLocation(validJobs[0].spaces?.location)!
        mapInstance.current.setCenter(new naver.maps.LatLng(c.lat, c.lng))
        mapInstance.current.setZoom(14)
      } else {
        const bounds = new naver.maps.LatLngBounds()
        validJobs.slice(0, 20).forEach(j => {
          const c = parseLocation(j.spaces?.location)!
          bounds.extend(new naver.maps.LatLng(c.lat, c.lng))
        })
        if (userLat && userLng) bounds.extend(new naver.maps.LatLng(userLat, userLng))
        mapInstance.current.fitBounds(bounds, { top: 60, right: 40, bottom: 200, left: 40 })
      }
      initialFitDone.current = false
      setTimeout(() => { initialFitDone.current = true; setMapMoved(false) }, 800)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, jobs, selectedJobId])

  // ─── 선택 핀으로 팬 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current || !selectedJobId) return
    const job = jobs.find(j => j.id === selectedJobId)
    const c = parseLocation(job?.spaces?.location)
    if (!c) return
    const naver = (window as any).naver
    mapInstance.current.panTo(new naver.maps.LatLng(c.lat, c.lng), { duration: 300 })
  }, [ready, selectedJobId, jobs])

  // ─── 현위치 버튼 ─────────────────────────────────────────────────────
  const goToMyLocation = useCallback(() => {
    if (!mapInstance.current) return
    const naver = (window as any).naver
    // 공유 캐시 사용 — 다른 화면에서 이미 허용/조회했으면 프롬프트 없이 즉시
    getPosition({ maxAgeMs: 60_000 }).then((res) => {
      if (!res.ok || !mapInstance.current) return
      mapInstance.current.panTo(new naver.maps.LatLng(res.lat, res.lng), { duration: 400 })
      mapInstance.current.setZoom(15)
    })
  }, [])

  // ─── "이 지역 검색" ──────────────────────────────────────────────────
  const handleRegionSearch = useCallback(() => {
    if (!mapInstance.current) return
    const center = mapInstance.current.getCenter()
    onRegionSearch?.(center.y, center.x)
    setMapMoved(false)
    initialFitDone.current = false
    setTimeout(() => { initialFitDone.current = true }, 800)
  }, [onRegionSearch])

  const selJob = selected ?? (selectedJobId ? jobs.find(j => j.id === selectedJobId) ?? null : null)
  const selCoords = parseLocation(selJob?.spaces?.location)
  const selDist = selCoords && userLat && userLng
    ? haversineKm(userLat, userLng, selCoords.lat, selCoords.lng)
    : null
  const pinCount = jobs.filter(j => parseLocation(j.spaces?.location) !== null).length

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      <div ref={mapRef} className="w-full h-full" />

      {/* 로딩 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
          <Loader2 size={24} className="animate-spin text-brand" />
        </div>
      )}

      {/* 핀 수 배지 */}
      {!loading && pinCount > 0 && !selJob && (
        <div className="absolute top-3 left-3 z-20 bg-surface/90 backdrop-blur rounded-full px-3 py-1.5 shadow border border-line-soft flex items-center gap-1.5">
          <span className="text-[15px]">🧹</span>
          <span className="text-[13.5px] font-extrabold text-ink">{pinCount}개 작업</span>
        </div>
      )}

      {/* "이 지역 검색" 버튼 */}
      {mapMoved && !selJob && onRegionSearch && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleRegionSearch}
            className="flex items-center gap-1.5 h-9 px-4 bg-surface shadow-lg rounded-full border border-line-soft text-[14.5px] font-extrabold text-ink active:scale-95 transition"
          >
            <Search size={13} /> 이 지역 검색
          </button>
        </div>
      )}

      {/* 현위치 버튼 */}
      <button
        onClick={goToMyLocation}
        className={`absolute z-20 w-10 h-10 bg-surface rounded-xl shadow-md border border-line-soft flex items-center justify-center text-text-muted hover:text-brand active:scale-90 transition ${selJob ? 'bottom-40 right-3' : 'bottom-5 right-3'}`}
        title="현위치"
      >
        <LocateFixed size={18} />
      </button>

      {/* 핀 없음 */}
      {!loading && pinCount === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-8">
          <div className="bg-surface/90 backdrop-blur rounded-2xl px-5 py-4 text-center shadow-md border border-line-soft">
            <div className="text-3xl mb-2">🧹</div>
            <p className="text-[15px] font-extrabold text-ink">지도에 표시할 작업이 없어요</p>
            <p className="text-[13.5px] font-medium text-text-soft mt-1">
              필터를 조정하거나 다른 지역을 탐색해보세요
            </p>
          </div>
        </div>
      )}

      {/* 선택 카드 */}
      {selJob && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3">
          <div className="bg-surface rounded-2xl shadow-xl border border-line-soft overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="chip chip-brand !text-[13px] !px-2 !py-0.5">
                      {spaceTypeLabel(selJob.spaces?.type ?? 'other')}
                    </span>
                    {selJob.is_urgent && (
                      <span className="chip chip-danger !text-[13px] !px-2 !py-0.5">⚡ 긴급</span>
                    )}
                    {selDist != null && (
                      <span className="text-[13px] font-bold text-text-soft">
                        📍 {selDist < 1 ? `${Math.round(selDist * 1000)}m` : `${selDist.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                  <h4 className="text-[15px] font-extrabold text-ink truncate">{selJob.spaces?.name}</h4>
                  <p className="text-[13.5px] text-text-soft font-bold mt-0.5 truncate">
                    {maskAddress(selJob.spaces?.address ?? '')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="t-money text-[17px] text-brand-dark font-black">
                    {formatKRW(estimateWorkerPayout(selJob.price), { short: true })}
                  </div>
                  <p className="text-[14px] font-bold text-text-faint mt-0.5">예상 수령</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {selCoords && (
                  <button
                    onClick={() => openNaverRoute({ lat: selCoords.lat, lng: selCoords.lng, name: selJob.spaces?.name })}
                    className="flex-1 h-9 rounded-xl bg-brand-softer text-brand-dark text-[14.5px] font-extrabold flex items-center justify-center gap-1.5 border border-brand/20 active:scale-95 transition"
                  >
                    🗺 네이버 길찾기
                  </button>
                )}
                <a
                  href={`/clean/job/${selJob.id}`}
                  className="flex-1 h-9 rounded-xl bg-brand text-white text-[14.5px] font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  작업 보기 →
                </a>
                <button
                  onClick={() => { setSelected(null); onJobSelect?.(null) }}
                  aria-label="닫기"
                  className="w-11 h-11 rounded-xl bg-surface-muted flex items-center justify-center text-text-faint active:scale-95 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pinpulse {
          0%,100% { opacity:0.7; transform:scale(1); }
          50%      { opacity:0.25; transform:scale(1.15); }
        }
      `}</style>
    </div>
  )
}
