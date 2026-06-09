'use client'

import { useEffect, useState } from 'react'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'

interface Props {
    isOpen: boolean
    onClose: () => void
    amount: number
    jobName: string
    jobId: string
    paymentContext: 'accept' | 'extra'
    workerId?: string
    appId?: string
}

export default function PaymentModal({ isOpen, onClose, amount, jobName, jobId, paymentContext, workerId, appId }: Props) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [widgets, setWidgets] = useState<Awaited<ReturnType<Awaited<ReturnType<typeof loadTossPayments>>['widgets']>> | null>(null)

    useEffect(() => {
        if (!isOpen) return

        let mounted = true;
        (async () => {
            try {
                const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_ck_ex6BJGQOVDx5ZRKQjQ2nVW4w2zNb"
                const tossPayments = await loadTossPayments(clientKey)
                if (!mounted) return

                const w = tossPayments.widgets({ customerKey: ANONYMOUS })
                await w.setAmount({ currency: 'KRW', value: amount })
                await w.renderPaymentMethods({ selector: '#payment-widget' })
                await w.renderAgreement({ selector: '#agreement' })

                if (mounted) setWidgets(w)
            } catch (err) {
                console.error("토스페이먼츠 위젯 로드 실패:", err)
            }
        })()

        return () => { mounted = false }
    }, [isOpen, amount])

    if (!isOpen) return null

    const handlePay = async () => {
        if (!widgets) return
        setIsProcessing(true)

        try {
            const orderId = `ORDER_${Date.now()}_${jobId.substring(0, 8)}`

            const originURL = typeof window !== 'undefined' ? window.location.origin : ''
            const successUrl = new URL(`${originURL}/payment/success`)
            successUrl.searchParams.append('context', paymentContext)
            successUrl.searchParams.append('jobId', jobId)
            if (workerId) successUrl.searchParams.append('workerId', workerId)
            if (appId) successUrl.searchParams.append('appId', appId)

            await widgets.requestPayment({
                orderId,
                orderName: jobName,
                successUrl: successUrl.toString(),
                failUrl: `${originURL}/payment/fail?jobId=${jobId}`,
            })
        } catch (err) {
            console.error('결제 요청 에러:', err)
            setIsProcessing(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20
        }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, padding: 0, overflowY: 'auto', maxHeight: '90vh', animation: 'slideUp 0.3s ease-out' }}>
                <div style={{ padding: '24px 24px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>안전 결제</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: 0, color: '#999' }}>×</button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>{jobName}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#00C471' }}>
                            {amount.toLocaleString()}원
                        </div>
                    </div>

                    {/* 토스 위젯이 렌더링될 DOM 노드들 */}
                    <div id="payment-widget" style={{ minHeight: 150 }} />
                    <div id="agreement" />
                </div>

                <div style={{ padding: 24, background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handlePay}
                        disabled={isProcessing || !widgets}
                        style={{ height: 54, fontSize: 16 }}
                    >
                        {isProcessing ? <span className="spinner" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> : `${amount.toLocaleString()}원 결제하기`}
                    </button>

                    <button
                        className="btn btn-full"
                        onClick={() => {
                            const originURL = typeof window !== 'undefined' ? window.location.origin : ''
                            const successUrl = new URL(`${originURL}/payment/success`)
                            successUrl.searchParams.append('context', paymentContext)
                            successUrl.searchParams.append('jobId', jobId)
                            if (workerId) successUrl.searchParams.append('workerId', workerId)
                            if (appId) successUrl.searchParams.append('appId', appId)
                            successUrl.searchParams.append('status', 'DONE') // Mock status
                            window.location.href = successUrl.toString()
                        }}
                        style={{ height: 48, fontSize: 14, marginTop: 12, backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px dashed #BFDBFE' }}
                    >
                        ⚡ [테스트] 결제 없이 즉시 매칭 완료
                    </button>

                    <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 12 }}>
                        쓱싹 에스크로 안전 결제 연동 테스트
                    </div>
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
