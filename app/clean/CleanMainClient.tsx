'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Job {
    id: string; status: string; price: number; scheduled_at: string
    estimated_duration: number; is_urgent: boolean
    spaces?: { name: string; address: string; type: string }
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
                setLocationError('위치 권한을 허용하면 내 주변 일감을 볼 수 있어요')
                // 위치 없이 전체 OPEN 목록 표시
                createClient()
                    .from('jobs').select('*, spaces(name,address,type)')
                    .eq('status', 'OPEN').order('scheduled_at').limit(10)
                    .then(({ data }) => { setNearbyJobs((data as Job[]) || []); setLoading(false) })
            }
        )
    }, [])

    return (
        <div className="page-container">
            {/* 헤더 */}
            <header className="clean-header">
                <div className="clean-header-inner">
                    <div>
                        <p className="clean-greeting">안녕하세요 👋</p>
                        <h1 className="clean-name">{profile.name}님</h1>
                        <span className="tier-badge">{TIER_LABEL[profile.tier || 'STARTER']}</span>
                    </div>
                    <div className="clean-stats-mini">
                        <div>
                            <div className="mini-val">⭐ {profile.avg_rating?.toFixed(1) || '-'}</div>
                            <div className="mini-label">평점</div>
                        </div>
                        <div>
                            <div className="mini-val">{profile.total_jobs || 0}</div>
                            <div className="mini-label">총 작업</div>
                        </div>
                    </div>
                </div>

                {/* 이번 주 수익 */}
                <div className="week-earning-card">
                    <div>
                        <p className="week-label">이번 주 수익</p>
                        <p className="week-amount">{weekEarnings.toLocaleString()}원</p>
                    </div>
                    {pendingCount > 0 && (
                        <div className="pending-badge">입금 대기 {pendingCount}건</div>
                    )}
                </div>
            </header>

            <div className="page-content">
                {/* 진행 중 작업 */}
                {activeJob && (
                    <Link href={`/clean/job/${activeJob.id}`} className="active-job-card card" id="active-job-banner">
                        <div className="active-job-inner">
                            <div className="active-pulse" />
                            <div style={{ flex: 1 }}>
                                <p className="active-label">진행 중인 작업</p>
                                <p className="active-space">{(activeJob.spaces as any)?.name}</p>
                                <p className="text-sm text-secondary">{(activeJob.spaces as any)?.address}</p>
                            </div>
                            <div className="active-arrow">→</div>
                        </div>
                    </Link>
                )}

                {/* 위치 오류 */}
                {locationError && (
                    <div className="location-banner">
                        📍 {locationError}
                    </div>
                )}

                {/* 주변 일감 */}
                <div className="section-header">
                    <h2 className="section-title-sm">
                        {locationError ? '전체 일감' : '📍 내 주변 일감'}
                    </h2>
                    <Link href="/clean/jobs" className="see-all">전체 보기 →</Link>
                </div>

                {loading ? (
                    <div className="job-list">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                    </div>
                ) : nearbyJobs.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>🔍</div>
                        <p>주변에 새 일감이 없어요</p>
                        <p className="text-sm text-secondary">알림을 켜두면 새 일감 시 즉시 알려드려요</p>
                    </div>
                ) : (
                    <div className="job-list">
                        {nearbyJobs.map((job: any) => (
                            <Link href={`/clean/job/${job.job_id || job.id}`} key={job.job_id || job.id}
                                className="nearby-job-card card card-hover" id={`job-${job.job_id || job.id}`}>
                                <div className="njc-header">
                                    <div className="njc-space-type">
                                        {job.space_type === 'airbnb' ? '🏠' : job.space_type === 'partyroom' ? '🎉' : '🏢'}
                                        <span>{job.space_name}</span>
                                        {job.is_urgent && <span className="urgent-tag">🔥 긴급</span>}
                                    </div>
                                    <span className="njc-price">₩{(job.price || 0).toLocaleString()}</span>
                                </div>
                                <div className="njc-details">
                                    <span>⏰ {new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>⏱ {job.estimated_duration}분</span>
                                    {job.distance_meters && <span>📍 {(job.distance_meters / 1000).toFixed(1)}km</span>}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* 하단 탭 */}
            <nav className="bottom-nav">
                <Link href="/clean" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    오늘
                </Link>
                <Link href="/clean/jobs" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    일감 찾기
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

            <style jsx>{`
        .clean-header {
          background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
          padding: var(--spacing-xl) var(--spacing-md) var(--spacing-md);
          padding-top: calc(var(--spacing-xl) + env(safe-area-inset-top, 0));
        }
        .clean-header-inner { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md); }
        .clean-greeting { font-size: var(--font-sm); color: rgba(255,255,255,0.6); }
        .clean-name { font-size: var(--font-xl); font-weight: 800; color: #fff; }
        .tier-badge {
          display: inline-flex; padding: 3px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.15); color: #fff; font-size: 11px; font-weight: 600;
          margin-top: 4px;
        }
        .clean-stats-mini { text-align: right; display: flex; gap: var(--spacing-md); }
        .mini-val { font-size: var(--font-md); font-weight: 800; color: #fff; }
        .mini-label { font-size: 10px; color: rgba(255,255,255,0.5); }

        .week-earning-card {
          background: rgba(255,255,255,0.1); border-radius: 16px; padding: var(--spacing-md);
          display: flex; justify-content: space-between; align-items: center;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .week-label { font-size: var(--font-xs); color: rgba(255,255,255,0.7); margin-bottom: 2px; }
        .week-amount { font-size: var(--font-2xl); font-weight: 800; color: #fff; }
        .pending-badge {
          background: var(--color-orange); color: #fff;
          padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
        }

        .active-job-card { display: block; margin-bottom: var(--spacing-md); border: 2px solid var(--color-primary); }
        .active-job-inner { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); }
        .active-pulse {
          width: 12px; height: 12px; border-radius: 50%; background: var(--color-primary);
          flex-shrink: 0; animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
        .active-label { font-size: var(--font-xs); color: var(--color-primary); font-weight: 600; }
        .active-space { font-size: var(--font-md); font-weight: 700; }
        .active-arrow { font-size: 22px; color: var(--color-primary); }

        .location-banner {
          background: var(--color-orange-light); color: var(--color-orange);
          padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--btn-radius-sm);
          font-size: var(--font-sm); margin-bottom: var(--spacing-md);
        }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
        .section-title-sm { font-size: var(--font-md); font-weight: 700; }
        .see-all { font-size: var(--font-sm); color: var(--color-primary); font-weight: 600; }

        .job-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
        .nearby-job-card { display: block; padding: var(--spacing-md); }
        .njc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .njc-space-type { display: flex; align-items: center; gap: var(--spacing-xs); font-weight: 700; font-size: var(--font-md); }
        .njc-price { font-size: var(--font-lg); font-weight: 800; color: var(--color-primary); }
        .njc-details { display: flex; gap: var(--spacing-md); font-size: var(--font-xs); color: var(--color-text-secondary); }
        .urgent-tag { background: var(--color-red); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; }

        .empty-state {
          text-align: center; padding: var(--spacing-3xl) 0;
          display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm);
          color: var(--color-text-secondary);
        }
      `}</style>
        </div>
    )
}
