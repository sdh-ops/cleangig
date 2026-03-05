'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/common/NotificationBell'

interface Job {
    id: string; status: string; price: number; scheduled_at: string
    estimated_duration: number; is_urgent: boolean
    spaces?: { name: string; address: string; type: string }
    job_id?: string; space_name?: string; space_type?: string; distance_meters?: number
}
interface Props {
    profile: { id: string; name: string; avg_rating: number; tier: string; total_jobs: number }
    activeJob: Job | null
    weekEarnings: number
    pendingCount: number
}

const TIER_LABEL: Record<string, string> = { STARTER: '🌱 스타터', SILVER: '🥈 실버', GOLD: '🥇 골드', MASTER: '👑 마스터' }

export default function CleanMainClient({ profile, activeJob, weekEarnings, pendingCount }: Props) {
    const [nearbyJobs, setNearbyJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [locationError, setLocationError] = useState('')

    useEffect(() => {
        if (!navigator.geolocation) { setLoading(false); return }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const supabase = createClient()
                const { data, error } = await supabase.rpc('nearby_open_jobs', {
                    worker_lat: pos.coords.latitude,
                    worker_lng: pos.coords.longitude,
                    radius_km: 10,
                })
                if (!error && data) setNearbyJobs(data as Job[])
                setLoading(false)
            },
            () => {
                setLocationError('위치 권한을 허용하면 내 주변 청소 요청을 볼 수 있어요')
                // 위치 없이 전체 OPEN 목록 표시
                createClient()
                    .from('jobs').select('*, spaces(name,address,type)')
                    .eq('status', 'OPEN').order('scheduled_at').limit(10)
                    .then(({ data }) => { setNearbyJobs((data as Job[]) || []); setLoading(false) })
            }
        )
    }, [])

    return (
        <div className="page-container premium-bg" style={{ backgroundColor: '#fff', minHeight: '100dvh' }}>
            {/* 상단 화이트 헤더 */}
            <header className="premium-header" style={{ background: '#fff' }}>
                <div className="header-top flex justify-between items-center">
                    <div>
                        <p className="text-secondary" style={{ fontSize: '13px', marginBottom: -2 }}>안녕하세요, 👋</p>
                        <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>{profile.name}님</h1>
                        <span className="badge-pill" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '10px', marginTop: '4px' }}>
                            {TIER_LABEL[profile.tier || 'STARTER']}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <NotificationBell />
                        <Link href="/profile" style={{ width: 40, height: 40, borderRadius: '50%', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid var(--color-border-light)', textDecoration: 'none' }}>
                            👤
                        </Link>
                    </div>
                </div>

                {/* 이번 주 수익 & 목표 달성 위젯 (Sparkle Style) */}
                <div className="card sparkle-card" style={{ marginTop: '20px', padding: '24px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #308AFF 100%)', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>이번 주 정산 예정 🎯</p>
                        {pendingCount > 0 && <span className="badge" style={{ background: '#FFD400', color: '#000', fontSize: '10px', fontWeight: 800 }}>입금 대기 {pendingCount}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                        <p style={{ fontSize: '28px', fontWeight: 900, color: '#fff' }}>{weekEarnings.toLocaleString()}원</p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>목표 30만</p>
                    </div>
                    <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min((weekEarnings / 300000) * 100, 100)}%`,
                            height: '100%',
                            background: '#fff',
                            borderRadius: 99,
                            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                            transition: 'width 1s ease-out'
                        }} />
                    </div>
                </div>
            </header>

            <div className="page-content" style={{ padding: '0 20px 100px' }}>
                {/* 진행 중 작업 - 플로팅 스타일 */}
                {activeJob && (
                    <Link href={`/clean/job/${activeJob.id}`} className="card" style={{ display: 'block', padding: '20px', border: '2px solid var(--color-primary)', background: '#F0F7FF', marginBottom: '24px', textDecoration: 'none' }}>
                        <div className="flex items-center gap-md">
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 2s infinite' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 800, marginBottom: 2 }}>현재 청소 중</p>
                                <p style={{ fontSize: '16px', fontWeight: 800, color: '#000' }}>{(activeJob.spaces as any)?.name}</p>
                            </div>
                            <span style={{ fontSize: '20px', color: 'var(--color-primary)' }}>›</span>
                        </div>
                    </Link>
                )}

                {/* AI 동선 추천 - 섹션 강조 */}
                <div style={{ marginBottom: '28px' }}>
                    <div className="flex justify-between items-center mb-md">
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#000', letterSpacing: '-0.02em' }}>
                            {locationError ? '전체 일감' : '✨ AI 추천 일감'}
                        </h2>
                        <Link href="/clean/jobs" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>전체 보기</Link>
                    </div>

                    {loading ? (
                        <div className="job-list">
                            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20, background: '#F2F4F6' }} />)}
                        </div>
                    ) : nearbyJobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                            <p style={{ fontSize: 15, fontWeight: 600 }}>주변에 새 일감이 없어요</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {nearbyJobs.map((job: any, i) => (
                                <Link href={`/clean/job/${job.job_id || job.id}`} key={job.job_id || job.id}
                                    className="card card-hover" style={{ display: 'block', padding: '20px', border: i === 0 ? '1px solid var(--color-primary-light)' : '1px solid #F2F4F6', background: i === 0 ? 'var(--color-primary-light)' : '#fff', textDecoration: 'none' }}>
                                    <div className="flex justify-between items-start mb-sm">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 20 }}>{job.space_type === 'airbnb' ? '🏠' : '🏢'}</span>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#000' }}>{job.space_name || (job.spaces as any)?.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{(job.distance_meters ? job.distance_meters / 1000 : 0.5).toFixed(1)}km 거리에요</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>₩{(job.price || 0).toLocaleString()}</div>
                                            {job.is_urgent && <span style={{ fontSize: '10px', color: 'var(--color-red)', fontWeight: 800 }}>🔥 긴급</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>⏰ {new Date(job.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>⏱ {job.estimated_duration}분 소요</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 하단 탭 - 통일된 디자인 */}
            <nav className="premium-bottom-nav">
                <Link href="/clean" className="nav-item active">
                    <div className="nav-icon-box">🏠</div>
                    <span>홈</span>
                </Link>
                <Link href="/clean/jobs" className="nav-item">
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
                .badge-pill { font-size: 11px; padding: 4px 10px; border-radius: 99px; font-weight: 700; }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
                .skeleton { animation: skeleton-loading 1s linear infinite alternate; }
                @keyframes skeleton-loading { from { background-color: #F2F4F6; } to { background-color: #E5E7EB; } }
            `}</style>
        </div>
    )
}
