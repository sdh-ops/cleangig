'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TIER_CONFIG: Record<string, { label: string; color: string; next: string; desc: string }> = {
    STARTER: { label: '🌱 스타터', color: '#94A3B8', next: '실버 (10건 완료)', desc: '수수료 10%' },
    SILVER: { label: '🥈 실버', color: '#94A3B8', next: '골드 (50건 완료)', desc: '수수료 9%' },
    GOLD: { label: '🥇 골드', color: '#F59E0B', next: '마스터 (200건 완료)', desc: '수수료 8%' },
    MASTER: { label: '👑 마스터', color: '#8B5CF6', next: '최고 등급!', desc: '수수료 7%' },
}

interface Props {
    profile: { id: string; name: string; email?: string; phone?: string; profile_image?: string; role: string; tier?: string; avg_rating?: number; total_jobs?: number; bio?: string; bank_account?: any; is_verified?: boolean; manner_temperature?: number }
    totalCompletedJobs: number
}

export default function ProfileClient({ profile, totalCompletedJobs }: Props) {
    const router = useRouter()
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(profile.name)
    const [bio, setBio] = useState(profile.bio || '')
    const [saving, setSaving] = useState(false)
    const [switching, setSwitching] = useState(false)

    const tierInfo = TIER_CONFIG[profile.tier || 'STARTER']

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()
        await supabase.from('users').update({ name, bio }).eq('id', profile.id)
        setSaving(false)
        setEditing(false)
        router.refresh()
    }

    const handleRoleSwitch = async () => {
        const nextRole = profile.role === 'worker' ? 'operator' : 'worker'
        const roleName = nextRole === 'worker' ? '클린파트너' : '공간파트너'

        if (!confirm(`${roleName}(으)로 역할을 전환하시겠습니까?`)) return

        setSwitching(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.from('users').update({ role: nextRole }).eq('id', profile.id)
            if (error) throw error

            // 역할에 맞는 대시보드로 이동
            router.push(nextRole === 'worker' ? '/clean' : '/dashboard')
            router.refresh()
        } catch (e) {
            alert('역할 전환 중 오류가 발생했습니다.')
            setSwitching(false)
        }
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <div className="page-container premium-bg" style={{ backgroundColor: '#fff', minHeight: '100dvh' }}>
            {/* 상단 프로필 헤더 - 화이트 톤 */}
            <div style={{ padding: '40px 20px 24px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'var(--color-primary)', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--color-border-light)' }}>
                        {profile.profile_image
                            ? <img src={profile.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : profile.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span className="badge-pill" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '11px' }}>
                                {profile.role === 'worker' ? '클린파트너' : '공간파트너'}
                            </span>
                            {profile.role === 'worker' && profile.is_verified && (
                                <span className="badge-pill" style={{ background: '#E6FFFA', color: '#00A3BF', fontSize: '11px' }}>
                                    안심 인증
                                </span>
                            )}
                        </div>
                        {editing ? (
                            <input style={{ background: '#F2F4F6', border: '1px solid var(--color-border)', borderRadius: 12, padding: '8px 12px', color: 'var(--color-text-primary)', fontSize: 20, fontWeight: 700, width: '100%' }}
                                value={name} onChange={e => setName(e.target.value)} />
                        ) : (
                            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>{profile.name}님</h1>
                        )}
                    </div>
                    <button onClick={() => setEditing(!editing)} style={{ fontSize: 20, color: 'var(--color-text-tertiary)' }}>
                        {editing ? 'ⓧ' : '✏️'}
                    </button>
                </div>

                {editing && (
                    <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease' }}>
                        <textarea style={{ width: '100%', background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, color: 'var(--color-text-primary)', fontSize: 15, resize: 'none' }}
                            rows={3} placeholder="자기소개를 입력하세요" value={bio} onChange={e => setBio(e.target.value)} />
                        <button className="btn btn-primary btn-full mt-sm" style={{ borderRadius: '14px', height: '48px' }} onClick={handleSave} disabled={saving}>
                            {saving ? <span className="spinner" /> : '프로필 저장하기'}
                        </button>
                    </div>
                )}
            </div>

            <div className="page-content" style={{ padding: '0 20px 100px' }}>
                {/* 1. 스파클 점수 (기존 매너 온도) */}
                <div className="card" style={{ padding: '24px', border: 'none', background: 'linear-gradient(135deg, #FFFEF9 0%, #FFF9E6 100%)', boxShadow: '0 8px 20px rgba(255, 212, 0, 0.1)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="flex items-center gap-xs">
                            <span style={{ fontSize: '20px' }}>⭐</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#856404' }}>스파클 점수</span>
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 900, color: '#FFD400', textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            {profile.manner_temperature ? Math.round(profile.manner_temperature * 2.7) : 98}%
                        </span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '99px', height: '12px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${profile.manner_temperature || 98}%`,
                            background: 'linear-gradient(90deg, #FFD400 0%, #FFB800 100%)',
                            height: '100%',
                            borderRadius: '99px',
                            boxShadow: '0 0 10px rgba(255, 212, 0, 0.5)'
                        }}></div>
                    </div>
                    <p className="text-xs mt-md text-secondary font-medium" style={{ color: '#856404', opacity: 0.8 }}>
                        반짝이는 서비스로 파트너님의 신뢰도가 매우 높습니다! ✨
                    </p>
                </div>

                {/* 2. 활동 통계 (클린파트너 전용) */}
                {profile.role === 'worker' && (
                    <div className="bento-grid mb-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-primary)' }}>{totalCompletedJobs}</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 600, marginTop: 4 }}>완료된 청소</div>
                        </div>
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFD400' }}>{profile.avg_rating?.toFixed(1) || '5.0'}</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 600, marginTop: 4 }}>평균 별점</div>
                        </div>
                    </div>
                )}

                {/* 3. 메뉴 리스트 - 세련된 카드 스타일 */}
                <div className="card" style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid #F2F4F6' }}>
                    <button
                        onClick={handleRoleSwitch}
                        disabled={switching}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', width: '100%', borderBottom: '1px solid #F2F4F6', background: 'none', textAlign: 'left' }}
                    >
                        <span style={{ fontSize: 24, padding: 10, background: 'var(--color-primary-light)', borderRadius: 12 }}>
                            {profile.role === 'worker' ? '🏠' : '🧹'}
                        </span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {profile.role === 'worker' ? '공간파트너로 전환' : '클린파트너로 전환'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>파트너 역할을 변경할 수 있습니다</div>
                        </div>
                        {switching ? (
                            <div className="spinner-sm" />
                        ) : (
                            <span style={{ color: 'var(--color-text-disabled)', fontSize: '20px' }}>›</span>
                        )}
                    </button>

                    {[
                        { icon: '🔔', label: '알림 설정', sub: '푸시 알림 및 소리 설정' },
                        { icon: '🏦', label: '계좌 관리', sub: '작업 대금 정산 계좌 설정' },
                        { icon: '📋', label: '고객 센터', sub: '자주 묻는 질문 및 1:1 문의' },
                        { icon: '🔒', label: '보안 및 약관', sub: '비밀번호 변경 및 정책 확인' },
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderBottom: i < 3 ? '1px solid #F2F4F6' : 'none', cursor: 'pointer' }}>
                            <span style={{ fontSize: 24, padding: 10, background: '#F9FAFB', borderRadius: 12 }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{item.sub}</div>
                            </div>
                            <span style={{ color: 'var(--color-text-disabled)', fontSize: '20px' }}>›</span>
                        </div>
                    ))}
                </div>

                <button className="btn btn-secondary btn-full mt-xl"
                    style={{ background: '#F2F4F6', color: '#8B95A1', border: 'none', borderRadius: 18, height: '56px', fontWeight: 700 }}
                    onClick={handleLogout} id="logout-btn">
                    로그아웃
                </button>
            </div>

            {/* 하단 내비게이션 - 댁시보드와 동일 스타일 */}
            <nav className="premium-bottom-nav">
                <Link href={profile.role === 'worker' ? '/clean' : '/dashboard'} className="nav-item">
                    <div className="nav-icon-box">🏠</div>
                    <span>홈</span>
                </Link>
                <Link href={profile.role === 'worker' ? '/clean/jobs' : '/requests'} className="nav-item">
                    <div className="nav-icon-box">📋</div>
                    <span>일정</span>
                </Link>
                <Link href="/spaces" className="nav-item">
                    <div className="nav-icon-box">🏢</div>
                    <span>공간</span>
                </Link>
                <Link href="/profile" className="nav-item active">
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
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
