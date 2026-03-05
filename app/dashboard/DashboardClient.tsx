'use client'

import Link from 'next/link'
import { useState } from 'react'
import NotificationBell from '@/components/common/NotificationBell'

interface Props {
    profile: { name: string; email?: string; profile_image?: string }
    todayJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string; type: string } }>
    spaces: Array<{ id: string; name: string; type: string; base_price: number; is_active: boolean }>
    recentJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string } }>
    monthJobs: Array<{ status: string; price: number; scheduled_at: string; spaces?: { name: string } }>
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

export default function DashboardClient({ profile, todayJobs, spaces, recentJobs, monthJobs, monthTotal, monthCount }: Props) {
    const [activeTab, setActiveTab] = useState<'today' | 'spaces' | 'calendar'>('today')

    const submittedJobs = todayJobs.filter(j => j.status === 'SUBMITTED')
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const formatPrice = (p: number) => `${(p).toLocaleString()}원`

    return (
        <div className="page-container premium-bg">
            {/* 상단 앱바 - 화이트 프리미엄 */}
            <header className="premium-header">
                <div className="header-top flex justify-between items-center">
                    <div className="flex items-center gap-sm">
                        <div className="dash-avatar avatar avatar-md">
                            {profile.profile_image
                                ? <img src={profile.profile_image} alt="" className="avatar avatar-md" />
                                : profile.name[0]}
                        </div>
                        <div>
                            <p className="text-secondary" style={{ fontSize: '13px', marginBottom: -2 }}>안녕하세요,</p>
                            <h1 className="text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>{profile.name}님</h1>
                        </div>
                    </div>
                    <NotificationBell />
                </div>
            </header>

            <main className="page-content" style={{ paddingTop: '8px' }}>
                {/* 1. 스파클 점수 섹션 (Trust Widget) */}
                <section className="sparkle-section mb-lg">
                    <div className="card sparkle-card">
                        <div className="sparkle-header flex justify-between items-center mb-md">
                            <div className="flex items-center gap-xs">
                                <span style={{ fontSize: '20px' }}>⭐</span>
                                <span className="text-sm font-semibold text-secondary">스파클 점수</span>
                            </div>
                            <span className="badge badge-premium">상위 2%</span>
                        </div>
                        <div className="sparkle-content flex items-center justify-between">
                            <div className="sparkle-info">
                                <h2 className="text-3xl font-bold mb-xs" style={{ color: 'var(--color-primary)' }}>98%</h2>
                                <p className="text-sm text-secondary font-medium">매우 우수한 활동을<br />이어가고 계시네요!</p>
                            </div>
                            <div className="sparkle-visual">
                                <div className="progress-ring-container">
                                    <svg width="80" height="80" viewBox="0 0 80 80">
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="#F2F4F6" strokeWidth="8" />
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-primary)" strokeWidth="8"
                                            strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - 0.98)}`}
                                            strokeLinecap="round" transform="rotate(-90 40 40)" />
                                    </svg>
                                    <span className="sparkle-icon">✨</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. 벤토 그리드 레이아웃 (통계) */}
                <section className="bento-grid mb-lg">
                    <div className="card bento-item bento-main" style={{ background: 'var(--color-primary-light)', border: 'none' }}>
                        <p className="text-xs font-semibold text-primary mb-sm">이번 달 정산</p>
                        <h3 className="text-xl font-bold">{formatPrice(monthTotal)}</h3>
                        <p className="text-xs text-secondary mt-xs">{monthCount}건의 작업 완료</p>
                    </div>
                    <div className="bento-side-column">
                        <div className="card bento-item" style={{ marginBottom: '12px' }}>
                            <p className="text-xs font-semibold text-secondary mb-xs">평균 평점</p>
                            <div className="flex items-center gap-xs">
                                <span className="font-bold">4.9</span>
                                <span style={{ color: '#FFD400', fontSize: '12px' }}>★</span>
                            </div>
                        </div>
                        <div className="card bento-item">
                            <p className="text-xs font-semibold text-secondary mb-xs">오늘 작업</p>
                            <span className="font-bold">{todayJobs.length}건</span>
                        </div>
                    </div>
                </section>

                {/* 3. 빠른 액션 */}
                <section className="quick-actions mb-lg">
                    <div className="flex gap-sm">
                        <Link href="/requests/create" className="btn btn-primary btn-full" style={{ borderRadius: '18px' }}>
                            + 새 청소 요청
                        </Link>
                        <Link href="/market" className="btn btn-secondary flex-shrink-0" style={{ width: '60px', padding: 0, borderRadius: '18px' }}>
                            🛒
                        </Link>
                    </div>
                </section>

                {/* 4. 오늘의 일정 리스트 */}
                <section className="job-list-section">
                    <div className="flex justify-between items-center mb-md">
                        <h3 className="font-bold">오늘의 일정</h3>
                        <Link href="/requests" className="text-sm font-semibold text-primary">전체보기 ›</Link>
                    </div>

                    {todayJobs.length === 0 ? (
                        <div className="empty-card card">
                            <p className="text-sm text-secondary">오늘 예정된 청소가 없어요</p>
                        </div>
                    ) : (
                        <div className="job-list flex flex-col gap-md">
                            {todayJobs.map(job => (
                                <Link href={`/requests/${job.id}`} key={job.id} className="job-card-premium card card-hover">
                                    <div className="p-md flex justify-between items-center">
                                        <div className="flex flex-col gap-xs">
                                            <span className="text-xs font-bold text-primary">⏰ {formatTime(job.scheduled_at)}</span>
                                            <span className="font-bold text-md">{(job.spaces as any)?.name || '공간'}</span>
                                            <span className="text-xs text-secondary">{(job.spaces as any)?.type === 'airbnb' ? '에어비앤비' : '일반 주거'}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-sm">
                                            <span className={`badge-pill ${STATUS_MAP[job.status]?.cls}`}>
                                                {STATUS_MAP[job.status]?.label}
                                            </span>
                                            <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{formatPrice(job.price)}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* 하단 내비게이션 - 글래스모피즘 믹스 */}
            <nav className="premium-bottom-nav">
                <Link href="/dashboard" className="nav-item active">
                    <div className="nav-icon-box">🏠</div>
                    <span>홈</span>
                </Link>
                <Link href="/requests" className="nav-item">
                    <div className="nav-icon-box">📋</div>
                    <span>일정</span>
                </Link>
                <Link href="/spaces" className="nav-item">
                    <div className="nav-icon-box">🏢</div>
                    <span>공간</span>
                </Link>
                <Link href="/profile" className="nav-item">
                    <div className="nav-icon-box">👤</div>
                    <span>마이</span>
                </Link>
            </nav>

            <style jsx>{`
                .premium-bg { background-color: #FFFFFF; min-height: 100dvh; }
                .premium-header { padding: 16px 20px; background: #fff; }
                
                .sparkle-card {
                    padding: 24px;
                    border: none;
                    background: linear-gradient(135deg, #FFFFFF 0%, #F9FBFF 100%);
                    box-shadow: 0 10px 25px rgba(0, 100, 255, 0.08);
                    position: relative;
                }
                .badge-premium { background: var(--color-primary-light); color: var(--color-primary); font-size: 11px; padding: 4px 8px; }
                
                .progress-ring-container { position: relative; width: 80px; height: 80px; }
                .sparkle-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; }
                
                .bento-grid { display: flex; gap: 12px; }
                .bento-main { flex: 1.5; padding: 20px; display: flex; flex-direction: column; justify-content: center; }
                .bento-side-column { flex: 1; display: flex; flex-direction: column; }
                .bento-item { padding: 16px; border-radius: 20px; }
                
                .job-card-premium { border-radius: 20px; transition: all 0.2s; border: 1px solid #F2F4F6; }
                .badge-pill { font-size: 11px; padding: 4px 10px; border-radius: 99px; font-weight: 700; }
                .empty-card { padding: 40px 20px; text-align: center; border: 1px dashed var(--color-border); }
                
                .premium-bottom-nav {
                    position: fixed; bottom: 0; left: 0; right: 0;
                    height: 80px; background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(15px); border-top: 1px solid #F2F4F6;
                    display: flex; justify-content: space-around; align-items: center;
                    padding-bottom: env(safe-area-inset-bottom); z-index: 100;
                }
                .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #8B95A1; font-size: 11px; font-weight: 600; }
                .nav-item.active { color: var(--color-primary); }
                .nav-icon-box { font-size: 22px; margin-bottom: 2px; }
            `}</style>
        </div>
    )
}

