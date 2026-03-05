'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STATUS_MAP: Record<string, { label: string; cls: string; desc: string }> = {
    OPEN: { label: '매칭 중', cls: 'badge-open', desc: 'AI가 클린파트너를 찾고 있어요' },
    ASSIGNED: { label: '배정 완료', cls: 'badge-assigned', desc: '클린파트너가 배정됐어요' },
    EN_ROUTE: { label: '이동 중', cls: 'badge-assigned', desc: '클린파트너가 이동 중이에요' },
    ARRIVED: { label: '도착', cls: 'badge-assigned', desc: '클린파트너가 도착했어요' },
    IN_PROGRESS: { label: '청소 중', cls: 'badge-progress', desc: '청소가 진행 중이에요' },
    SUBMITTED: { label: '검수 대기', cls: 'badge-submitted', desc: 'AI가 사진을 검수 중이에요' },
    APPROVED: { label: '승인 완료', cls: 'badge-approved', desc: '청소가 완료됐어요! 정산 처리 중' },
    DISPUTED: { label: '분쟁 중', cls: 'badge-disputed', desc: '' },
    PAID_OUT: { label: '정산 완료', cls: 'badge-paid', desc: '정산이 완료됐어요' },
    CANCELED: { label: '취소', cls: '', desc: '' },
}

interface Props {
    job: any; photos: any[]; payment: any; applications: any[]; userId: string; initialIsFavorite?: boolean
}

export default function RequestDetailClient({ job, photos, payment, applications, userId, initialIsFavorite = false }: Props) {
    const router = useRouter()
    const [approving, setApproving] = useState(false)
    const [disputing, setDisputing] = useState(false)
    const [disputeReason, setDisputeReason] = useState('')
    const [showDispute, setShowDispute] = useState(false)
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
    const [togglingFav, setTogglingFav] = useState(false)

    const st = STATUS_MAP[job.status] || { label: job.status, cls: '', desc: '' }
    const space = job.spaces
    const worker = job.users
    const isOperator = job.operator_id === userId
    const afterPhotos = photos.filter((p: any) => p.type === 'after')

    // 공간파트너: 수동 승인
    const handleApprove = async () => {
        if (job.extra_charge_amount > 0) {
            if (!window.confirm(`클린파트너가 추가 요금 ${job.extra_charge_amount.toLocaleString()}원을 청구했습니다.\n사유: ${job.extra_charge_reason}\n\n승인하시겠습니까? 승인 시 기존 결제 금액에 더해 추가 결제가 진행됩니다.`)) return
        } else {
            if (!window.confirm('청소 결과를 승인하시겠습니까? 승인 시 정산이 진행됩니다.')) return
        }

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

    // 공간파트너: 지원자 선발 (승낙)
    const handleAcceptApplicant = async (appId: string, workerId: string) => {
        if (!confirm('이 클린파트너를 배정하시겠습니까?')) return
        setApproving(true)
        const supabase = createClient()
        // 1. Job 상태 업데이트
        await supabase.from('jobs').update({ status: 'ASSIGNED', worker_id: workerId }).eq('id', job.id)
        // 2. 해당 지원서는 ACCEPTED
        await supabase.from('job_applications').update({ status: 'ACCEPTED' }).eq('id', appId)
        // 3. 나머지 지원서는 REJECTED
        await supabase.from('job_applications').update({ status: 'REJECTED' }).eq('job_id', job.id).neq('id', appId)

        alert('성공적으로 배정되었습니다.')
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

    // 단골 파트너 토글
    const handleToggleFavorite = async () => {
        if (!worker) return
        setTogglingFav(true)
        const supabase = createClient()
        if (isFavorite) {
            await supabase.from('favorite_partners')
                .delete()
                .eq('operator_id', userId)
                .eq('worker_id', worker.id)
            setIsFavorite(false)
        } else {
            await supabase.from('favorite_partners')
                .insert({ operator_id: userId, worker_id: worker.id })
            setIsFavorite(true)
        }
        setTogglingFav(false)
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

                {/* 이동 중(EN_ROUTE) 안심 모니터링 패널 */}
                {job.status === 'EN_ROUTE' && isOperator && (
                    <div className="card mb-md p-md" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                        <div className="flex items-start gap-sm">
                            <span style={{ fontSize: 24 }}>🚗</span>
                            <div>
                                <h3 className="font-bold mb-xs" style={{ color: '#0369A1', fontSize: 15 }}>클린파트너가 이동 중입니다</h3>
                                <p className="text-sm" style={{ color: '#0284C7', marginBottom: 12 }}>
                                    클린파트너가 현장으로 출발했습니다. 지도 상의 이동 동선(ETA) 추적 기능은 추후 정식 연동될 예정입니다.
                                </p>
                                <div className="flex items-center gap-xs text-xs font-bold" style={{ color: '#0369A1', background: '#E0F2FE', padding: '6px 12px', borderRadius: 12, display: 'inline-flex' }}>
                                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#0369A1', borderRightColor: 'transparent' }} />
                                    도착 예정 시간(ETA): 약 15~20분
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 클린파트너 정보 */}
                {worker ? (
                    <div className="worker-card card">
                        <div className="worker-info" style={{ width: '100%', justifyContent: 'space-between' }}>
                            <div className="flex gap-md items-center">
                                <div className="avatar avatar-md" style={{ background: 'var(--color-primary)' }}>{worker.name?.[0]}</div>
                                <div>
                                    <div className="worker-name">{worker.name}</div>
                                    <div className="text-sm text-secondary">⭐ {worker.avg_rating?.toFixed(1) || '-'} · {worker.tier}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleFavorite}
                                disabled={togglingFav}
                                style={{
                                    background: isFavorite ? '#FEF2F2' : 'var(--color-surface)',
                                    color: isFavorite ? '#DC2626' : 'var(--color-text-secondary)',
                                    border: `1px solid ${isFavorite ? '#FCA5A5' : 'var(--color-border)'}`,
                                    padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all .2s'
                                }}
                            >
                                {isFavorite ? '💖 단골 파트너' : '🤍 단골로 등록'}
                            </button>
                        </div>
                    </div>
                ) : job.status === 'OPEN' && (
                    <div className="applications-section mb-md">
                        <div className="flex items-center justify-between mb-sm pr-md">
                            <h3 className="section-label mb-none">현재 지원자 현황</h3>
                            <span className="text-primary text-sm font-bold">{applications.length}명 지원중</span>
                        </div>
                        {applications.length === 0 ? (
                            <div className="card p-md text-center text-sm text-secondary bg-gray-50 mb-md" style={{ background: 'var(--color-surface)' }}>
                                아직 지원한 클린파트너가 없습니다.<br />조금만 더 기다려주세요!
                            </div>
                        ) : (
                            <div className="flex flex-col gap-sm">
                                {applications.map((app: any) => (
                                    <div key={app.id} className="card p-md" style={{ border: '1px solid var(--color-border)' }}>
                                        <div className="flex justify-between items-start mb-sm">
                                            <div className="flex gap-sm items-center">
                                                <div className="avatar avatar-md bg-blue-100 text-primary font-bold">
                                                    {app.users?.name?.[0] || 'C'}
                                                </div>
                                                <div>
                                                    <div className="font-bold flex items-center gap-xs">
                                                        {app.users?.name || '익명 파트너'}
                                                        <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                                                            {app.users?.tier || 'NEW'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-secondary mt-1">
                                                        ⭐ {app.users?.avg_rating?.toFixed(1) || '신규'} · 성공 {app.users?.jobs_completed || 0}회
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm px-md"
                                                onClick={() => handleAcceptApplicant(app.id, app.worker_id)}
                                                disabled={approving}
                                            >
                                                선택하기
                                            </button>
                                        </div>
                                        {app.message && (
                                            <div className="text-sm mt-sm p-sm" style={{ background: 'var(--color-bg)', borderRadius: 8 }}>
                                                "{app.message}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 부족한 비품 (있을 경우에만 노출) */}
                {(job.supply_shortages as string[])?.length > 0 && (
                    <div className="card mb-md" style={{ padding: 'var(--spacing-md)', border: '1px solid #FCA5A5', background: '#FEF2F2' }}>
                        <h3 className="font-bold text-md mb-xs" style={{ color: '#DC2626' }}>🚨 보충이 필요한 비품</h3>
                        <p className="text-sm text-secondary mb-sm" style={{ color: '#991B1B' }}>클린파트너가 다음 비품이 현장에 부족하다고 보고했습니다.</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(job.supply_shortages as string[]).map((item, idx) => (
                                <span key={idx} style={{ background: '#DC2626', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                        <div className="mt-md" style={{ borderTop: '1px dashed #FCA5A5', paddingTop: 12 }}>
                            <button
                                className="btn btn-full btn-sm"
                                style={{ background: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', fontWeight: 700 }}
                                onClick={() => alert('🛒 추후 비품 커머스 플랫폼이 연동되면 이 버튼을 통해 쿠팡/B2B 식자재몰 등에서 원클릭으로 구매 및 배송 지시가 가능해집니다!')}
                            >
                                🚀 부족한 비품 바로 구매하기 (준비 중)
                            </button>
                        </div>
                    </div>
                )}

                {/* 추가 요금 청구 내역 */}
                {job.extra_charge_amount > 0 && (
                    <div className="card mb-md p-md" style={{ border: '1px solid #D97706', background: '#FEF3C7' }}>
                        <h3 className="font-bold text-md mb-xs" style={{ color: '#B45309' }}>💸 현장 오염도 추가 청구</h3>
                        <div className="flex justify-between items-center mb-sm">
                            <span className="text-sm font-bold" style={{ color: '#92400E' }}>추가 청구 금액</span>
                            <span className="font-bold text-lg text-primary">+{job.extra_charge_amount.toLocaleString()}원</span>
                        </div>
                        <p className="text-sm text-secondary p-sm bg-white rounded-md border border-yellow-200">
                            <strong>사유:</strong> {job.extra_charge_reason}
                        </p>
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
                            <div className="payment-row"><span>기본 청소 금액</span><span>₩{job.price.toLocaleString()}</span></div>
                            {job.extra_charge_amount > 0 && (
                                <div className="payment-row text-primary font-bold"><span>추가 청구 금액</span><span>+₩{job.extra_charge_amount.toLocaleString()}</span></div>
                            )}
                            <div className="divider" />
                            <div className="payment-row"><span>총 청구 금액</span><span>₩{(job.price + (job.extra_charge_amount || 0)).toLocaleString()}</span></div>
                            <div className="payment-row text-secondary text-sm"><span>플랫폼 수수료 (10%)</span><span>-₩{payment.platform_fee.toLocaleString()}</span></div>
                            <div className="payment-row text-secondary text-sm"><span>원천징수 (3.3%)</span><span>-₩{payment.withholding_tax.toLocaleString()}</span></div>
                            <div className="divider" />
                            <div className="payment-row font-bold text-primary"><span>클린파트너 최종 수령액</span><span>₩{payment.worker_payout.toLocaleString()}</span></div>
                            <div className="payment-row text-sm text-secondary"><span>상태</span><span className={`badge ${payment.status === 'RELEASED' ? 'badge-approved' : 'badge-open'}`}>{payment.status === 'HELD' ? '입금 대기' : payment.status === 'RELEASED' ? '입금 완료' : payment.status}</span></div>
                        </div>
                    </div>
                )}

                {/* 공간파트너 액션: 검수 대기 */}
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
