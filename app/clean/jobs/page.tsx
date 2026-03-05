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
        const { data } = await supabase
            .from('jobs')
            .select('*, spaces(name, address, type, reference_photos, lat, lng)')
            .eq('status', 'OPEN')
            .gte('scheduled_at', new Date().toISOString())
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
        <div className="page-container">
            {/* 헤더 */}
            <header style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: 'var(--spacing-sm)' }}>🔍 청소 찾기</h1>
                <input
                    className="form-input"
                    style={{ minHeight: 44, fontSize: 'var(--font-sm)' }}
                    placeholder="공간 이름이나 지역으로 검색"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                />
            </header>

            {/* 상단 액션 바 (필터 + 뷰 토글) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {([
                        { key: 'nearby', label: '📍 가까운 순' },
                        { key: 'all', label: '전체' },
                        { key: 'urgent', label: '🔥 긴급' },
                    ] as const).map(tab => (
                        <button key={tab.key}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 16,
                                fontSize: 13, fontWeight: 700,
                                background: filter === tab.key ? 'var(--color-primary-dark)' : 'var(--color-surface)',
                                color: filter === tab.key ? '#fff' : 'var(--color-text-tertiary)',
                                border: `1px solid ${filter === tab.key ? 'var(--color-primary-dark)' : 'var(--color-border-light)'}`,
                                transition: 'all .2s'
                            }}
                            onClick={() => setFilter(tab.key)}>{tab.label}</button>
                    ))}
                </div>
                <div style={{ background: 'var(--color-border-light)', borderRadius: 8, padding: 2, display: 'flex' }}>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 6, background: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all .2s' }}>목록</button>
                    <button
                        onClick={() => setViewMode('map')}
                        style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 6, background: viewMode === 'map' ? '#fff' : 'transparent', color: viewMode === 'map' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all .2s' }}>지도</button>
                </div>
            </div>

            <div className="page-content">
                {/* Realtime 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    실시간 업데이트 중 · {filtered.length}건의 청소 요청
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl)', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: 48, marginBottom: 'var(--spacing-md)' }}>🔍</div>
                        <p>현재 등록된 청소 요청이 없어요</p>
                        <p style={{ fontSize: 'var(--font-xs)', marginTop: 8 }}>알림을 켜두면 새 요청 시 즉시 알려드려요.</p>
                    </div>
                ) : viewMode === 'map' ? (
                    <div style={{ position: 'relative', height: 'calc(100vh - 280px)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-md)' }}>
                        <JobsMap jobs={filtered} />
                        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', padding: 12, borderRadius: 12, boxShadow: 'var(--shadow-lg)', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: 16, marginRight: 6 }}>📍</span>지도 상의 핀을 눌러 상세 정보를 확인하세요.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {filtered.map((job: any) => {
                            const space = job.spaces
                            const icon = SPACE_TYPE_ICON[space?.type] || '🏢'
                            const when = new Date(job.scheduled_at)
                            const isToday = when.toDateString() === new Date().toDateString()
                            const timeStr = when.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            const mainPhoto = space?.reference_photos?.[0]

                            return (
                                <Link href={`/clean/job/${job.id}`} key={job.id} className="card card-hover"
                                    style={{ display: 'block', padding: 'var(--spacing-md)' }} id={`job-${job.id}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
                                            {mainPhoto ? (
                                                <img src={mainPhoto} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                                            ) : (
                                                <span style={{ fontSize: 28, flexShrink: 0, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', borderRadius: 12 }}>{icon}</span>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{space?.name || '공간'}</span>
                                                    {job.is_urgent && (
                                                        <span style={{ background: 'var(--color-red)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>🔥 긴급</span>
                                                    )}
                                                    {isToday && (
                                                        <span style={{ background: 'var(--color-primary)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>오늘</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                                                    📍 {space?.address}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--color-primary)' }}>
                                                ₩{job.price.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>
                                        <span>⏰ {timeStr}</span>
                                        <span>⏱ {job.estimated_duration}분</span>
                                        <span>💰 {Math.round(job.price / (job.estimated_duration / 60)).toLocaleString()}원/시간</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 하단 탭 */}
            <nav className="bottom-nav">
                <Link href="/clean" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    오늘
                </Link>
                <Link href="/clean/jobs" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    청소 찾기
                </Link>
                <Link href="/earnings" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                    정산
                </Link>
                <Link href="/profile" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                    내 정보
                </Link>
            </nav>
        </div>
    )
}
