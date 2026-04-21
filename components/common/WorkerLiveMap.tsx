'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NaverMap from './NaverMap'
import { Navigation, RadioTower } from 'lucide-react'
import { haversineKm } from '@/lib/utils'

type Props = {
  jobId: string
  spaceLat: number
  spaceLng: number
  spaceName: string
  height?: number
}

type Loc = { lat: number; lng: number; recorded_at: string }

export default function WorkerLiveMap({ jobId, spaceLat, spaceLng, spaceName, height = 240 }: Props) {
  const [loc, setLoc] = useState<Loc | null>(null)
  const [updatedAgo, setUpdatedAgo] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const loadLatest = async () => {
      const { data } = await supabase
        .from('worker_locations')
        .select('lat, lng, recorded_at')
        .eq('job_id', jobId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data && !cancelled) {
        setLoc({ lat: Number(data.lat), lng: Number(data.lng), recorded_at: data.recorded_at })
      }
    }
    loadLatest()

    const channel = supabase
      .channel(`worker_loc:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', table: 'worker_locations', schema: 'public', filter: `job_id=eq.${jobId}` },
        (payload: { new: { lat: number; lng: number; recorded_at: string } }) => {
          const n = payload.new
          setLoc({ lat: Number(n.lat), lng: Number(n.lng), recorded_at: n.recorded_at })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [jobId])

  useEffect(() => {
    if (!loc) return
    const update = () => {
      const ms = Date.now() - new Date(loc.recorded_at).getTime()
      if (ms < 60_000) setUpdatedAgo('방금 전')
      else if (ms < 3_600_000) setUpdatedAgo(`${Math.floor(ms / 60_000)}분 전`)
      else setUpdatedAgo(`${Math.floor(ms / 3_600_000)}시간 전`)
    }
    update()
    const t = setInterval(update, 20_000)
    return () => clearInterval(t)
  }, [loc])

  const markers = [
    { lat: spaceLat, lng: spaceLng, title: spaceName, tone: 'brand' as const },
  ]
  if (loc) markers.push({ lat: loc.lat, lng: loc.lng, title: '작업자', tone: 'sun' as any })

  const distanceKm = loc ? haversineKm(loc.lat, loc.lng, spaceLat, spaceLng) : null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-sun-soft text-[#92580C]">
          <RadioTower size={11} className="animate-pulse" />
          <span className="text-[10.5px] font-black uppercase tracking-wider">실시간</span>
        </div>
        {loc ? (
          <span className="text-[11.5px] font-bold text-text-soft flex items-center gap-1">
            <Navigation size={11} />
            {distanceKm != null && distanceKm < 0.1
              ? '현장 도착'
              : distanceKm != null
              ? `현장에서 ${distanceKm.toFixed(1)}km`
              : ''}
            {updatedAgo && <span className="text-text-faint">· {updatedAgo}</span>}
          </span>
        ) : (
          <span className="text-[11.5px] font-bold text-text-faint">워커 위치 수신 대기</span>
        )}
      </div>
      <NaverMap
        height={height}
        center={loc ?? { lat: spaceLat, lng: spaceLng }}
        markers={markers}
        interactive
      />
    </div>
  )
}
