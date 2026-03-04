import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SpacesListPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: spaces } = await supabase
        .from('spaces')
        .select('*')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false })

    const SPACE_TYPE_ICON: Record<string, string> = {
        airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
        unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
    }

    return (
        <div className="page-container">
            <header className="page-header" style={{ padding: 'var(--spacing-xl) var(--spacing-md) var(--spacing-md)', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">내 공간 관리</h1>
                        <p className="text-sm text-secondary">등록된 {spaces?.length || 0}개의 공간이 있습니다.</p>
                    </div>
                    <Link href="/spaces/create" className="btn btn-primary btn-sm">+ 등록</Link>
                </div>
            </header>

            <div className="page-content">
                {spaces?.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: 48 }}>🏢</div>
                        <p>등록된 공간이 아직 없네요</p>
                        <Link href="/spaces/create" className="btn btn-primary btn-sm">첫 공간 등록하기</Link>
                    </div>
                ) : (
                    <div className="space-list flex flex-col gap-md">
                        {spaces?.map((space) => (
                            <Link href={`/spaces/${space.id}`} key={space.id} className="card card-hover p-md flex items-center gap-md">
                                <div style={{ fontSize: 32, width: 48, height: 48, background: 'var(--color-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {SPACE_TYPE_ICON[space.type] || '🏢'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-md">{space.name}</h3>
                                        <span className={`badge ${space.is_active ? 'badge-progress' : 'badge-disputed'}`}>
                                            {space.is_active ? '운영 중' : '중단'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-secondary mb-xs">{space.address}</p>
                                    <div className="flex gap-sm">
                                        <span className="text-xs" style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>기본 ₩{space.base_price?.toLocaleString()}</span>
                                        <span className="text-xs" style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>{space.size_sqm}㎡</span>
                                    </div>
                                </div>
                                <span className="text-tertiary">›</span>
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
                <Link href="/requests" className="bottom-nav-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>
                    요청 목록
                </Link>
                <Link href="/spaces" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
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
