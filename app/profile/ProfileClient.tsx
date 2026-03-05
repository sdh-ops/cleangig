'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
        <div className="page-container">
            {/* 헤더 프로필 */}
            <div style={{ background: 'linear-gradient(135deg, #112D4E, #3F72AF)', padding: 'var(--spacing-xl) var(--spacing-md)', paddingTop: 'calc(var(--spacing-xl) + env(safe-area-inset-top, 0))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.3)' }}>
                        {profile.profile_image
                            ? <img src={profile.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : profile.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        {editing ? (
                            <input style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 18, fontWeight: 700, width: '100%' }}
                                value={name} onChange={e => setName(e.target.value)} />
                        ) : (
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{profile.name}</h1>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                                {profile.role === 'worker' ? '클린파트너' : '공간파트너'}
                            </span>
                            {profile.role === 'worker' && profile.is_verified && (
                                <span style={{ background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.5)', color: '#A7F3D0', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                    안심 파트너
                                </span>
                            )}
                            {profile.role === 'worker' && tierInfo && (
                                <span style={{ background: 'rgba(255,255,255,0.15)', border: `1px solid ${tierInfo.color}66`, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 12 }}>{tierInfo.label.split(' ')[0]}</span>
                                    {tierInfo.label.split(' ')[1]}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setEditing(!editing)} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 22 }}>✏️</button>
                </div>

                {editing && (
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                        <textarea style={{ width: '100%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, resize: 'none' }}
                            rows={2} placeholder="자기소개를 입력하세요" value={bio} onChange={e => setBio(e.target.value)} />
                        <button className="btn btn-primary btn-full mt-sm" onClick={handleSave} disabled={saving}>
                            {saving ? <span className="spinner" /> : '저장하기'}
                        </button>
                    </div>
                )}
            </div>

            <div className="page-content">
                {/* 매너 온도 (공통) */}
                <div className="card" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>매너 온도</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#E11D48' }}>{profile.manner_temperature || 36.5}°C 🌡️</span>
                    </div>
                    <div style={{ background: '#FEF2F2', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (profile.manner_temperature || 36.5))}%`, background: 'linear-gradient(90deg, #FCA5A5 0%, #E11D48 100%)', height: '100%', borderRadius: '8px', transition: 'width 1s ease-out' }}></div>
                    </div>
                </div>

                {/* 통계 (클린파트너) */}
                {profile.role === 'worker' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            {[
                                { label: '전체 작업', val: profile.total_jobs || 0 },
                                { label: '완료', val: totalCompletedJobs },
                                { label: '평점', val: profile.avg_rating ? `⭐ ${profile.avg_rating.toFixed(1)}` : '-' },
                            ].map((s, i) => (
                                <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 14, padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                    <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>{s.val}</div>
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* 등급 정보 */}
                        {tierInfo && (
                            <div className="card" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{tierInfo.label}</div>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>{tierInfo.desc}</div>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)' }}>다음: {tierInfo.next}</div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 메뉴 목록 */}
                <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <button
                        onClick={handleRoleSwitch}
                        disabled={switching}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', width: '100%', borderBottom: '1px solid var(--color-border-light)', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <span style={{ fontSize: 20 }}>{profile.role === 'worker' ? '🏠' : '🧹'}</span>
                        <span style={{ flex: 1, fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {profile.role === 'worker' ? '공간파트너로 전환하기' : '클린파트너로 전환하기'}
                        </span>
                        {switching ? (
                            <div className="spinner-sm" style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
                        )}
                    </button>

                    {[
                        { icon: '🔔', label: '푸시 알림 설정', href: '#' },
                        { icon: '🏦', label: '정산 계좌 등록', href: '#' },
                        { icon: '📋', label: '이용약관', href: '/terms' },
                        { icon: '🔐', label: '개인정보처리방침', href: '/privacy' },
                    ].map((item, i) => (
                        <a key={i} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderBottom: i < 3 ? '1px solid var(--color-border-light)' : 'none' }}>
                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                            <span style={{ flex: 1, fontSize: 'var(--font-md)' }}>{item.label}</span>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
                        </a>
                    ))}
                </div>

                <button className="btn btn-secondary btn-full" onClick={handleLogout} id="logout-btn">
                    로그아웃
                </button>
            </div>

            {/* 하단 탭 */}
            <nav className="bottom-nav">
                {profile.role === 'worker' ? (
                    <>
                        <a href="/clean" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>오늘
                        </a>
                        <a href="/clean/jobs" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>청소 찾기
                        </a>
                        <a href="/earnings" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>정산
                        </a>
                    </>
                ) : (
                    <>
                        <a href="/dashboard" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>홈
                        </a>
                        <a href="/requests" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" /></svg>요청 목록
                        </a>
                        <a href="/spaces" className="bottom-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>공간
                        </a>
                    </>
                )}
                <a href="/profile" className="bottom-nav-item active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>내 정보
                </a>
            </nav>
        </div>
    )
}
