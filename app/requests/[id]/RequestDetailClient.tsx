'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STATUS_MAP: Record<string, { label: string; cls: string; desc: string }> = {
    OPEN: { label: '매칭 중', cls: 'badge-open', desc: 'AI가 작업자를 찾고 있어요' },
    ASSIGNED: { label: '배정 완료', cls: 'badge-assigned', desc: '작업자가 배정됐어요' },
    EN_ROUTE: { label: '이동 중', cls: 'badge-assigned', desc: '작업자가 이동 중이에요' },
    ARRIVED: { label: '도착', cls: 'badge-assigned', desc: '작업자가 도착했어요' },
    IN_PROGRESS: { label: '청소 중', cls: 'badge-progress', desc: '청소가 진행 중이에요' },
    SUBMITTED: { label: '검수 대기', cls: 'badge-submitted', desc: 'AI가 사진을 검수 중이에요' },
    APPROVED: { label: '승인 완료', cls: 'badge-approved', desc: '청소가 완료됐어요! 정산 처리 중' },
    DISPUTED: { label: '분쟁 중', cls: 'badge-disputed', desc: '' },
    PAID_OUT: { label: '정산 완료', cls: 'badge-paid', desc: '정산이 완료됐어요' },
    CANCELED: { label: '취소', cls: '', desc: '' },
}

interface Props {
    job: any; photos: any[]; payment: any; userId: string
}

export default function RequestDetailClient({ job, photos, payment, userId }: Props) {
    const router = useRouter()
    const [approving, setApproving] = useState(false)
    const [disputing, setDisputing] = useState(false)
    const [disputeReason, setDisputeReason] = useState('')
    const [showDispute, setShowDispute] = useState(false)

    const st = STATUS_MAP[job.status] || { label: job.status, cls: '', desc: '' }
    const space = job.spaces
    const worker = job.users
    const isOperator = job.operator_id === userId
    const afterPhotos = photos.filter((p: any) => p.type === 'after')

    // 운영자: 수동 승인
    const handleApprove = async () => {
        setApproving(true)
        const supabase = createClient()
        await supabase.from('jobs').update({ status: 'APPROVED', auto_approved: false }).eq('id', job.id)
        // Finance Agent 호출
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/finance-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ job_id: job.id })
        }).catch(console.error)
        router.refresh()
        setApproving(false)
    }

    // 분쟁 신고
    const handleDispute = async () => {
        if (!disputeReason.trim()) return
        const supabase = createClient()
        await supabase.from('disputes').insert({
            job_id: job.id, reporter_id: userId,
            category: 'photo_quality', description: disputeReason,
        })
        await supabase.from('jobs').update({ status: 'DISPUTED' }).eq('id', job.id)
        setShowDispute(false)
        router.refresh()
    }

    return (
        <div className="page-container">
            <header className="detail-header">
                <button onClick={() => router.back()} className="back-btn">←</button>
                <h1 className="detail-title">청소 요청 상세</h1>
                <div style={{ width: 40 }} />
            </header>

            <div className="page-content">
                {/* 상태 카드 */}
                <div className="status-card card">
                    <div className="status-card-top">
                        <div>
                            <h2 className="status-space">{space?.name}</h2>
                            <p className="status-addr text-sm text-secondary">{space?.address}</p>
                        </div>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    {st.desc && <p className="status-desc">{st.desc}</p>}
                    <div className="status-meta">
                        <span>⏰ {new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-primary font-bold">₩{job.price.toLocaleString()}</span>
                    </div>
                </div>

                {/* 작업자 정보 */}
                {worker && (
                    <div className="worker-card card">
                        <div className="worker-info">
                            <div className="avatar avatar-md">{worker.name?.[0]}</div>
                            <div>
                                <div className="worker-name">{worker.name}</div>
                                <div className="text-sm text-secondary">⭐ {worker.avg_rating?.toFixed(1) || '-'} · {worker.tier}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 청소 완료 사진 */}
                {afterPhotos.length > 0 && (
                    <div className="photos-section">
                        <h3 className="section-label">청소 완료 사진 ({afterPhotos.length}장)</h3>
                        <div className="photo-grid">
                            {afterPhotos.map((p: any) => (
                                <div key={p.id} className="photo-wrapper">
                                    <img src={p.photo_url} alt="" className="photo-thumb" />
                                    {p.ai_quality_score && (
                                        <div className="ai-score" style={{ background: p.ai_quality_score >= 80 ? 'var(--color-primary)' : 'var(--color-orange)' }}>
                                            AI {p.ai_quality_score}점
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 정산 정보 */}
                {payment && (
                    <div className="payment-card card">
                        <h3 className="section-label">정산 내역</h3>
                        <div className="payment-rows">
                            <div className="payment-row"><span>총 금액</span><span>₩{payment.gross_amount.toLocaleString()}</span></div>
                            <div className="payment-row text-secondary text-sm"><span>플랫폼 수수료 (10%)</span><span>-₩{payment.platform_fee.toLocaleString()}</span></div>
                            <div className="payment-row text-secondary text-sm"><span>원천징수 (3.3%)</span><span>-₩{payment.withholding_tax.toLocaleString()}</span></div>
                            <div className="divider" />
                            <div className="payment-row font-bold text-primary"><span>작업자 수령액</span><span>₩{payment.worker_payout.toLocaleString()}</span></div>
                            <div className="payment-row text-sm text-secondary"><span>상태</span><span className={`badge ${payment.status === 'RELEASED' ? 'badge-approved' : 'badge-open'}`}>{payment.status === 'HELD' ? '입금 대기' : payment.status === 'RELEASED' ? '입금 완료' : payment.status}</span></div>
                        </div>
                    </div>
                )}

                {/* 운영자 액션: 검수 대기 */}
                {isOperator && job.status === 'SUBMITTED' && (
                    <div className="action-section">
                        <p className="text-sm text-secondary mb-md">
                            {job.auto_approved ? '✅ AI가 자동 검수 완료했어요.' : '📸 청소 사진을 확인하고 승인해주세요.'}
                        </p>
                        <div className="action-btns">
                            <button className="btn btn-primary btn-full" onClick={handleApprove} disabled={approving} id="approve-btn">
                                {approving ? <span className="spinner" /> : '✅ 청소 승인'}
                            </button>
                            <button className="btn btn-secondary btn-full" onClick={() => setShowDispute(true)} id="dispute-btn">
                                ⚠️ 문제 신고
                            </button>
                        </div>
                    </div>
                )}

                {/* 분쟁 모달 */}
                {showDispute && (
                    <div className="modal-overlay" onClick={() => setShowDispute(false)}>
                        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                            <div className="modal-handle" />
                            <h3 className="font-bold text-lg mb-md">문제 신고</h3>
                            <div className="form-group">
                                <label className="form-label">문제 내용</label>
                                <textarea className="form-input" rows={4} placeholder="구체적으로 어떤 문제가 있었나요?"
                                    value={disputeReason} onChange={e => setDisputeReason(e.target.value)} />
                            </div>
                            <button className="btn btn-danger btn-full mt-md" onClick={handleDispute} disabled={!disputeReason.trim()}>
                                신고 접수하기
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
        .detail-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light); background: var(--color-surface); position: sticky; top: 0; z-index: 10; }
        .back-btn { font-size: 22px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .back-btn:hover { background: var(--color-bg); }
        .detail-title { font-size: var(--font-lg); font-weight: 700; }
        .status-card { margin-bottom: var(--spacing-md); }
        .status-card-top { display: flex; justify-content: space-between; align-items: flex-start; padding: var(--spacing-md); }
        .status-space { font-size: var(--font-lg); font-weight: 700; }
        .status-addr { margin-top: 2px; }
        .status-desc { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--font-sm); color: var(--color-text-secondary); background: var(--color-bg); }
        .status-meta { display: flex; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); font-size: var(--font-sm); border-top: 1px solid var(--color-border-light); }
        .worker-card { display: flex; padding: var(--spacing-md); margin-bottom: var(--spacing-md); }
        .worker-info { display: flex; gap: var(--spacing-md); align-items: center; }
        .worker-name { font-weight: 700; font-size: var(--font-md); }
        .photos-section { margin-bottom: var(--spacing-md); }
        .section-label { font-size: var(--font-sm); font-weight: 700; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm); }
        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); }
        .photo-wrapper { position: relative; aspect-ratio: 1; }
        .photo-thumb { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
        .ai-score { position: absolute; bottom: 4px; left: 4px; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #fff; }
        .payment-card { margin-bottom: var(--spacing-md); padding: var(--spacing-md); }
        .payment-rows { display: flex; flex-direction: column; gap: var(--spacing-xs); }
        .payment-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-sm); }
        .action-section { margin-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0)); }
        .action-btns { display: flex; flex-direction: column; gap: var(--spacing-sm); }
      `}</style>
        </div>
    )
}
