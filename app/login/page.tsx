'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
    const searchParams = useSearchParams()
    const defaultRole = searchParams.get('role') as 'operator' | 'worker' | null
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleKakaoLogin = async () => {
        setLoading(true)
        setError('')
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: defaultRole ? { role: defaultRole } : {},
                },
            })
            if (error) throw error
        } catch (e: unknown) {
            setError('로그인 중 오류가 발생했어요. 다시 시도해주세요.')
            setLoading(false)
        }
    }

    return (
        <div className="page-container login-page">
            <div className="login-inner">
                {/* 로고 */}
                <div className="login-logo">
                    <span style={{ fontSize: 56 }}>🧹</span>
                    <h1 className="login-title">CleanGig</h1>
                    <p className="login-subtitle">
                        {defaultRole === 'operator'
                            ? '공간 운영자로 시작하기'
                            : defaultRole === 'worker'
                                ? '청소 작업자로 시작하기'
                                : '청소 매칭 플랫폼'}
                    </p>
                </div>

                {/* 혜택 요약 */}
                <div className="login-benefits">
                    {defaultRole === 'worker' ? (
                        <>
                            <div className="benefit-item">✅ 가까운 곳 일감만 골라서 수락</div>
                            <div className="benefit-item">✅ 작업 완료 후 빠른 정산</div>
                            <div className="benefit-item">✅ 앱 설치 없이 카카오로 바로 시작</div>
                        </>
                    ) : (
                        <>
                            <div className="benefit-item">✅ 5분 안에 검증된 작업자 매칭</div>
                            <div className="benefit-item">✅ AI가 청소 품질 자동 검수</div>
                            <div className="benefit-item">✅ 에스크로로 결제금 안전 보호</div>
                        </>
                    )}
                </div>

                {/* 카카오 로그인 버튼 */}
                <div className="login-cta">
                    <button
                        className="btn btn-kakao btn-full btn-lg"
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

                    {error && (
                        <div className="error-msg" role="alert">⚠️ {error}</div>
                    )}
                </div>

                {/* 역할 전환 */}
                <div className="login-switch">
                    {defaultRole === 'worker' ? (
                        <a href="/login?role=operator" className="switch-link">
                            공간 운영자이신가요? →
                        </a>
                    ) : (
                        <a href="/login?role=worker" className="switch-link">
                            청소 작업자이신가요? →
                        </a>
                    )}
                </div>

                {/* 법적 고지 */}
                <p className="login-legal">
                    시작하면{' '}
                    <a href="/terms">이용약관</a>과{' '}
                    <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.
                    <br />본 플랫폼은 통신판매중개업자로 거래 당사자가 아닙니다.
                </p>
            </div>

            <style jsx>{`
        .login-page {
          min-height: 100dvh;
          background: linear-gradient(180deg, #F0FDF7 0%, #FFFFFF 50%);
        }
        .login-inner {
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: var(--spacing-xl) var(--spacing-lg);
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
        .login-cta { width: 100%; display: flex; flex-direction: column; gap: var(--spacing-sm); }
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
        .login-legal {
          font-size: var(--font-xs); color: var(--color-text-tertiary);
          line-height: 1.7;
        }
        .login-legal a { color: var(--color-text-secondary); text-decoration: underline; }
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
