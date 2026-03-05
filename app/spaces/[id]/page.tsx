import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ICalForm from './ICalForm'

export default async function SpaceDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: space } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', params.id)
        .eq('operator_id', user.id)
        .single()

    if (!space) redirect('/spaces')

    const SPACE_TYPE_ICON: Record<string, string> = {
        airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
        unmanned_store: '🏪', study_cafe: '📚', practice_room: '🎤', workspace: '🎨', other: '🏢'
    }

    return (
        <div className="page-container">
            <header className="page-header" style={{ padding: 'var(--spacing-xl) var(--spacing-md) var(--spacing-md)', background: '#fff', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <Link href="/spaces" className="back-btn" style={{ fontSize: 24 }}>←</Link>
                <div>
                    <h1 className="text-xl font-bold">{space.name}</h1>
                    <p className="text-sm text-secondary">공간 정보 상세 및 수정</p>
                </div>
            </header>

            <div className="page-content">
                <div className="card p-md mb-md">
                    <div className="flex items-center gap-md mb-lg">
                        <div style={{ fontSize: 40, width: 64, height: 64, background: 'var(--color-bg)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {SPACE_TYPE_ICON[space.type] || '🏢'}
                        </div>
                        <div>
                            <span className="badge badge-open mb-xs">{space.type}</span>
                            <h2 className="text-lg font-bold">{space.name}</h2>
                        </div>
                    </div>

                    <div className="flex flex-col gap-md">
                        <div className="info-item">
                            <label className="text-xs text-tertiary">주소</label>
                            <p className="text-md font-medium">{space.address} {space.address_detail}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-md mt-sm">
                            <div className="info-item">
                                <label className="text-xs text-tertiary">기본 청소 단가</label>
                                <p className="text-md font-bold text-primary">₩{space.base_price?.toLocaleString()}</p>
                            </div>
                            <div className="info-item">
                                <label className="text-xs text-tertiary">예상 소요 시간</label>
                                <p className="text-md font-medium">{space.estimated_duration}분</p>
                            </div>
                            <div className="info-item">
                                <label className="text-xs text-tertiary">청소 난이도</label>
                                <p className="text-md font-medium">{space.cleaning_difficulty}</p>
                            </div>
                            <div className="info-item">
                                <label className="text-xs text-tertiary">면적</label>
                                <p className="text-md font-medium">{space.size_sqm ? `${space.size_sqm}㎡ (약 ${Math.round(space.size_sqm * 0.3025)}평)` : '미입력'}</p>
                            </div>
                        </div>
                        <div className="info-item mt-xs">
                            <label className="text-xs text-tertiary">출입 정보 (보호됨)</label>
                            <p className="text-md font-medium" style={{ color: '#D97706' }}>🔒 {space.entry_code || '입력된 정보 없음'}</p>
                        </div>
                        <div className="info-item">
                            <label className="text-xs text-tertiary">주차 가능 여부</label>
                            <p className="text-md font-medium">{space.is_parking_available ? `가능 (${space.parking_guide || '안내 없음'})` : '불가'}</p>
                        </div>
                        <div className="info-item">
                            <label className="text-xs text-tertiary">주의사항</label>
                            <p className="text-sm text-secondary" style={{ whiteSpace: 'pre-wrap' }}>{space.caution_notes || '입력된 주의사항이 없습니다.'}</p>
                        </div>
                    </div>
                </div>

                <ICalForm spaceId={space.id} initialUrl={space.ical_url} />

                <div className="flex flex-col gap-sm">
                    <Link href={`/requests/create?space_id=${space.id}`} className="btn btn-primary btn-full">
                        🧹 이 공간 청소 요청하기
                    </Link>
                    <button className="btn btn-secondary btn-full" style={{ border: '1px solid var(--color-border)' }}>
                        📝 정보 수정하기
                    </button>
                </div>
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
