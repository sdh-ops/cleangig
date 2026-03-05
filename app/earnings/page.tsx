import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EarningsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'worker') redirect('/dashboard')

    const { data: payments } = await supabase
        .from('payments')
        .select('*, jobs(scheduled_at, spaces(name))')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

    const totalEarned = payments?.filter((p: any) => p.status === 'RELEASED').reduce((s: number, p: any) => s + p.worker_payout, 0) || 0
    const pendingAmount = payments?.filter((p: any) => p.status === 'HELD').reduce((s: number, p: any) => s + p.worker_payout, 0) || 0

    return (
        <div className="page-container">
            <header style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)' }}>
                <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>💰 정산 내역</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                <div style={{ background: 'var(--color-bg)', borderRadius: 16, padding: 'var(--spacing-md)' }}>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>누적 수령액</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>₩{totalEarned.toLocaleString()}</p>
                </div>
                <div style={{ background: 'var(--color-primary-light)', borderRadius: 16, padding: 'var(--spacing-md)' }}>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>정산 대기 중</p>
                    <p style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>₩{pendingAmount.toLocaleString()}</p>
                    {pendingAmount > 0 && <p style={{ fontSize: 10, color: 'var(--color-primary-dark)', marginTop: 4 }}>매주 월요일 자동 입금</p>}
                </div>
            </div>

            <div className="page-content">
                {(!payments || payments.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-3xl) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: 48 }}>💳</div>
                        <p>아직 정산 내역이 없어요</p>
                        <Link href="/clean/jobs" className="btn btn-primary btn-sm">청소 찾기</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {(payments as any[]).map((p: any) => (
                            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', marginBottom: 2 }}>{(p.jobs as any)?.spaces?.name || '작업'}</div>
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)' }}>
                                        {(p.jobs as any)?.scheduled_at ? new Date((p.jobs as any).scheduled_at).toLocaleDateString('ko-KR') : '-'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: p.status === 'RELEASED' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                                        +₩{p.worker_payout.toLocaleString()}
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                        {p.status === 'HELD' && <span className="badge badge-open">대기</span>}
                                        {p.status === 'RELEASED' && <span className="badge badge-approved">완료</span>}
                                        {p.status === 'REFUNDED' && <span className="badge badge-disputed">환불</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                                        세전 ₩{(p.worker_payout + p.withholding_tax).toLocaleString()} · 원천징수 -₩{p.withholding_tax.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <nav className="bottom-nav">
                <Link href="/clean" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    오늘
                </Link>
                <Link href="/clean/jobs" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    청소 찾기
                </Link>
                <Link href="/earnings" className="bottom-nav-item active">
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
