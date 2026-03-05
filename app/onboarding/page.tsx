'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function OnboardingContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [selectedRole, setSelectedRole] = useState<'operator' | 'worker'>(
        (searchParams.get('role') as 'operator' | 'worker') || 'worker'
    )
    const [loading, setLoading] = useState(false)

    const handleRoleSelect = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        await supabase.from('users').update({ role: selectedRole }).eq('id', user.id)

        if (selectedRole === 'operator') {
            router.push('/dashboard')
        } else {
            router.push('/clean')
        }
    }

    return (
        <div className="page-container">
            <div className="onboarding-inner">
                <div className="onboarding-logo">🧹</div>
                <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.02em', textAlign: 'center' }}>
                    어떤 역할로 시작하시나요?
                </h1>
                <p className="text-secondary text-sm" style={{ textAlign: 'center' }}>
                    나중에 설정에서 변경할 수 있어요
                </p>

                <div className="role-cards">
                    <button
                        className={`role-card ${selectedRole === 'operator' ? 'selected' : ''}`}
                        onClick={() => setSelectedRole('operator')}
                        id="role-operator"
                    >
                        <div className="role-icon">🏠</div>
                        <div className="role-content">
                            <div className="role-title">공간파트너</div>
                            <div className="role-desc">에어비앤비·파티룸·무인매장 등<br />공간을 운영하고 청소를 맡기고 싶어요</div>
                        </div>
                        <div className="role-check">{selectedRole === 'operator' ? '✅' : '○'}</div>
                    </button>

                    <button
                        className={`role-card ${selectedRole === 'worker' ? 'selected' : ''}`}
                        onClick={() => setSelectedRole('worker')}
                        id="role-worker"
                    >
                        <div className="role-icon">🧹</div>
                        <div className="role-content">
                            <div className="role-title">클린파트너</div>
                            <div className="role-desc">원하는 시간에 가까운 곳에서<br />청소 부업을 하고 싶어요</div>
                        </div>
                        <div className="role-check">{selectedRole === 'worker' ? '✅' : '○'}</div>
                    </button>
                </div>

                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={handleRoleSelect}
                    disabled={loading}
                    id="onboarding-confirm"
                >
                    {loading ? <span className="spinner" /> : `${selectedRole === 'operator' ? '공간파트너' : '클린파트너'}로 시작하기 →`}
                </button>
            </div>

            <style jsx>{`
        .onboarding-inner {
          min-height: 100dvh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: var(--spacing-xl) var(--spacing-lg); gap: var(--spacing-lg);
        }
        .onboarding-logo { font-size: 64px; }
        .role-cards { width: 100%; display: flex; flex-direction: column; gap: var(--spacing-md); }
        .role-card {
          width: 100%; display: flex; align-items: center; gap: var(--spacing-md);
          padding: var(--spacing-lg); border-radius: 20px; text-align: left;
          border: 2px solid var(--color-border);
          background: var(--color-surface);
          transition: all var(--transition-fast); cursor: pointer;
        }
        .role-card.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-light);
          box-shadow: 0 0 0 3px rgba(0,196,113,0.12);
        }
        .role-icon { font-size: 36px; flex-shrink: 0; }
        .role-content { flex: 1; }
        .role-title { font-size: var(--font-md); font-weight: 700; margin-bottom: 4px; }
        .role-desc { font-size: var(--font-sm); color: var(--color-text-secondary); line-height: 1.5; }
        .role-check { font-size: 22px; flex-shrink: 0; }
      `}</style>
        </div>
    )
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}><div className="spinner" /></div>}>
            <OnboardingContent />
        </Suspense>
    )
}
