'use client'

import { useState } from 'react'

interface Props {
    isOpen: boolean
    onClose: () => void
    amount: number
    jobName: string
    onSuccess: () => void
}

export default function PaymentModal({ isOpen, onClose, amount, jobName, onSuccess }: Props) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [payMethod, setPayMethod] = useState<'card' | 'transfer'>('card')

    if (!isOpen) return null

    const handlePay = () => {
        setIsProcessing(true)
        // 토스페이먼츠 가상 결제 시뮬레이션 지연
        setTimeout(() => {
            setIsProcessing(false)
            onSuccess()
        }, 2000)
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20
        }}>
            <div className="card" style={{ width: '100%', maxWidth: 400, padding: 0, overflow: 'hidden', animation: 'slideUp 0.3s ease-out' }}>
                <div style={{ padding: '24px 24px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>안전 결제</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: 0, color: '#999' }}>×</button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{jobName}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-primary)' }}>
                            {amount.toLocaleString()}원
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                            결제 금액은 안전하게 에스크로에 보관되며, 청소 완료 승인 시 클린파트너에게 정산됩니다. (수수료 10% 포함)
                        </p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>결제 수단 선택 (토스페이먼츠 테스트)</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setPayMethod('card')}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: 8, border: `2px solid ${payMethod === 'card' ? 'var(--color-primary)' : '#E2E8F0'}`,
                                    background: payMethod === 'card' ? 'var(--color-primary-light)' : '#fff',
                                    fontWeight: 600, color: payMethod === 'card' ? 'var(--color-primary-dark)' : '#64748B', cursor: 'pointer'
                                }}
                            >💳 신용카드</button>
                            <button
                                onClick={() => setPayMethod('transfer')}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: 8, border: `2px solid ${payMethod === 'transfer' ? 'var(--color-primary)' : '#E2E8F0'}`,
                                    background: payMethod === 'transfer' ? 'var(--color-primary-light)' : '#fff',
                                    fontWeight: 600, color: payMethod === 'transfer' ? 'var(--color-primary-dark)' : '#64748B', cursor: 'pointer'
                                }}
                            >🏦 계좌이체</button>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 24, background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handlePay}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <span className="spinner" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> : `${amount.toLocaleString()}원 결제하기`}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
