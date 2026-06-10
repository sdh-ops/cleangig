'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, MapPin, Sparkles, Zap, Loader2, Search,
  Filter, List, Map as MapIcon, Navigation2, LocateFixed,
  ChevronDown, ChevronUp, X,
} from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import PullToRefresh from '@/components/common/PullToRefresh'
import JobsMap, { type JobMapItem } from './JobsMap'
import { formatKRW, formatScheduled, spaceTypeLabel, shortAddress, haversineKm, difficultyLabel, parseGeoPoint } from '@/lib/utils'
import { useJobsRealtime } from '@/lib/useJobRealtime'
import type { JobStatus, SpaceType } from '@/lib/types'

type Job = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  spaces?: {
    id: string
    name: string
    type: SpaceType
    address: string
    photos?: string[]
    location?: { coordinates?: [number, number] } | null
    cleaning_difficulty?: string | null
  }
}

type Sort = 'latest' | 'urgent' | 'price' | 'near'
type View = 'list' | 'map'
type Radius = 1 | 3 | 5 | 10 | null

const RADIUS_OPTS: { value: Radius; label: string }[] = [
  { value: 1,  label: '1km' },
  { value: 3,  label: '3km' },
  { value: 5,  label: '5km' },
  { value: 10, label: '10km' },
]

export default function JobsListPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  // ─── state ───────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<Sort>('latest')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<SpaceType | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '쉬움' | '보통' | '어려움'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [view, setView] = useState<View>('list')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // GPS
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(false)

  // 반경 필터 + 지역 검색 중심
  const [radius, setRadius] = useState<Radius>(null)
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null)

  // 검색 디바운스
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ─── GPS ─────────────────────────────────────────────────────────────
  const requestGps = useCallback((cb?: () => void) => {
    if (!navigator.geolocation) { setGpsError(true); return }
    setGpsLoading(true)
    setGpsError(false)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setSearchCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
        cb?.()
      },
      () => { setGpsLoading(false); setGpsError(true) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // 마운트 시 조용히 GPS
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setSearchCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {},
      { enableHighAccuracy: false, timeout: 6000 }
    )
  }, [])

  // ─── fetchJobs ───────────────────────────────────────────────────────
  const fetchJobs = useCallback(async (opts?: { center?: { lat: number; lng: number }; silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)

    let query = supabase
      .from('jobs')
      .select('id, status, price, scheduled_at, estimated_duration, is_urgent, spaces(id, name, type, address, photos, location, cleaning_difficulty)')
      .eq('status', 'OPEN')

    // DB 정렬: urgent 필터 / price desc / latest
    if (sort === 'urgent') query = query.eq('is_urgent', true)
    const dbOrder = sort === 'price' ? 'price' : 'created_at'
    if (sort !== 'near') query = query.order(dbOrder, { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const { data } = await query.limit(200)
    // Supabase REST: geometry → WKB hex → parseGeoPoint으로 { coordinates } 변환
    let list: Job[] = ((data ?? []) as unknown as Job[]).map(j => ({
      ...j,
      spaces: j.spaces ? {
        ...j.spaces,
        location: (() => {
          const geo = parseGeoPoint(j.spaces?.location)
          return geo ? { coordinates: [geo.lng, geo.lat] as [number, number] } : null
        })(),
      } : undefined,
    }))

    // 공간 유형 필터
    if (typeFilter !== 'all') list = list.filter(j => j.spaces?.type === typeFilter)

    // 난이도 필터
    if (difficultyFilter !== 'all') list = list.filter(j => j.spaces?.cleaning_difficulty === difficultyFilter)

    // 검색어
    if (q.trim()) {
      const kw = q.trim().toLowerCase()
      list = list.filter(j =>
        (j.spaces?.name ?? '').toLowerCase().includes(kw) ||
        (j.spaces?.address ?? '').toLowerCase().includes(kw)
      )
    }

    // 반경 필터 (GPS 필요)
    const ref = opts?.center ?? searchCenter
    if (radius && ref) {
      list = list.filter(j => {
        const c = j.spaces?.location?.coordinates
        return c && haversineKm(ref.lat, ref.lng, c[1], c[0]) <= radius
      })
    }

    // 거리순 정렬
    if (sort === 'near' && ref) {
      list = [...list].sort((a, b) => {
        const ca = a.spaces?.location?.coordinates
        const cb_ = b.spaces?.location?.coordinates
        const da = ca ? haversineKm(ref.lat, ref.lng, ca[1], ca[0]) : Infinity
        const db = cb_ ? haversineKm(ref.lat, ref.lng, cb_[1], cb_[0]) : Infinity
        return da - db
      })
    }

    setJobs(list)
    setLoading(false)
  }, [sort, typeFilter, difficultyFilter, q, radius, searchCenter])

  // fetchJobs는 모든 필터를 deps로 가진 useCallback — identity 변화가 곧 "필터 바뀜" 신호.
  // (기존엔 difficultyFilter 누락으로 난이도 변경 시 재조회 안 되는 버그 있었음)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchJobs() }, q ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [fetchJobs, q])

  // 실시간: 새 OPEN 일감 INSERT는 즉시 수신.
  // 다른 워커가 잡은 일감의 제거는 RLS 때문에 이벤트가 안 와서 30초 폴링 병행.
  useJobsRealtime({ filter: 'status=eq.OPEN', pollMs: 30_000, onRefresh: () => fetchJobs({ silent: true }) })

  // ─── 지역 검색 (지도 이동 후) ────────────────────────────────────────
  const handleRegionSearch = useCallback((lat: number, lng: number) => {
    setSearchCenter({ lat, lng })
    if (sort !== 'near') setSort('near')
  }, [sort])

  // ─── 반경 토글 ───────────────────────────────────────────────────────
  const toggleRadius = useCallback((r: Radius) => {
    if (!userLat && !gpsLoading) {
      requestGps(() => setRadius(prev => prev === r ? null : r))
      return
    }
    setRadius(prev => prev === r ? null : r)
  }, [userLat, gpsLoading, requestGps])

  // ─── 거리 계산용 중심 ────────────────────────────────────────────────
  const distRef = searchCenter ?? (userLat && userLng ? { lat: userLat, lng: userLng } : null)

  // ─── 공간 유형 옵션 ──────────────────────────────────────────────────
  const typeOpts: { value: SpaceType | 'all'; label: string }[] = [
    { value: 'all',          label: '전체' },
    { value: 'airbnb',       label: '에어비앤비' },
    { value: 'partyroom',    label: '파티룸' },
    { value: 'studio',       label: '스튜디오' },
    { value: 'unmanned_store', label: '무인매장' },
    { value: 'study_cafe',   label: '스터디카페' },
    { value: 'gym',          label: '헬스장' },
    { value: 'practice_room', label: '연습실' },
    { value: 'workspace',    label: '공유오피스' },
    { value: 'other',        label: '기타' },
  ]

  // fetchJobs에서 이미 WKB 파싱 완료 → 직접 사용
  const mapJobs: JobMapItem[] = jobs.map(j => ({
    id: j.id, price: j.price, is_urgent: j.is_urgent,
    scheduled_at: j.scheduled_at, estimated_duration: j.estimated_duration,
    spaces: j.spaces ? {
      name: j.spaces.name, type: j.spaces.type,
      address: j.spaces.address, location: j.spaces.location ?? undefined,
    } : undefined,
  }))

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (difficultyFilter !== 'all' ? 1 : 0) + (radius ? 1 : 0)

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={() => fetchJobs()} />

      {/* 헤더 */}
      <Header
        showLogo
        showBell
        sticky
        rightSlot={
          <div className="flex items-center gap-0.5 bg-surface-muted rounded-xl p-0.5 mr-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[11.5px] font-extrabold transition ${view === 'list' ? 'bg-surface shadow-sm text-ink' : 'text-text-muted'}`}
            >
              <List size={14} /> 목록
            </button>
            <button
              onClick={() => {
                setView('map')
                // 지도 탭 전환 시 GPS 없으면 즉시 요청 → 내 위치 중심화
                if (!userLat) requestGps()
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[11.5px] font-extrabold transition ${view === 'map' ? 'bg-surface shadow-sm text-ink' : 'text-text-muted'}`}
            >
              <MapIcon size={14} /> 지도
            </button>
          </div>
        }
      />

      {/* ─── 검색 + 필터 바 ────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-canvas/95 backdrop-blur border-b border-line-soft">
        {/* 검색 */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="공간 이름 · 지역 검색"
              className="input pl-10 pr-9 h-10 text-[13.5px]"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 정렬 + 필터 칩 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 pb-2.5">
          {/* 정렬 */}
          <SortChip active={sort === 'latest'} onClick={() => setSort('latest')} variant="brand">
            <Clock size={12} /> 최신순
          </SortChip>
          <SortChip active={sort === 'urgent'} onClick={() => setSort('urgent')} variant="danger">
            <Zap size={12} /> 긴급만
          </SortChip>
          <SortChip active={sort === 'price'} onClick={() => setSort('price')} variant="sun">
            💰 고수익
          </SortChip>
          {userLat ? (
            <SortChip active={sort === 'near'} onClick={() => setSort('near')} variant="brand">
              <Navigation2 size={12} /> 거리순
            </SortChip>
          ) : (
            <button
              onClick={() => requestGps(() => setSort('near'))}
              disabled={gpsLoading}
              className="shrink-0 flex items-center gap-1 chip chip-muted !px-3 !py-1"
            >
              {gpsLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <Navigation2 size={12} />}
              거리순
            </button>
          )}

          <div className="w-px h-3.5 bg-line shrink-0 mx-0.5" />

          {/* 필터 버튼 */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`shrink-0 flex items-center gap-1 chip !px-3 !py-1 ${activeFilterCount > 0 ? 'chip-brand' : 'chip-muted'}`}
          >
            <Filter size={12} />
            필터
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center ml-0.5">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* 확장 필터 패널 */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden border-t border-line-soft"
            >
              <div className="px-4 pt-3 pb-3 space-y-3">
                {/* 반경 필터 */}
                <div>
                  <p className="text-[11px] font-extrabold text-text-muted mb-2 flex items-center gap-1.5">
                    <LocateFixed size={11} />
                    내 위치 기준 반경
                    {!userLat && (
                      <span className="text-text-faint font-bold">(위치 권한 필요)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {RADIUS_OPTS.map(o => (
                      <button
                        key={o.value}
                        onClick={() => toggleRadius(o.value)}
                        className={`chip !text-[11.5px] !px-3 !py-1 ${radius === o.value ? 'chip-brand' : 'chip-muted'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                    {radius && (
                      <button
                        onClick={() => setRadius(null)}
                        className="chip chip-muted !text-[11px] !px-2.5 !py-1 flex items-center gap-1"
                      >
                        <X size={10} /> 반경 해제
                      </button>
                    )}
                  </div>
                </div>

                {/* 난이도 */}
                <div>
                  <p className="text-[11px] font-extrabold text-text-muted mb-2">청소 난이도</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {([
                      { value: 'all',  label: '전체' },
                      { value: '쉬움', label: '😊 쉬움' },
                      { value: '보통', label: '🧹 보통' },
                      { value: '어려움', label: '💪 어려움' },
                    ] as const).map(o => (
                      <button
                        key={o.value}
                        onClick={() => setDifficultyFilter(o.value)}
                        className={`chip !text-[11.5px] !px-3 !py-1 ${difficultyFilter === o.value ? 'chip-brand' : 'chip-muted'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 공간 유형 */}
                <div>
                  <p className="text-[11px] font-extrabold text-text-muted mb-2">공간 유형</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {typeOpts.map(o => (
                      <button
                        key={o.value}
                        onClick={() => setTypeFilter(o.value)}
                        className={`chip !text-[11.5px] !px-3 !py-1 ${typeFilter === o.value ? 'chip-brand' : 'chip-muted'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 필터 초기화 */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setTypeFilter('all'); setDifficultyFilter('all'); setRadius(null) }}
                    className="text-[12px] font-extrabold text-danger"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GPS 오류 배너 */}
        {gpsError && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-sun-soft rounded-xl px-3 py-2">
              <LocateFixed size={13} className="text-sun-dark shrink-0" />
              <p className="text-[11.5px] font-bold text-sun-dark flex-1">
                위치 권한이 없어요. 브라우저 설정에서 허용하면 거리순·반경 기능을 쓸 수 있어요.
              </p>
              <button onClick={() => setGpsError(false)} className="text-sun-dark shrink-0">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* 결과 수 + 검색 중심 표시 */}
        {(radius || (sort === 'near' && searchCenter && searchCenter.lat !== userLat)) && !loading && (
          <div className="px-4 pb-2 flex items-center gap-1.5">
            {radius && (
              <span className="text-[11px] font-extrabold text-brand bg-brand-softer px-2.5 py-1 rounded-full">
                반경 {radius}km 내 {jobs.length}개
              </span>
            )}
            {sort === 'near' && searchCenter && searchCenter.lat !== userLat && (
              <span className="text-[11px] font-bold text-text-soft">
                · 지역 기준 정렬 중
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── 지도 뷰 ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {view === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 relative"
          >
            <div className="absolute inset-0 bottom-[72px]">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60 backdrop-blur-sm">
                  <Loader2 size={26} className="animate-spin text-brand" />
                </div>
              )}
              <JobsMap
                jobs={mapJobs}
                selectedJobId={selectedJobId}
                onJobSelect={setSelectedJobId}
                userLat={userLat}
                userLng={userLng}
                radius={radius}
                onRegionSearch={handleRegionSearch}
                initialCenter={searchCenter ?? undefined}
              />
            </div>
          </motion.div>
        )}

        {/* ─── 목록 뷰 ──────────────────────────────────────────── */}
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 px-4 pt-3 pb-28"
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={26} className="animate-spin text-brand" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="card p-3 mt-3">
                <EmptyState
                  icon={<Sparkles size={22} />}
                  title="조건에 맞는 작업이 없어요"
                  description={radius ? `반경 ${radius}km 내 작업이 없습니다. 반경을 늘려보세요.` : '필터를 조정하거나 알림을 켜두세요.'}
                />
                {radius && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => setRadius(null)}
                      className="btn btn-secondary h-9 text-[13px]"
                    >
                      반경 필터 해제
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {jobs.map(job => {
                  const coords = job.spaces?.location?.coordinates
                  const dist = coords && coords.length === 2 && distRef
                    ? haversineKm(distRef.lat, distRef.lng, coords[1], coords[0])
                    : null
                  return (
                    <li key={job.id}>
                      <Link href={`/clean/job/${job.id}`} className="card-interactive p-4 flex gap-3">
                        {/* 썸네일 */}
                        <div className="w-[62px] h-[62px] rounded-xl bg-surface-muted overflow-hidden shrink-0 relative">
                          {job.spaces?.photos?.[0] ? (
                            <img
                              src={job.spaces.photos[0]}
                              alt={job.spaces.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-softer text-brand-dark">
                              <Sparkles size={20} />
                            </div>
                          )}
                          {job.is_urgent && (
                            <span className="absolute top-1 right-1 chip chip-danger !text-[8.5px] !px-1 !py-0">긴급</span>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="chip chip-brand !text-[10px] !px-2 !py-0.5">
                              {spaceTypeLabel(job.spaces?.type ?? 'other')}
                            </span>
                            {(() => {
                              const d = difficultyLabel(job.spaces?.cleaning_difficulty)
                              return (
                                <span className={`text-[10px] font-extrabold bg-surface-muted px-2 py-0.5 rounded-full ${d.color}`}>
                                  {d.emoji} {d.label}
                                </span>
                              )
                            })()}
                            {dist != null && (
                              <span className="text-[10px] font-extrabold text-brand-dark bg-brand-softer px-2 py-0.5 rounded-full">
                                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[14px] font-extrabold text-ink truncate">{job.spaces?.name}</h4>
                          <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} /> {shortAddress(job.spaces?.address ?? '')}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[11px] text-text-soft font-bold flex items-center gap-1">
                              <Clock size={10} /> {formatScheduled(job.scheduled_at)}
                              {job.estimated_duration && (
                                <span className="text-text-faint"> · {job.estimated_duration}분</span>
                              )}
                            </p>
                            <div className="t-money text-[14.5px] text-brand-dark font-black">
                              {formatKRW(Math.round(job.price * 0.80), { short: true })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="worker" />
    </div>
  )
}

// ─── SortChip 헬퍼 ─────────────────────────────────────────────────────────
function SortChip({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean
  onClick: () => void
  variant: 'brand' | 'danger' | 'sun'
  children: React.ReactNode
}) {
  const cls = active
    ? variant === 'danger' ? 'chip-danger' : variant === 'sun' ? 'chip-sun' : 'chip-brand'
    : 'chip-muted'
  return (
    <button onClick={onClick} className={`shrink-0 flex items-center gap-1 chip ${cls} !px-3 !py-1`}>
      {children}
    </button>
  )
}
