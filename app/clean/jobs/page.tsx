'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import JobsMap from './JobsMap'

interface Job {
    id: string; status: string; price: number; scheduled_at: string
    estimated_duration: number; is_urgent: boolean; matching_score: number
    spaces?: { name: string; address: string; type: string }
}

const SPACE_TYPE_ICON: Record<string, string> = {
    airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
    unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
}

export default function JobsListPage() {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'urgent' | 'nearby'>('nearby')
    const [userLat, setUserLat] = useState<number | null>(null)
    const [userLng, setUserLng] = useState<number | null>(null)
    const [searchText, setSearchText] = useState('')
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(
            (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
            () => { }
        )
        fetchJobs()

        // Realtime 구독 — 새 청소 요청 즉시 표시
        const supabase = createClient()
        const channel = supabase.channel('open-jobs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' },
                (payload) => { if (payload.new.status === 'OPEN') fetchJobs() })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' },
                () => fetchJobs())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchJobs = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('jobs')
            .select('*, spaces(name, address, type, reference_photos, lat, lng)')
            .eq('status', 'OPEN')
            .gte('scheduled_at', new Date().toISOString())
            .or(`targeted_worker_id.is.null,targeted_worker_id.eq.${user.id}`)
            .order('is_urgent', { ascending: false })
            .order('scheduled_at')
            .limit(50)
        setJobs((data as any[]) || [])
        setLoading(false)
    }

    const filtered = jobs.filter(j => {
        if (filter === 'urgent') return j.is_urgent
        if (searchText) {
            const txt = searchText.toLowerCase()
            return (j.spaces?.name || '').toLowerCase().includes(txt)
                || (j.spaces?.address || '').toLowerCase().includes(txt)
        }
        return true
    })

    return (
        <div className="page-container premium-bg" style={{ backgroundColor: '#fff', minHeight: '100dvh' }}>
            {/* 상단 화이트 헤더 & 검색 */}
            <header style={{ padding: '24px 20px 16px', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em' }}>🔍 청소 찾기</h1>
                <div style={{ position: 'relative' }}>
                    <input
                        className="form-input"
                        style={{
                            minHeight: 52,
                            fontSize: '15px',
                            borderRadius: '16px',
                            background: '#F2F4F6',
                            border: 'none',
                            paddingLeft: '44px',
                            fontWeight: 500
                        }}
                        placeholder="공간 이름이나 지역으로 검색"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.5 }}>🔎</span>
                </div>
            </header>

            {/* 필터 칩 바 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px', borderBottom: '1px solid #F2F4F6' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
                    {([
                        { key: 'nearby', label: '📍 가까운 순' },
                        { key: 'all', label: '전체' },
                        { key: 'urgent', label: '🔥 긴급' },
                    ] as const).map(tab => (
                        <button key={tab.key}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 12,
                                fontSize: 13, fontWeight: 700,
                                background: filter === tab.key ? 'var(--color-primary)' : '#F2F4F6',
                                color: filter === tab.key ? '#fff' : '#8B95A1',
                                border: 'none',
                                whiteSpace: 'nowrap',
                                transition: 'all .2s'
                            }}
                            onClick={() => setFilter(tab.key)}>{tab.label}</button>
                    ))}
                </div>
                <div style={{ background: '#F2F4F6', borderRadius: 10, padding: 3, display: 'flex', marginLeft: 12 }}>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? '#000' : '#8B95A1', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none' }}>목록</button>
                    <button
                        onClick={() => setViewMode('map')}
                        style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: viewMode === 'map' ? '#fff' : 'transparent', color: viewMode === 'map' ? '#000' : '#8B95A1', boxShadow: viewMode === 'map' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none' }}>지도</button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 100px' }}>
                {/* 실시간 상태 표시 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '20px', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    실시간 업데이트 중 · {filtered.length}건
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20, background: '#F2F4F6' }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-tertiary)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                        <p style={{ fontWeight: 600 }}>현재 등록된 청소 요청이 없어요</p>
                        <p style={{ fontSize: '12px', marginTop: 8 }}>알림을 켜두면 새 요청 시 즉시 알려드려요.</p>
                    </div>
                ) : viewMode === 'map' ? (
                    <div style={{ position: 'relative', height: 'calc(100vh - 300px)', borderRadius: 24, overflow: 'hidden', border: '1px solid #F2F4F6', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
                        <JobsMap jobs={filtered} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map((job: any) => {
                            const space = job.spaces
                            const icon = SPACE_TYPE_ICON[space?.type] || '🏢'
                            const when = new Date(job.scheduled_at)
                            const isToday = when.toDateString() === new Date().toDateString()
                            const timeStr = when.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            const mainPhoto = space?.reference_photos?.[0]

                            return (
                                <Link href={`/clean/job/${job.id}`} key={job.id} className="card card-hover"
                                    style={{ display: 'block', padding: '20px', border: '1px solid #F2F4F6', textDecoration: 'none' }} id={`job-${job.id}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                            {mainPhoto ? (
                                                <img src={mainPhoto} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0, border: '1px solid #F2F4F6' }} />
                                            ) : (
                                                <span style={{ fontSize: 24, flexShrink: 0, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', borderRadius: 14 }}>{icon}</span>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#000' }}>{space?.name || '공간'}</span>
                                                    {job.is_urgent && <span className="badge-pill" style={{ background: '#FFF1F2', color: '#E11D48', fontSize: '10px' }}>긴급</span>}
                                                    {isToday && <span className="badge-pill" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '10px' }}>오늘</span>}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                                                    📍 {space?.address}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>
                                                ₩{job.price.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid #F9FAFB', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                        <span>⏰ {timeStr}</span>
                                        <span>⏱ {job.estimated_duration}분</span>
                                        <span style={{ color: 'var(--color-primary)' }}>💰 시급 {Math.round(job.price / (job.estimated_duration / 60)).toLocaleString()}원</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 하단 내비게이션 */}
            <nav className="premium-bottom-nav">
                <Link href="/clean" className="nav-item">
                    <div className="nav-icon-box">🏠</div>
                    <span>홈</span>
                </Link>
                <Link href="/clean/jobs" className="nav-item active">
                    <div className="nav-icon-box">📋</div>
                    <span>일정</span>
                </Link>
                <Link href="/earnings" className="nav-item">
                    <div className="nav-icon-box">🏦</div>
                    <span>정산</span>
                </Link>
                <Link href="/profile" className="nav-item">
                    <div className="nav-icon-box">👤</div>
                    <span>마이</span>
                </Link>
            </nav>

            <style jsx>{`
                .premium-bottom-nav {
                    position: fixed; bottom: 0; left: 0; right: 0;
                    height: 80px; background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(15px); border-top: 1px solid #F2F4F6;
                    display: flex; justify-content: space-around; align-items: center;
                    padding-bottom: env(safe-area-inset-bottom); z-index: 100;
                }
                .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #8B95A1; font-size: 11px; font-weight: 600; text-decoration: none; }
                .nav-item.active { color: var(--color-primary); }
                .nav-icon-box { font-size: 22px; margin-bottom: 2px; }
                .badge-pill { font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
