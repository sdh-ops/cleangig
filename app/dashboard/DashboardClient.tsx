'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Props {
    profile: { name: string; email?: string; profile_image?: string }
    todayJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string; type: string } }>
    spaces: Array<{ id: string; name: string; type: string; base_price: number; is_active: boolean }>
    recentJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string } }>
    monthTotal: number
    monthCount: number
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    OPEN: { label: '매칭 중', cls: 'badge-open' },
    ASSIGNED: { label: '배정 완료', cls: 'badge-assigned' },
    EN_ROUTE: { label: '이동 중', cls: 'badge-assigned' },
    ARRIVED: { label: '도착', cls: 'badge-assigned' },
    IN_PROGRESS: { label: '청소 중', cls: 'badge-progress' },
    SUBMITTED: { label: '검수 대기', cls: 'badge-submitted' },
    APPROVED: { label: '승인 완료', cls: 'badge-approved' },
    DISPUTED: { label: '분쟁 중', cls: 'badge-disputed' },
    PAID_OUT: { label: '정산 완료', cls: 'badge-paid' },
    CANCELED: { label: '취소', cls: '' },
}

export default function DashboardClient({ profile, todayJobs, spaces, recentJobs, monthTotal, monthCount }: Props) {
    const [activeTab, setActiveTab] = useState<'today' | 'spaces'>('today')

    const submittedJobs = todayJobs.filter(j => j.status === 'SUBMITTED')
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const formatPrice = (p: number) => `${(p).toLocaleString()}원`

    return (
        <div className="page-container">
            {/* 상단 헤더 */}
            <header className="dash-header">
                <div className="dash-header-inner">
                    <div>
                        <p className="text-sm text-secondary">안녕하세요 👋</p>
                        <h1 className="dash-name">{profile.name}님</h1>
                    </div>
                    <div className="dash-avatar avatar avatar-md">
                        {profile.profile_image
                            ? <img src={profile.profile_image} alt="" className="avatar avatar-md" style={{ borderRadius: '50%' }} />
                            : profile.name[0]}
                    </div>
                </div>
            </header>

            {/* 이달 통계 카드 */}
            <section className="stat-section">
                <div className="stat-cards">
                    <div className="stat-card">
                        <p className="stat-card-label">이번 달 청소</p>
                        <p className="stat-card-value">{monthCount}건</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-card-label">이번 달 지출</p>
                        <p className="stat-card-value">{formatPrice(monthTotal)}</p>
                    </div>
                    <div className="stat-card stat-card-alert" style={{ display: submittedJobs.length ? 'flex' : 'none' }}>
                        <p className="stat-card-label">검수 대기</p>
                        <p className="stat-card-value text-primary">{submittedJobs.length}건</p>
                    </div>
                </div>
            </section>

            {/* 빠른 액션 */}
            <section className="quick-actions page-content" style={{ paddingTop: 0, paddingBottom: 0 }}>
                <Link href="/requests/create" className="btn btn-primary btn-full" id="create-request-btn">
                    + 새 청소 요청
                </Link>
            </section>

            {/* 탭 */}
            <div className="dash-tabs">
                <button className={`dash-tab ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>
                    오늘 일정 ({todayJobs.length})
                </button>
                <button className={`dash-tab ${activeTab === 'spaces' ? 'active' : ''}`} onClick={() => setActiveTab('spaces')}>
                    내 공간 ({spaces.length})
                </button>
            </div>

            {/* 오늘 일정 */}
            {activeTab === 'today' && (
                <div className="page-content" style={{ paddingTop: 0 }}>
                    {todayJobs.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: 48 }}>🗓️</div>
                            <p>오늘 예정된 청소가 없어요</p>
                            <Link href="/requests/create" className="btn btn-primary btn-sm">청소 요청하기</Link>
                        </div>
                    ) : (
                        <div className="job-list">
                            {todayJobs.map(job => (
                                <Link href={`/requests/${job.id}`} key={job.id} className="job-card card card-hover">
                                    <div className="job-card-body">
                                        <div className="job-card-top">
                                            <span className="job-space-name">{(job.spaces as any)?.name || '공간'}</span>
                                            <span className={`badge ${STATUS_MAP[job.status]?.cls}`}>
                                                {STATUS_MAP[job.status]?.label}
                                            </span>
                                        </div>
                                        <div className="job-card-bottom">
                                            <span className="text-secondary text-sm">⏰ {formatTime(job.scheduled_at)}</span>
                                            <span className="text-primary font-bold">{formatPrice(job.price)}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 공간 목록 */}
            {activeTab === 'spaces' && (
                <div className="page-content" style={{ paddingTop: 0 }}>
                    <div className="space-list">
                        {spaces.map(space => (
                            <Link href={`/spaces/${space.id}`} key={space.id} className="space-card card card-hover">
                                <div className="space-icon">
                                    {space.type === 'airbnb' ? '🏠' : space.type === 'partyroom' ? '🎉' : space.type === 'studio' ? '📸' : '🏢'}
                                </div>
                                <div className="space-info">
                                    <div className="space-name">{space.name}</div>
                                    <div className="space-price text-secondary text-sm">기본 {formatPrice(space.base_price)}</div>
                                </div>
                                <span>›</span>
                            </Link>
                        ))}
                        <Link href="/spaces/create" className="add-space-btn">
                            <span>+</span> 새 공간 등록
                        </Link>
                    </div>
                </div>
            )}

            {/* 하단 내비게이션 */}
            <nav className="bottom-nav">
                <Link href="/dashboard" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    홈
                </Link>
                <Link href="/requests" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>
                    요청 목록
                </Link>
                <Link href="/spaces" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    공간
                </Link>
                <Link href="/profile" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                    프로필
                </Link>
            </nav>

            <style jsx>{`
        .dash-header {
          background: linear-gradient(135deg, #00C471 0%, #00A85E 100%);
          padding: var(--spacing-xl) var(--spacing-md) var(--spacing-lg);
          padding-top: calc(var(--spacing-xl) + env(safe-area-inset-top, 0));
        }
        .dash-header-inner { display: flex; justify-content: space-between; align-items: center; }
        .dash-name { font-size: var(--font-xl); font-weight: 800; color: #fff; }
        .dash-header .text-secondary { color: rgba(255,255,255,0.8) !important; }

        .stat-section { padding: var(--spacing-md); margin-top: -16px; }
        .stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-sm); }
        .stat-card {
          background: #fff; border-radius: 16px; padding: var(--spacing-md);
          box-shadow: var(--shadow-md); display: flex; flex-direction: column; gap: 4px;
        }
        .stat-card-label { font-size: var(--font-xs); color: var(--color-text-tertiary); font-weight: 500; }
        .stat-card-value { font-size: var(--font-lg); font-weight: 800; color: var(--color-text-primary); }
        .stat-card-alert { border: 2px solid var(--color-primary); }

        .dash-tabs { display: flex; border-bottom: 1px solid var(--color-border-light); padding: 0 var(--spacing-md); margin-top: var(--spacing-md); }
        .dash-tab { flex: 1; padding: var(--spacing-sm) 0; font-size: var(--font-sm); font-weight: 600; color: var(--color-text-tertiary); border-bottom: 2px solid transparent; transition: all var(--transition-fast); margin-bottom: -1px; }
        .dash-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

        .job-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
        .job-card { display: block; }
        .job-card-body { padding: var(--spacing-md); }
        .job-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); }
        .job-card-bottom { display: flex; justify-content: space-between; align-items: center; }
        .job-space-name { font-size: var(--font-md); font-weight: 700; }

        .space-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
        .space-card { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); }
        .space-icon { font-size: 32px; }
        .space-info { flex: 1; }
        .space-name { font-size: var(--font-md); font-weight: 700; }
        .add-space-btn {
          display: flex; align-items: center; justify-content: center; gap: var(--spacing-sm);
          padding: var(--spacing-md); border-radius: 16px;
          border: 2px dashed var(--color-border);
          color: var(--color-text-tertiary); font-size: var(--font-sm); font-weight: 600;
          cursor: pointer; transition: all var(--transition-fast);
        }
        .add-space-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }

        .empty-state {
          text-align: center; padding: var(--spacing-3xl) var(--spacing-lg);
          display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md);
          color: var(--color-text-secondary);
        }

        .quick-actions { padding: var(--spacing-md) !important; }
      `}</style>
        </div>
    )
}
