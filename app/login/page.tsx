'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
    const searchParams = useSearchParams()
    const defaultRole = searchParams.get('role') as 'operator' | 'worker' | null
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Email Auth State
    const [isEmailView, setIsEmailView] = useState(!defaultRole)
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')

    const handleKakaoLogin = async () => {
        setLoading(true)
        setError('')
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: {
                    redirectTo: `${window.location.origin.trim()}/auth/callback${defaultRole ? `?role=${defaultRole}` : ''}`,
                    queryParams: {
                        scope: 'profile_nickname profile_image account_email'
                    },
                    scopes: 'profile_nickname profile_image account_email',
                },
            })
            if (error) throw error
        } catch (e: unknown) {
            setError('로그인 중 오류가 발생했어요. 다시 시도해주세요.')
            setLoading(false)
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const supabase = createClient()

        try {
            if (isSignUp) {
                if (!name.trim()) throw new Error('이름을 입력해주세요.')
                const { data, error: authError } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { name, role: defaultRole || 'worker' } }
                })
                if (authError) throw authError
                if (data.user) {
                    // 유저 테이블에 메타 생성
                    await supabase.from('users').upsert({
                        id: data.user.id,
                        email,
                        name,
                        role: defaultRole || 'worker',
                        is_active: true,
                        is_verified: false,
                    })
                    if (data.session) {
                        window.location.href = defaultRole === 'operator' ? '/dashboard' : '/clean'
                    } else {
                        alert('회원가입이 완료되었습니다. 이메일을 확인하거나 바로 로그인해주세요.')
                        setIsSignUp(false)
                    }
                }
            } else {
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email, password
                })
                if (authError) throw authError
                if (data.user) {
                    const { data: u } = await supabase.from('users').select('role').eq('id', data.user.id).single()
                    let targetRole = u?.role || defaultRole || 'worker'
                    // 역할 다르면 업데이트
                    if (defaultRole && defaultRole !== targetRole) {
                        await supabase.from('users').update({ role: defaultRole }).eq('id', data.user.id)
                        targetRole = defaultRole
                    }
                    window.location.href = targetRole === 'operator' ? '/dashboard' : '/clean'
                }
            }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 일치하지 않습니다.' : err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container login-page">
            <div className="login-inner">
                {/* 로고 */}
                <div className="login-logo mb-md">
                    <span style={{ fontSize: 56 }}>🧹</span>
                    <h1 className="login-title">CleanGig</h1>
                    <p className="login-subtitle">
                        {defaultRole === 'operator'
                            ? '공간파트너로 시작하기'
                            : defaultRole === 'worker'
                                ? '클린파트너로 시작하기'
                                : '청소 매칭 플랫폼'}
                    </p>
                </div>

                {/* 혜택 요약 */}
                {!isEmailView && (
                    <div className="login-benefits">
                        {defaultRole === 'worker' ? (
                            <>
                                <div className="benefit-item">✅ 가까운 곳 청소만 골라서 수락</div>
                                <div className="benefit-item">✅ 작업 완료 후 빠른 정산</div>
                                <div className="benefit-item">✅ 앱 설치 없이 빠르게 매칭</div>
                            </>
                        ) : (
                            <>
                                <div className="benefit-item">✅ 5분 안에 검증된 클린파트너 매칭</div>
                                <div className="benefit-item">✅ AI가 청소 품질 자동 검수</div>
                                <div className="benefit-item">✅ 에스크로로 결제금 안전 보호</div>
                            </>
                        )}
                    </div>
                )}

                <div className="login-cta" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    {isEmailView ? (
                        <form onSubmit={handleEmailAuth} className="email-form">
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                                {isSignUp ? '이메일로 회원가입' : '이메일로 로그인'}
                            </h3>
                            {isSignUp && (
                                <input type="text" placeholder="이름을 입력하세요" className="form-input mb-sm"
                                    value={name} onChange={e => setName(e.target.value)} required />
                            )}
                            <input type="email" placeholder="이메일을 입력하세요" className="form-input mb-sm"
                                value={email} onChange={e => setEmail(e.target.value)} required />
                            <input type="password" placeholder="비밀번호" className="form-input mb-md"
                                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

                            <button className="btn btn-primary btn-full btn-lg mb-sm" type="submit" disabled={loading}>
                                {loading ? <span className="spinner" /> : isSignUp ? '회원가입 완료' : '로그인'}
                            </button>

                            <div className="text-secondary text-sm">
                                {isSignUp ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'} {' '}
                                <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ color: 'var(--color-primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    {isSignUp ? '로그인하기' : '회원가입하기'}
                                </button>
                            </div>

                            <div className="divider" style={{ margin: '24px 0' }} />
                            <button type="button" className="btn btn-kakao btn-full mb-md" onClick={handleKakaoLogin} disabled={loading}>
                                카카오로 간편하게 시작하기
                            </button>
                        </form>
                    ) : (
                        <>
                            <button
                                className="btn btn-kakao btn-full btn-lg mb-sm"
                                onClick={handleKakaoLogin}
                                disabled={loading}
                                id="kakao-login-btn"
                            >
                                {loading ? (
                                    <span className="spinner" style={{ borderTopColor: '#3C1E1E' }} />
                                ) : (
                                    <>
                                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd"
                                                d="M11 2C6.03 2 2 5.25 2 9.25c0 2.54 1.68 4.77 4.22 6.06l-1.08 3.98a.3.3 0 0 0 .44.34L10.1 17a10.7 10.7 0 0 0 .9.04c4.97 0 9-3.25 9-7.24C20 5.8 15.97 2 11 2Z"
                                                fill="#3C1E1E" />
                                        </svg>
                                        카카오로 시작하기
                                    </>
                                )}
                            </button>
                            <button type="button" className="btn btn-full btn-lg" style={{ background: '#fff', border: '2px solid #E2E8F0', color: '#64748B' }} onClick={() => setIsEmailView(true)}>
                                이메일로 로그인
                            </button>
                        </>
                    )}

                    {error && (
                        <div className="error-msg" role="alert" style={{ marginTop: 16 }}>⚠️ {error}</div>
                    )}
                </div>

                {/* 역할 전환 */}
                {!isSignUp && (
                    <div className="login-switch mt-auto pb-lg">
                        {defaultRole === 'worker' ? (
                            <a href="/login?role=operator" className="switch-link">
                                공간파트너이신가요? →
                            </a>
                        ) : (
                            <a href="/login?role=worker" className="switch-link">
                                클린파트너이신가요? →
                            </a>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
        .login-page {
          min-height: 100dvh;
          background: linear-gradient(180deg, #F0FDF7 0%, #FFFFFF 50%);
        }
        .login-inner {
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          padding: calc(var(--spacing-3xl) + env(safe-area-inset-top, 0)) var(--spacing-lg) var(--spacing-lg);
          text-align: center; gap: var(--spacing-lg);
          max-width: 400px; margin: 0 auto;
        }
        .login-logo { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); }
        .login-title { font-size: var(--font-3xl); font-weight: 800; letter-spacing: -0.03em; }
        .login-subtitle { font-size: var(--font-md); color: var(--color-text-secondary); }
        .login-benefits {
          width: 100%; background: var(--color-surface);
          border: 1px solid var(--color-border-light);
          border-radius: 16px; padding: var(--spacing-md);
          display: flex; flex-direction: column; gap: var(--spacing-sm);
        }
        .benefit-item { font-size: var(--font-sm); color: var(--color-text-secondary); text-align: left; }
        .login-cta { width: 100%; display: flex; flex-direction: column; }
        .email-form { width: 100%; text-align: left; background: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--color-border-light); }
        .error-msg {
          background: var(--color-red-light); color: var(--color-red);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--btn-radius-sm); font-size: var(--font-sm);
        }
        .login-switch { }
        .switch-link {
          color: var(--color-primary); font-size: var(--font-sm);
          font-weight: 600; text-decoration: underline;
        }
      `}</style>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}><div className="spinner" /></div>}>
            <LoginContent />
        </Suspense>
    )
}
