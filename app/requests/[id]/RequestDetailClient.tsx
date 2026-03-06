'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PaymentModal from '@/components/common/PaymentModal'
import SecureImage from '@/components/common/SecureImage'

const STATUS_MAP: Record<string, { label: string; bgCls: string; textCls: string; desc: string }> = {
    OPEN: { label: '매칭 중', bgCls: 'bg-primary-light/20', textCls: 'text-primary', desc: 'AI가 클린파트너를 찾고 있어요' },
    ASSIGNED: { label: '배정 완료', bgCls: 'bg-emerald-100 dark:bg-emerald-900/30', textCls: 'text-emerald-700 dark:text-emerald-400', desc: '클린파트너가 배정됐어요' },
    EN_ROUTE: { label: '이동 중', bgCls: 'bg-emerald-100 dark:bg-emerald-900/30', textCls: 'text-emerald-700 dark:text-emerald-400', desc: '클린파트너가 이동 중이에요' },
    ARRIVED: { label: '도착', bgCls: 'bg-emerald-100 dark:bg-emerald-900/30', textCls: 'text-emerald-700 dark:text-emerald-400', desc: '클린파트너가 도착했어요' },
    IN_PROGRESS: { label: '청소 중', bgCls: 'bg-blue-100 dark:bg-blue-900/30', textCls: 'text-blue-700 dark:text-blue-400', desc: '청소가 진행 중이에요' },
    SUBMITTED: { label: '검수 대기', bgCls: 'bg-purple-100 dark:bg-purple-900/30', textCls: 'text-purple-700 dark:text-purple-400', desc: 'AI가 사진을 검수 중이에요' },
    APPROVED: { label: '승인 완료', bgCls: 'bg-green-100 dark:bg-green-900/30', textCls: 'text-green-700 dark:text-green-400', desc: '청소가 완료됐어요! 정산 처리 중' },
    DISPUTED: { label: '분쟁 중', bgCls: 'bg-red-100 dark:bg-red-900/30', textCls: 'text-red-700 dark:text-red-400', desc: '' },
    PAID_OUT: { label: '정산 완료', bgCls: 'bg-gray-100 dark:bg-gray-800', textCls: 'text-gray-700 dark:text-gray-300', desc: '정산이 완료됐어요' },
    CANCELED: { label: '취소', bgCls: 'bg-gray-100 dark:bg-gray-800', textCls: 'text-gray-500 dark:text-gray-400', desc: '' },
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

    // 리뷰 상태
    const [reviewModalOpen, setReviewModalOpen] = useState(false)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewSubmitted, setReviewSubmitted] = useState(false)
    const [submittingReview, setSubmittingReview] = useState(false)

    // 결제 모달 상태
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [paymentContext, setPaymentContext] = useState<'accept' | 'extra'>('accept')
    const [selectedApp, setSelectedApp] = useState<{ appId: string, workerId: string } | null>(null)

    const st = STATUS_MAP[job.status] || { label: job.status, bgCls: 'bg-gray-100', textCls: 'text-gray-700', desc: '' }
    const space = job.spaces
    const worker = job.users
    const isOperator = job.operator_id === userId
    const afterPhotos = photos.filter((p: any) => p.type === 'after')

    const handleApproveBtnClick = () => {
        if (job.extra_charge_amount > 0) {
            setPaymentContext('extra')
            setPaymentModalOpen(true)
        } else {
            if (!window.confirm('청소 결과를 승인하시겠습니까? 승인 시 정산이 진행됩니다.')) return
            executeApprove()
        }
    }

    const executeApprove = async () => {
        setApproving(true)
        const supabase = createClient()
        await supabase.from('jobs').update({ status: 'APPROVED', auto_approved: false }).eq('id', job.id)

        const { error: notifyError } = await supabase.rpc('notify_user', {
            p_user_id: job.worker_id,
            p_title: '💰 정산 완료 안내',
            p_message: '공간 파트너님이 청소를 승인했습니다. 정산이 곧 완료됩니다.',
            p_url: '/earnings'
        })
        if (notifyError) console.error(notifyError)

        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/finance-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ job_id: job.id })
        }).catch(console.error)
        router.refresh()
        setApproving(false)
    }

    const handleAcceptBtnClick = (appId: string, workerId: string) => {
        setSelectedApp({ appId, workerId })
        setPaymentContext('accept')
        setPaymentModalOpen(true)
    }

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

    const handleSubmitReview = async () => {
        if (!worker) return
        setSubmittingReview(true)
        const supabase = createClient()
        await supabase.from('reviews').insert({
            job_id: job.id, reviewer_id: userId, reviewee_id: worker.id,
            rating: reviewRating, comment: reviewComment
        })

        const { error: notifyError } = await supabase.rpc('notify_user', {
            p_user_id: worker.id, p_title: '⭐ 새로운 리뷰 도착',
            p_message: `공간 파트너님이 ${reviewRating}점 리뷰를 남겼어요!`, p_url: `/profile`
        })
        if (notifyError) console.error(notifyError)

        alert('소중한 리뷰가 등록되었습니다. 매너 온도가 반영됩니다!')
        setReviewSubmitted(true)
        setReviewModalOpen(false)
        setSubmittingReview(false)
        router.refresh()
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen antialiased flex flex-col mx-auto max-w-md w-full relative">
            <div className="sticky top-0 z-20 flex items-center bg-background-light dark:bg-background-dark p-4 justify-between border-b border-primary/10">
                <button onClick={() => router.back()} className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 focus:outline-none">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">청소 요청 상세</h2>
            </div>

            <main className="flex-1 overflow-y-auto pb-32">
                <div className="p-4 flex flex-col gap-4">
                    {/* 상태 카드 */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-[20px] font-bold tracking-tight">{space?.name}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{space?.address}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold leading-tight ${st.bgCls} ${st.textCls}`}>
                                {st.label}
                            </span>
                        </div>
                        {st.desc && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-t border-b border-slate-100 dark:border-slate-700">
                                {st.desc}
                            </div>
                        )}
                        <div className="p-4 flex justify-between items-center text-sm font-medium border-t border-slate-100 dark:border-slate-700">
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                {new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-primary font-bold text-base">₩{job.price.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* 이동 중 패널 */}
                    {job.status === 'EN_ROUTE' && isOperator && (
                        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-4 rounded-xl flex items-start gap-4">
                            <span className="text-3xl">🚗</span>
                            <div>
                                <h3 className="font-bold text-sky-700 dark:text-sky-400 mb-1">클린파트너가 이동 중입니다</h3>
                                <p className="text-xs text-sky-600 dark:text-sky-300 mb-3 leading-relaxed">
                                    클린파트너가 현장으로 출발했습니다. 지도 상의 이동 동선(ETA) 기능은 추후 연동됩니다.
                                </p>
                                <div className="inline-flex items-center gap-2 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-800/50 px-3 py-1.5 rounded-full">
                                    <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                    도착 예정 시간: 약 15~20분
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 클린파트너 정보 */}
                    {worker ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
                            <div className="flex gap-3 items-center">
                                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                                    {worker.name?.[0]}
                                </div>
                                <div className="flex flex-col">
                                    <div className="font-bold text-base">{worker.name}</div>
                                    <div className="flex items-center text-xs font-medium mt-1">
                                        <span className="text-rose-500 font-bold mr-2 flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">device_thermostat</span>{worker.manner_temperature || 36.5}°C</span>
                                        <span className="text-amber-500 flex items-center gap-0.5 mr-2"><span className="material-symbols-outlined text-[14px]">star</span>{worker.avg_rating?.toFixed(1) || '-'}</span>
                                        <span className="text-slate-500">{worker.tier}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleFavorite}
                                disabled={togglingFav}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${isFavorite ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                            >
                                {isFavorite ? '💖 단골 파트너' : '🤍 단골로 등록'}
                            </button>
                        </div>
                    ) : job.status === 'OPEN' && (
                        /* 지원자 리뷰 UI - Stitch App 적용 */
                        <div className="mt-2">
                            <h3 className="text-[17px] font-bold leading-tight tracking-[-0.015em] mb-4 text-slate-900 dark:text-slate-100 flex items-center justify-between">
                                지원한 파트너 <span className="text-primary text-sm bg-primary-light/20 px-2.5 py-0.5 rounded-full">{applications.length}</span>
                            </h3>

                            {applications.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">hourglass_empty</span>
                                    <br />아직 지원한 클린파트너가 없습니다.<br />잠시만 기다려주세요!
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {applications.map((app: any) => (
                                        <div key={app.id} className="flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                            <div className="bg-primary/10 text-primary aspect-square rounded-full h-[56px] w-[56px] shrink-0 flex items-center justify-center font-bold text-xl">
                                                {app.users?.name?.[0] || 'C'}
                                            </div>
                                            <div className="flex flex-1 flex-col justify-center">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <p className="text-[15px] font-bold leading-normal flex items-center gap-1">
                                                            {app.users?.name || '익명 파트너'}
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{app.users?.tier || 'NEW'}</span>
                                                        </p>
                                                        <div className="flex items-center text-xs font-medium mt-1">
                                                            <span className="text-amber-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">star</span> {app.users?.avg_rating?.toFixed(1) || '신규'}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 ml-2 font-normal">성공 {app.users?.jobs_completed || 0}회</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAcceptBtnClick(app.id, app.worker_id)}
                                                        disabled={approving}
                                                        className="flex h-8 items-center justify-center rounded-lg px-4 bg-primary text-white text-[13px] font-bold transition-colors hover:bg-primary/90 shadow-sm active:scale-95"
                                                    >
                                                        선택하기
                                                    </button>
                                                </div>
                                                {app.message ? (
                                                    <p className="text-slate-600 dark:text-slate-300 text-xs font-normal leading-snug line-clamp-2 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg italic">
                                                        "{app.message}"
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 italic">인사말이 없습니다.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 부족한 비품 */}
                    {(job.supply_shortages as string[])?.length > 0 && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl mt-2">
                            <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-base">warning</span> 보충이 필요한 비품</h3>
                            <p className="text-xs text-rose-600/80 mb-3">클린파트너가 다음 비품이 현장에 부족하다고 보고했습니다.</p>
                            <div className="flex gap-2 flex-wrap mb-3">
                                {(job.supply_shortages as string[]).map((item, idx) => (
                                    <span key={idx} className="bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-200 px-3 py-1 rounded-full text-xs font-bold border border-rose-200 dark:border-rose-700">
                                        {item}
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={() => alert('장바구니 연동 준비 중입니다.')}
                                className="w-full h-10 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors hover:bg-rose-50 dark:hover:bg-slate-700"
                            >
                                <span className="material-symbols-outlined text-[16px]">shopping_cart</span> 바로 구매하기 (준비 중)
                            </button>
                        </div>
                    )}

                    {/* 추가 요금 청구 */}
                    {job.extra_charge_amount > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl mt-2">
                            <h3 className="font-bold text-amber-700 dark:text-amber-500 text-sm mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-base">payments</span> 현장 오염도 추가 청구</h3>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-400">추가 청구 금액</span>
                                <span className="font-bold text-base text-amber-600 dark:text-amber-500">+{job.extra_charge_amount.toLocaleString()}원</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-200">청구 사유:</span> {job.extra_charge_reason}
                            </div>
                        </div>
                    )}

                    {/* 청소 완료 사진 */}
                    {afterPhotos.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mt-2">
                            <h3 className="text-[15px] font-bold mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">photo_camera</span>청소 완료 사진 ({afterPhotos.length}장)</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {afterPhotos.map((p: any) => (
                                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                        <SecureImage srcOrPath={p.photo_url} className="w-full h-full object-cover" />
                                        {p.ai_quality_score && (
                                            <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white shadow-sm flex items-center gap-0.5 ${p.ai_quality_score >= 80 ? 'bg-primary' : 'bg-orange-500'}`}>
                                                <span className="material-symbols-outlined text-[10px]">smart_toy</span> {p.ai_quality_score}점
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 정산 정보 */}
                    {payment && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mt-2">
                            <h3 className="text-[15px] font-bold mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">receipt_long</span>정산 내역</h3>
                            <div className="flex flex-col gap-2.5 text-sm">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>기본 청소 금액</span>
                                    <span className="font-medium text-slate-900 dark:text-slate-100">₩{job.price.toLocaleString()}</span>
                                </div>
                                {job.extra_charge_amount > 0 && (
                                    <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-medium">
                                        <span>추가 청구 금액</span>
                                        <span>+₩{job.extra_charge_amount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                <div className="flex justify-between items-center font-bold text-slate-900 dark:text-slate-100">
                                    <span>총 청구 금액</span>
                                    <span>₩{(job.price + (job.extra_charge_amount || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                                    <span>플랫폼 수수료 (10%)</span>
                                    <span>-₩{payment.platform_fee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>원천징수 (3.3%)</span>
                                    <span>-₩{payment.withholding_tax.toLocaleString()}</span>
                                </div>
                                <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700 my-1"></div>
                                <div className="flex justify-between items-center font-bold text-primary mt-1">
                                    <span>클린파트너 최종 수령액</span>
                                    <span className="text-[17px]">₩{payment.worker_payout.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <span>정산 상태</span>
                                    <span className={`px-2 py-0.5 border rounded-full font-bold ${payment.status === 'RELEASED' ? 'border-primary/30 text-primary bg-primary-light/10' : 'border-slate-300 dark:border-slate-600'}`}>{payment.status === 'HELD' ? '입금 대기 중' : payment.status === 'RELEASED' ? '정산 완료 (입금 확인)' : payment.status}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 공간파트너 액션: 검수 대기 */}
                {isOperator && job.status === 'SUBMITTED' && (
                    <div className="px-4 pb-6 mt-4">
                        <div className="bg-primary-light/10 border border-primary/20 p-4 rounded-xl text-center mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl mb-1">flaky</span>
                            <p className="text-sm text-primary font-medium">
                                {job.auto_approved ? 'AI가 1차 검수를 완료했어요.' : '청소 사진을 확인하고 승인해주세요.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                className="w-full h-14 bg-primary text-white rounded-xl font-bold text-[15px] flex items-center justify-center hover:bg-primary/95 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                onClick={handleApproveBtnClick} disabled={approving}
                            >
                                {approving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '✅ 청소 최종 승인하기'}
                            </button>
                            <button
                                className="w-full h-12 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                                onClick={() => setShowDispute(true)}
                            >
                                ⚠️ 문제 신고 (부분 재청소 요청)
                            </button>
                        </div>
                    </div>
                )}

                {/* 공간파트너 액션: 청소 완료 후 리뷰 작성 */}
                {isOperator && ['APPROVED', 'PAID_OUT'].includes(job.status) && !reviewSubmitted && (
                    <div className="px-4 mt-6 pb-6">
                        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 border border-rose-200 dark:border-rose-700/50 p-5 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-[16px] text-rose-700 dark:text-rose-400">⭐ 파트너님은 어떠셨나요?</h3>
                                <span className="text-3xl">🌡️</span>
                            </div>
                            <p className="text-xs text-rose-600/80 dark:text-rose-300/80 mb-4 leading-relaxed">작업에 대한 솔직한 리뷰를 남겨주시면<br />해당 클린파트너의 매너 온도가 쑥쑥 올라갑니다!</p>
                            <button
                                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                                onClick={() => setReviewModalOpen(true)}
                            >
                                리뷰 남기고 매너 온도 올리기
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals using Tailwind */}
            {showDispute && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center" onClick={() => setShowDispute(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-xl transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-slate-200 mx-auto rounded-full mb-6"></div>
                        <h3 className="font-bold text-xl mb-4">문제 신고</h3>
                        <p className="text-sm text-slate-500 mb-4">구체적으로 어떤 문제가 있었는지 작성해주세요.</p>
                        <textarea
                            className="w-full h-32 p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none resize-none mb-6"
                            placeholder="예: 거실 바닥에 먼지가 그대로 남아있어요, 쓰레기통이 안 비워져 있어요."
                            value={disputeReason}
                            onChange={e => setDisputeReason(e.target.value)}
                        />
                        <button
                            className="w-full h-14 bg-rose-600 text-white rounded-xl font-bold text-base disabled:opacity-50"
                            onClick={handleDispute}
                            disabled={!disputeReason.trim()}
                        >
                            신고 접수하기
                        </button>
                    </div>
                </div>
            )}

            {reviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReviewModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setReviewModalOpen(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="text-center mb-6 mt-4">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">📝</div>
                            <h3 className="font-bold text-[18px]">클린파트너 평가하기</h3>
                            <p className="text-xs text-slate-500 mt-1">별점을 터치하여 평가해주세요.</p>
                        </div>
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    className="text-[40px] focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                    style={{ filter: star <= reviewRating ? 'drop-shadow(0 2px 4px rgba(251,191,36,0.3))' : 'grayscale(100%) opacity(20%)' }}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full h-24 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none mb-6 text-slate-700 dark:text-slate-200"
                            placeholder="요청사항을 잘 지켜주셨나요? 자유롭게 후기를 남겨주세요. (선택)"
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                        />
                        <button
                            className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[15px] shadow-md transition-colors"
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                        >
                            {submittingReview ? <div className="w-5 h-5 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '평가 완료하기'}
                        </button>
                    </div>
                </div>
            )}

            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                amount={paymentContext === 'accept' ? job.price : job.extra_charge_amount}
                jobName={space?.name ? `[${space.name}] 청소 결제` : '청소 결제'}
                jobId={job.id}
                paymentContext={paymentContext}
                workerId={selectedApp?.workerId}
            />
        </div>
    )
}
