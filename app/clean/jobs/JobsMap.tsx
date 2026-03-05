'use client'

import { useEffect, useRef, useState } from 'react'

export default function JobsMap({ jobs }: { jobs: any[] }) {
    const mapElement = useRef<HTMLDivElement>(null)
    const [map, setMap] = useState<any>(null)
    const markersRef = useRef<any[]>([])

    useEffect(() => {
        if (!mapElement.current || !(window as any).naver) return

        const naverMaps = (window as any).naver.maps

        // 지도 초기화 (초기 중심 좌표: 서울)
        const mapOptions = {
            center: new naverMaps.LatLng(37.5666805, 126.9784147),
            zoom: 14,
            scaleControl: false,
            logoControl: false,
            mapDataControl: false,
        }

        const newMap = new naverMaps.Map(mapElement.current, mapOptions)
        setMap(newMap)
    }, [])

    useEffect(() => {
        if (!map || !(window as any).naver) return
        const naverMaps = (window as any).naver.maps

        // 기존 마커 제거
        markersRef.current.forEach(m => m.setMap(null))
        markersRef.current = []

        // 위치 정보가 있는 job들만 필터링
        const validJobs = jobs.filter(j => j.spaces?.lat && j.spaces?.lng)

        if (validJobs.length === 0) return

        validJobs.forEach(job => {
            const marker = new naverMaps.Marker({
                position: new naverMaps.LatLng(job.spaces.lat, job.spaces.lng),
                map: map,
                icon: {
                    content: `
                        <div style="
                            padding: 6px 12px;
                            background: var(--color-primary);
                            color: white;
                            border-radius: 20px;
                            font-weight: 800;
                            font-size: 13px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            border: 2px solid white;
                            cursor: pointer;
                            transition: transform 0.2s;
                        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            ₩${(job.price / 10000).toFixed(1)}만
                        </div>
                    `,
                    anchor: new naverMaps.Point(30, 15)
                }
            })

            // 마커 클릭 시 해당 리스트 아이템으로 스크롤 및 하이라이트
            naverMaps.Event.addListener(marker, 'click', () => {
                const element = document.getElementById(`job-${job.id}`)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    const origBg = element.style.background
                    element.style.background = 'var(--color-primary-light)'
                    setTimeout(() => element.style.background = origBg, 1500)
                }
            })

            markersRef.current.push(marker)
        })

        // 마커들이 화면에 다 들어오도록 지도 자동 피팅
        if (validJobs.length > 0) {
            const bounds = new naverMaps.LatLngBounds()
            validJobs.forEach(job => {
                bounds.extend(new naverMaps.LatLng(job.spaces.lat, job.spaces.lng))
            })
            // 마커가 1개일 때는 확대가 너무 커지지 않도록 조건 처리
            if (validJobs.length === 1) {
                map.setCenter(new naverMaps.LatLng(validJobs[0].spaces.lat, validJobs[0].spaces.lng))
                map.setZoom(15)
            } else {
                map.fitBounds(bounds, { margin: [30, 30, 30, 30] })
            }
        }

    }, [map, jobs])

    return (
        <div
            ref={mapElement}
            style={{
                width: '100%',
                height: '240px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                background: '#e5e5e5' // 로딩 중 배경색
            }}
        />
    )
}
