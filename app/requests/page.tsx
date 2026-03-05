import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RequestsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: jobs } = await supabase
        .from('jobs')
        .select('*, spaces(name, address, type, reference_photos)')
        .eq('operator_id', user.id)
        .order('scheduled_at', { ascending: false })

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

    return (
        <div className="page-container">
            <header className="page-header" style={{ padding: 'var(--spacing-xl) var(--spacing-md) var(--spacing-md)', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
                <h1 className="text-xl font-bold">청소 요청 목록</h1>
                <p className="text-sm text-secondary">등록하신 모든 청소 요청 내역입니다.</p>
            </header>

            <div className="page-content">
                {jobs?.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>📋</div>
                        <p>아직 요청한 청소가 없어요</p>
                        <Link href="/requests/create" className="btn btn-primary btn-sm">첫 청소 요청하기</Link>
                    </div>
                ) : (
                    <div className="job-list flex flex-col gap-md">
                        {jobs?.map((job: any) => (
                            <Link href={`/requests/${job.id}`} key={job.id} className="card card-hover p-md">
                                <div className="flex justify-between items-start mb-sm">
                                    <div className="flex gap-sm items-center">
                                        {job.spaces?.reference_photos?.[0] ? (
                                            <img src={job.spaces.reference_photos[0]} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                                        ) : (
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                                                🏢
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-lg">{job.spaces?.name}</h3>
                                            <p className="text-xs text-secondary">{job.spaces?.address}</p>
                                        </div>
                                    </div>
                                    <span className={`badge ${STATUS_MAP[job.status]?.cls}`}>
                                        {STATUS_MAP[job.status]?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex gap-md">
                                        <span>⏰ {new Date(job.scheduled_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <span className="font-bold text-primary">{(job.price || 0).toLocaleString()}원</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* 하단 내비게이션 */}
            <nav className="bottom-nav">
                <Link href="/dashboard" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    홈
                </Link>
                <Link href="/requests" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>
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
        </div>
    )
}
