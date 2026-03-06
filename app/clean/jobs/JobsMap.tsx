import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'

export default function JobsMap({ jobs }: { jobs: any[] }) {
    const mapElement = useRef<HTMLDivElement>(null)
    const [map, setMap] = useState<any>(null)
    const markersRef = useRef<any[]>([])
    const [naverLoaded, setNaverLoaded] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        const checkNaverMap = setInterval(() => {
            if ((window as any).naver && (window as any).naver.maps) {
                setNaverLoaded(true)
                clearInterval(checkNaverMap)
            }
        }, 100)
        return () => clearInterval(checkNaverMap)
    }, [])

    useEffect(() => {
        if (!mapElement.current || !naverLoaded) return

        const naverMaps = (window as any).naver.maps

        const mapOptions = {
            center: new naverMaps.LatLng(37.5666805, 126.9784147),
            zoom: 14,
            scaleControl: false,
            logoControl: false,
            mapDataControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: naverMaps.Position.TOP_RIGHT
            }
        }

        const newMap = new naverMaps.Map(mapElement.current, mapOptions)
        setMap(newMap)
    }, [naverLoaded])

    useEffect(() => {
        if (!map || !naverLoaded) return
        const naverMaps = (window as any).naver.maps

        markersRef.current.forEach(m => m.setMap(null))
        markersRef.current = []

        const validJobs = jobs.filter(j => j.spaces?.lat && j.spaces?.lng)

        validJobs.forEach(job => {
            const marker = new naverMaps.Marker({
                position: new naverMaps.LatLng(job.spaces.lat, job.spaces.lng),
                map: map,
                icon: {
                    content: `
                        <div style="
                            padding: 8px 14px;
                            background: #000;
                            color: white;
                            border-radius: 24px;
                            font-weight: 800;
                            font-size: 13px;
                            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                            border: 2px solid white;
                            cursor: pointer;
                            transition: all 0.2s;
                            white-space: nowrap;
                        " onmouseover="this.style.transform='scale(1.1)'; this.style.backgroundColor='#4f46e5'" onmouseout="this.style.transform='scale(1)'; this.style.backgroundColor='#000'">
                            ₩${(job.price / 10000).toFixed(1)}만
                        </div>
                    `,
                    anchor: new naverMaps.Point(30, 15)
                }
            })

            naverMaps.Event.addListener(marker, 'click', () => {
                const element = document.getElementById(`job-${job.id}`)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    element.classList.add('ring-4', 'ring-primary/20', 'border-primary')
                    setTimeout(() => element.classList.remove('ring-4', 'ring-primary/20', 'border-primary'), 2000)
                }
            })

            markersRef.current.push(marker)
        })

        if (validJobs.length > 0) {
            const bounds = new naverMaps.LatLngBounds()
            validJobs.forEach(job => {
                bounds.extend(new naverMaps.LatLng(job.spaces.lat, job.spaces.lng))
            })
            if (validJobs.length === 1) {
                map.setCenter(new naverMaps.LatLng(validJobs[0].spaces.lat, validJobs[0].spaces.lng))
                map.setZoom(15)
            } else {
                map.fitBounds(bounds, { margin: [40, 40, 40, 40] })
            }
        }
    }, [map, jobs, naverLoaded])

    const goToMyLocation = () => {
        if (!map || !naverLoaded) return
        const naverMaps = (window as any).naver.maps

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                const latLng = new naverMaps.LatLng(lat, lng)

                map.setCenter(latLng)
                map.setZoom(15)

                new naverMaps.Marker({
                    position: latLng,
                    map: map,
                    icon: {
                        content: '<div class="size-4 bg-blue-500 border-2 border-white rounded-full shadow-lg pulse"></div>',
                        anchor: new naverMaps.Point(8, 8)
                    }
                })
            })
        }
    }

    return (
        <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-inner group">
            <div ref={mapElement} className="w-full h-full" />

            {/* Overlay UI */}
            <div className="absolute bottom-6 right-6 z-10">
                <button
                    onClick={goToMyLocation}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl active:scale-90 transition-all text-slate-600 hover:text-primary"
                >
                    <LocateFixed size={20} />
                </button>
            </div>

            {jobs.length === 0 && (
                <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-8 pointer-events-none">
                    <div className="bg-white/90 dark:bg-slate-900/90 p-6 rounded-3xl shadow-2xl border border-white/20 text-center max-w-xs animate-in zoom-in duration-300">
                        <div className="text-4xl mb-3">📍</div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-1">근처에 활성 요청이 없습니다</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">지도상의 다른 지역을 탐색하거나 잠시 후 다시 확인해 주세요.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
