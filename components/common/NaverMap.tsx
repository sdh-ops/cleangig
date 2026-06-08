'use client'

import { useEffect, useRef, useState } from 'react'
import { waitForNaverMaps, loadNaverMapsScript } from '@/lib/naver'
import { Loader2, MapPin } from 'lucide-react'

type Marker = {
  lat: number
  lng: number
  title?: string
  tone?: 'brand' | 'ink' | 'sun' | 'danger'
}

type Props = {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Marker[]
  className?: string
  height?: number | string
  interactive?: boolean
  showCurrent?: boolean
  onMapClick?: (lat: number, lng: number) => void
}

export default function NaverMap({
  center,
  zoom = 15,
  markers = [],
  className,
  height = 240,
  interactive = true,
  showCurrent = false,
  onMapClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerObjs = useRef<any[]>([])   // data markers — cleared on update
  const currentMarker = useRef<any>(null) // user "blue dot" — never cleared by marker update
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false) // map instance created — gates marker effect
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    loadNaverMapsScript()
    let canceled = false
    ;(async () => {
      const naver = await waitForNaverMaps()
      if (canceled) return
      if (!naver || !mapRef.current) {
        setErr('지도를 불러올 수 없어요.')
        setLoading(false)
        return
      }

      const centerLatLng = center ?? markers[0] ?? { lat: 37.5665, lng: 126.978 }
      const map = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(centerLatLng.lat, centerLatLng.lng),
        zoom,
        disableKineticPan: false,
        scrollWheel: interactive,
        draggable: interactive,
        pinchZoom: interactive,
        mapTypeControl: false,
        logoControl: true,
        scaleControl: false,
        mapDataControl: false,
        zoomControl: interactive,
      })
      mapInstance.current = map
      setLoading(false)
      setReady(true) // triggers marker effect now that the map exists

      if (onMapClick) {
        naver.maps.Event.addListener(map, 'click', (e: any) => {
          onMapClick(e.coord.y, e.coord.x)
        })
      }

      if (showCurrent && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (canceled) return
            const me = new naver.maps.Marker({
              position: new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
              map,
              icon: {
                content:
                  '<div style="width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>',
                anchor: new naver.maps.Point(8, 8),
              },
              zIndex: 500,
            })
            currentMarker.current = me
          },
          () => {},
          { enableHighAccuracy: true },
        )
      }
    })()
    return () => {
      canceled = true
      markerObjs.current.forEach((m) => m.setMap?.(null))
      markerObjs.current = []
      if (currentMarker.current) { currentMarker.current.setMap(null); currentMarker.current = null }
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps?.Marker) return
    const naver = window.naver

    // clear previous markers
    markerObjs.current.forEach((m) => m.setMap?.(null))
    markerObjs.current = []

    markers.forEach((m) => {
      const color =
        m.tone === 'ink' ? '#0A1F3D' : m.tone === 'sun' ? '#FFB800' : m.tone === 'danger' ? '#EF4444' : '#0EA5E9'
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(m.lat, m.lng),
        map: mapInstance.current,
        icon: {
          content: `<div style="transform:translate(-50%,-100%);">
            <div style="background:${color};color:white;padding:6px 10px;border-radius:16px;font-size:12px;font-weight:900;box-shadow:0 6px 16px rgba(10,31,61,0.2);white-space:nowrap;">${m.title ?? ''}</div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin:0 auto;"></div>
          </div>`,
          anchor: new naver.maps.Point(0, 0),
        },
      })
      markerObjs.current.push(marker)
    })

    // center override or fitBounds for multiple markers
    if (center) {
      mapInstance.current.setCenter(new naver.maps.LatLng(center.lat, center.lng))
    } else if (markers.length > 1) {
      const bounds = new naver.maps.LatLngBounds()
      markers.forEach(m => bounds.extend(new naver.maps.LatLng(m.lat, m.lng)))
      mapInstance.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
    } else if (markers.length === 1) {
      mapInstance.current.setCenter(new naver.maps.LatLng(markers[0].lat, markers[0].lng))
    }
  }, [markers, center, ready])

  return (
    <div className={`relative ${className ?? ''} overflow-hidden rounded-2xl bg-surface-muted`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
          <Loader2 size={22} className="animate-spin text-text-muted" />
        </div>
      )}
      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-muted text-text-muted">
          <MapPin size={24} className="mb-2" />
          <p className="text-[12px] font-bold">{err}</p>
        </div>
      )}
    </div>
  )
}
