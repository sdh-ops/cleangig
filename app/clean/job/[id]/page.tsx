'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Job, ChecklistItem } from '@/lib/types'

const STATUS_FLOW: Record<string, { next: string; label: string; btnLabel: string; btnColor: string }> = {
    ASSIGNED: { next: 'EN_ROUTE', label: '배정 완료', btnLabel: '🚗 출발하기', btnColor: 'btn-primary' },
    EN_ROUTE: { next: 'ARRIVED', label: '이동 중', btnLabel: '📍 도착 완료', btnColor: 'btn-primary' },
    ARRIVED: { next: 'IN_PROGRESS', label: '도착', btnLabel: '🧹 청소 시작', btnColor: 'btn-primary' },
    IN_PROGRESS: { next: 'SUBMITTED', label: '청소 중', btnLabel: '✅ 청소 완료 제출', btnColor: 'btn-primary' },
}

export default function JobDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [job, setJob] = useState<Job | null>(null)
    const [checklist, setChecklist] = useState<ChecklistItem[]>([])
    const [supplyShortages, setSupplyShortages] = useState<string[]>([])
    const [extraCharge, setExtraCharge] = useState(0)
    const [extraChargeReason, setExtraChargeReason] = useState('')
    const [showExtraCharge, setShowExtraCharge] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const damagePhotoInputRef = useRef<HTMLInputElement>(null)
    const [activeUploadIdx, setActiveUploadIdx] = useState<number | null>(null)
    const [damageDesc, setDamageDesc] = useState('')
    const [showDamageReport, setShowDamageReport] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [application, setApplication] = useState<any>(null)
    const [applyMessage, setApplyMessage] = useState('')

    useEffect(() => {
        fetchJob()
        // Supabase Realtime — 실시간 상태 업데이트
        const supabase = createClient()
        const channel = supabase.channel(`job-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
                (payload) => setJob(payload.new as Job))
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    const fetchJob = async () => {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u)

        const { data } = await supabase
            .from('jobs').select('*, spaces(*)')
            .eq('id', id).single()
        if (data) {
            setJob(data as Job)
            setChecklist((data.checklist as ChecklistItem[]) || [])
            setSupplyShortages((data.supply_shortages as string[]) || [])
            setExtraCharge(data.extra_charge_amount || 0)
            setExtraChargeReason(data.extra_charge_reason || '')
            if (u) {
                const { data: appData } = await supabase.from('job_applications')
                    .select('*').eq('job_id', id).eq('worker_id', u.id).single()
                setApplication(appData)
            }
        }
        setLoading(false)
    }

    const handleApply = async () => {
        if (!user) return
        setSubmitting(true)
        const supabase = createClient()
        const { error } = await supabase.from('job_applications').insert({
            job_id: id,
            worker_id: user.id,
            message: applyMessage
        })
        if (!error) {
            alert('지원이 완료되었습니다. 공간파트너의 승낙을 기다려주세요.')
            fetchJob()
        } else {
            alert('지원에 실패했습니다.')
        }
        setSubmitting(false)
    }

    const handleStatusNext = async () => {
        if (!job) return
        const flow = STATUS_FLOW[job.status]
        if (!flow) return
        setSubmitting(true)
        const supabase = createClient()

        // 체크리스트 완료 여부 확인 (SUBMITTED 전에)
        if (flow.next === 'SUBMITTED') {
            const required = checklist.filter(c => c.required)
            const incomplete = required.filter(c => !c.completed)
            if (incomplete.length > 0) {
                alert(`필수 항목 ${incomplete.length}개를 완료해주세요: ${incomplete[0].label}`)
                setSubmitting(false); return
            }

            // 사진 최소 1장 필요
            const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true })
                .eq('job_id', id).eq('type', 'after')
            if (!count || count === 0) {
                alert('청소 완료 사진을 최소 1장 이상 업로드해주세요.')
                setSubmitting(false); return
            }
        }

        // checklist를 jobs 테이블에 저장
        await supabase.from('jobs').update({
            status: flow.next,
            checklist,
            supply_shortages: supplyShortages,
            extra_charge_amount: extraCharge,
            extra_charge_reason: extraChargeReason,
            ...(flow.next === 'IN_PROGRESS' ? { started_at: new Date().toISOString() } : {}),
            ...(flow.next === 'SUBMITTED' ? { completed_at: new Date().toISOString() } : {}),
        }).eq('id', id)

        // Quality Agent 호출 (SUBMITTED 시)
        if (flow.next === 'SUBMITTED') {
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/quality-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ job_id: id })
            }).catch(console.error)
        }

        await fetchJob()
        setSubmitting(false)
    }

    const handlePhotoUpload = async (file: File, checklistIdx?: number) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !job) return

        setUploadingIdx(checklistIdx ?? -1)
        const ext = file.name.split('.').pop()
        const path = `jobs/${id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from('photos').upload(path, file, { contentType: file.type })

        if (uploadError) { alert('사진 업로드 실패'); setUploadingIdx(null); return }

        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

        // photos 테이블에 기록
        await supabase.from('photos').insert({
            job_id: id,
            uploaded_by: user.id,
            type: 'after',
            photo_url: publicUrl,
            checklist_item_id: checklistIdx !== undefined ? checklist[checklistIdx]?.id : null,
        })

        // 체크리스트에 사진 URL 업데이트
        if (checklistIdx !== undefined) {
            const next = [...checklist]
            next[checklistIdx] = { ...next[checklistIdx], completed: true, photo_url: publicUrl }
            setChecklist(next)
        }
        setUploadingIdx(null)
    }

    const handleDamageReportUpload = async (file: File) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !job) return

        setSubmitting(true)
        const ext = file.name.split('.').pop()
        const path = `jobs/${id}/damage_${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from('photos').upload(path, file, { contentType: file.type })

        if (uploadError) { alert('사진 업로드 실패'); setSubmitting(false); return }
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

        const currentReports = (job.pre_damage_report as any) || []
        const newReport = { desc: damageDesc || '특이사항 없음', photo_url: publicUrl }

        await supabase.from('jobs').update({
            pre_damage_report: [...currentReports, newReport]
        }).eq('id', id)

        alert('파손 및 특이사항이 사전 보고되었습니다. 공간파트너에게 전달됩니다.')
        setShowDamageReport(false)
        setDamageDesc('')
        await fetchJob()
        setSubmitting(false)
    }

    const toggleChecklist = (idx: number) => {
        const next = [...checklist]
        next[idx] = { ...next[idx], completed: !next[idx].completed }
        setChecklist(next)
    }

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
            <div className="spinner" />
        </div>
    )

    if (!job) return (
        <div className="page-container" style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
            <p>작업을 찾을 수 없어요.</p>
            <button className="btn btn-secondary mt-md" onClick={() => router.back()}>돌아가기</button>
        </div>
    )

    const flow = STATUS_FLOW[job.status]
    const space = job.spaces as any
    const completedCount = checklist.filter(c => c.completed).length
    const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0

    return (
        <div className="page-container">
            <header className="job-header">
                <button onClick={() => router.back()} className="back-btn">←</button>
                <div style={{ flex: 1 }}>
                    <h1 className="job-space-name">{space?.name || '청소 작업'}</h1>
                    <p className="job-address">{space?.address}</p>
                </div>
            </header>

            {/* 상태 진행 표시 */}
            <div className="status-banner" style={{
                background: job.status === 'IN_PROGRESS' ? 'linear-gradient(135deg, #769FCD, #3F72AF)' :
                    job.status === 'SUBMITTED' ? '#8B5CF6' :
                        job.status === 'APPROVED' || job.status === 'PAID_OUT' ? '#3F72AF' : 'var(--color-primary)'
            }}>
                <div className="status-text">
                    {job.status === 'ASSIGNED' && '🚗 지금 출발하세요!'}
                    {job.status === 'EN_ROUTE' && '📍 이동 중...'}
                    {job.status === 'ARRIVED' && '🏠 도착했어요! 청소를 시작하세요'}
                    {job.status === 'IN_PROGRESS' && '🧹 청소 진행 중'}
                    {job.status === 'SUBMITTED' && '⏳ AI 품질 검수 중...'}
                    {job.status === 'APPROVED' && '✅ 승인 완료! 정산 처리 중'}
                    {job.status === 'PAID_OUT' && '💰 정산 완료!'}
                </div>
                <div className="status-price">₩{job.price.toLocaleString()}</div>
            </div>

            <div className="page-content">
                {/* 매칭 전용 상세 정보 (출발 후 또는 배정 시 확인 가능) */}
                {['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                    <div className="info-card card" style={{ borderColor: 'var(--color-primary-soft)', borderWidth: 2 }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-md) 0' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>🏠 현장 가이드라인</h3>
                            <button
                                onClick={() => router.push(`/chat/${id}`)}
                                style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}
                            >
                                💬 공간파트너 채팅
                            </button>
                        </div>

                        {/* 기준 사진 제공 시 최상단 노출 */}
                        {(space?.reference_photos?.length > 0) && (
                            <div style={{ padding: '0 var(--spacing-md)' }}>
                                <p className="guide-label mt-sm mb-xs text-primary font-bold">📸 완벽한 기준 뷰 (목표)</p>
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                                    {space.reference_photos.map((url: string, i: number) => (
                                        <img key={i} src={url} alt="기준사진" style={{ width: 120, height: 90, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
                            <div className="guide-item mt-sm">
                                <span className="guide-label">출입 방법 및 위치</span>
                                <div className="guide-value font-bold" style={{ fontSize: 16, color: 'var(--color-primary)' }}>
                                    {space?.entry_code || '현장 확인 필요'}
                                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(space?.address || '')}`} target="_blank" rel="noreferrer" className="btn btn-sm ml-sm" style={{ fontSize: 13, background: '#03C75A', color: '#fff', border: 'none', borderRadius: 8 }}>
                                        🗺️ 네이버 길찾기
                                    </a>
                                </div>
                            </div>

                            {space?.cleaning_tool_location && (
                                <div className="guide-item mt-sm bg-blue-50" style={{ background: 'var(--color-primary-light)', padding: 12, borderRadius: 8 }}>
                                    <span className="guide-label text-primary flex items-center gap-1">🧽 청소 도구 및 세제 위치</span>
                                    <div className="guide-value font-bold">{space.cleaning_tool_location}</div>
                                </div>
                            )}

                            {space?.trash_guide && (
                                <div className="guide-item mt-sm">
                                    <span className="guide-label">🗑 쓰레기 배출 안내</span>
                                    <div className="guide-value text-sm">{space.trash_guide}</div>
                                </div>
                            )}

                            {space?.parking_guide && (
                                <div className="guide-item mt-sm">
                                    <span className="guide-label">🚗 주차 안내</span>
                                    <div className="guide-value text-sm">{space.parking_guide}</div>
                                </div>
                            )}

                            {space?.caution_notes && (
                                <div className="guide-item mt-sm">
                                    <span className="guide-label">⚠️ 주의사항</span>
                                    <div className="guide-value text-sm text-secondary whitespace-pre-wrap">{space.caution_notes}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 일정 정보 */}
                <div className="info-card card">
                    <div className="info-row">
                        <span>⏰ 청소 시간</span>
                        <span className="font-bold">
                            {job.time_window_start && job.time_window_end
                                ? `${new Date(job.scheduled_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ${job.time_window_start.substring(0, 5)} ~ ${job.time_window_end.substring(0, 5)}`
                                : new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            }
                        </span>
                    </div>
                    <div className="info-row">
                        <span>⏱ 예상 시간</span>
                        <span className="font-bold">{job.estimated_duration}분</span>
                    </div>
                    {job.special_instructions && (
                        <div className="special-note">
                            <span>📝 요청사항</span> {job.special_instructions}
                        </div>
                    )}
                </div>

                {/* 파손 사전 보고 UI (도착 상태일 때만 + 보호 차원) */}
                {job.status === 'ARRIVED' && (
                    <div className="card mt-md mb-md" style={{ padding: 'var(--spacing-md)', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 24 }}>🚨</span>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ color: '#DC2626', fontWeight: 700, margin: '0 0 4px 0' }}>청소 시작 전 확인 필수</h4>
                                <p style={{ fontSize: 13, color: '#991B1B', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                                    이전 게스트가 파손하거나 심각하게 오염시킨 부분이 있다면, 청소를 시작하기 전에 먼저 증거 사진을 남겨주세요. 클린파트너님의 책임을 피할 수 있습니다.
                                </p>

                                {showDamageReport ? (
                                    <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #FCCCA7' }}>
                                        <textarea
                                            placeholder="파손/오염 내용을 간략히 적어주세요."
                                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, marginBottom: 8 }}
                                            rows={2}
                                            value={damageDesc}
                                            onChange={e => setDamageDesc(e.target.value)}
                                        />
                                        <button
                                            className="btn btn-secondary btn-full btn-sm"
                                            onClick={() => damagePhotoInputRef.current?.click()}
                                            disabled={submitting || !damageDesc}
                                        >
                                            {submitting ? <span className="spinner"></span> : '📸 파손 증거 사진 업로드 및 보고'}
                                        </button>
                                        <button style={{ background: 'transparent', color: '#666', fontSize: 12, marginTop: 8, border: 'none', width: '100%' }} onClick={() => setShowDamageReport(false)}>취소</button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: '#DC2626', color: '#fff', width: '100%', fontWeight: 700 }}
                                        onClick={() => setShowDamageReport(true)}
                                    >
                                        파손/오염 사전 보고 창 열기
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 기 보고된 파손 내역 */}
                {(job.pre_damage_report as any[])?.length > 0 && (
                    <div className="card mb-md" style={{ padding: 'var(--spacing-md)', border: '1px solid #FCD34D', background: '#FEF3C7' }}>
                        <h4 style={{ color: '#B45309', fontWeight: 700, fontSize: 14, margin: '0 0 8px 0' }}>⚠️ 파손 사전 보고 완료 내역</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {((job.pre_damage_report as any[]) || []).map((r, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 8 }}>
                                    {r.photo_url && <img src={r.photo_url} alt="증거" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />}
                                    <span style={{ fontSize: 12, color: '#92400E' }}>{r.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 체크리스트 */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && checklist.length > 0 && (
                    <div className="checklist-section">
                        <div className="checklist-header">
                            <h2 className="checklist-title">체크리스트</h2>
                            <span className="checklist-progress">{completedCount}/{checklist.length}</span>
                        </div>
                        <div className="checklist-progress-bar">
                            <div className="checklist-progress-fill" style={{ width: `${progress}%` }} />
                        </div>

                        <div className="checklist-items">
                            {checklist.map((item, idx) => (
                                <div key={item.id} className={`checklist-row ${item.completed ? 'completed' : ''}`}>
                                    <button className="check-btn" onClick={() => toggleChecklist(idx)}
                                        disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}>
                                        <div className={`check-circle ${item.completed ? 'checked' : ''}`}>
                                            {item.completed && '✓'}
                                        </div>
                                    </button>
                                    <div className="check-label">
                                        <span className={item.completed ? 'line-through' : ''}>{item.label}</span>
                                        {item.required && <span className="required-dot">필수</span>}
                                    </div>
                                    {/* 사진 업로드 버튼 */}
                                    {job.status === 'IN_PROGRESS' && (
                                        <button className="photo-btn" onClick={() => { setActiveUploadIdx(idx); fileInputRef.current?.click() }}>
                                            {item.photo_url ? '📸✓' : uploadingIdx === idx ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '📸'}
                                        </button>
                                    )}
                                    {item.photo_url && (
                                        <img src={item.photo_url} alt="" className="check-thumb" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 비품 체크 (공간파트너가 설정한 경우에만) */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && (job.supplies_to_check as string[])?.length > 0 && (
                    <div className="checklist-section">
                        <div className="checklist-header mb-sm">
                            <h2 className="checklist-title">비품 점검결과</h2>
                        </div>
                        <p className="form-hint mb-md">수량이 부족한 비품만 선택해서 즉시 알려주세요.</p>
                        <div className="checklist-items">
                            {(job.supplies_to_check as string[]).map((item, idx) => {
                                const isShort = supplyShortages.includes(item)
                                return (
                                    <div key={idx} className={`checklist-row ${isShort ? 'short' : ''}`} style={{ borderColor: isShort ? '#FCA5A5' : 'var(--color-border-light)', background: isShort ? '#FEF2F2' : 'var(--color-surface)' }}>
                                        <button className="check-btn" onClick={() => {
                                            setSupplyShortages(prev =>
                                                prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
                                            )
                                        }} disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}>
                                            <div className={`check-circle ${isShort ? 'short' : ''}`} style={{ borderColor: isShort ? '#DC2626' : 'var(--color-border)', color: isShort ? '#DC2626' : 'transparent', background: isShort ? '#FECACA' : 'transparent' }}>
                                                {isShort && '🚨'}
                                            </div>
                                        </button>
                                        <div className="check-label" style={{ color: isShort ? '#991B1B' : '' }}>
                                            <span style={{ fontWeight: isShort ? 700 : 500 }}>{item}</span>
                                            {isShort && <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 700, marginLeft: 8 }}>부족 요청됨</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 추가 요금 청구 시스템 */}
                {job.status === 'IN_PROGRESS' && (
                    <div className="card mt-md mb-md p-md" style={{ border: '1px solid #D97706', background: '#FEF3C7' }}>
                        <div className="flex justify-between items-center mb-sm">
                            <h3 className="font-bold mb-none" style={{ color: '#B45309' }}>💸 현장 오염도 추가 청구</h3>
                            <button className="text-secondary text-sm font-bold" onClick={() => setShowExtraCharge(!showExtraCharge)}>
                                {showExtraCharge || extraCharge > 0 ? '접기' : '청구하기'}
                            </button>
                        </div>
                        {(showExtraCharge || extraCharge > 0) && (
                            <div className="slide-down mt-sm">
                                <p className="text-xs mb-sm" style={{ color: '#92400E' }}>예상치 못한 심각한 오염(토사물 등)이나 규정 외 폐기물이 있을 경우, 공간파트너에게 추가 요금을 청구할 수 있습니다. (증거 사진 필수 제출)</p>
                                <div className="form-group mb-sm">
                                    <label className="text-sm font-bold block mb-xs">추가 청구 금액 (원)</label>
                                    <input
                                        type="number" className="form-input" placeholder="예: 10000"
                                        value={extraCharge || ''} onChange={e => setExtraCharge(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-sm font-bold block mb-xs">청구 사유</label>
                                    <textarea
                                        className="form-input" rows={2} placeholder="기존 파티 뒷정리 미흡으로 인한 쓰레기 5봉투 추가 발생 등 상세히 적어주세요."
                                        value={extraChargeReason} onChange={e => setExtraChargeReason(e.target.value)}
                                    />
                                    {extraCharge > 0 && !extraChargeReason.trim() && (
                                        <p className="text-xs mt-xs text-red">청구 사유를 반드시 입력해주세요.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 숨겨진 파일 입력 */}
                <input
                    ref={fileInputRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => {
                        const file = e.target.files?.[0]
                        if (file && activeUploadIdx !== null) handlePhotoUpload(file, activeUploadIdx)
                        e.target.value = ''
                    }}
                />
                <input
                    ref={damagePhotoInputRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleDamageReportUpload(file)
                        e.target.value = ''
                    }}
                />

                {/* 완료 사진 업로드 버튼 (IN_PROGRESS) */}
                {job.status === 'IN_PROGRESS' && (
                    <button className="upload-all-btn" onClick={() => { setActiveUploadIdx(undefined as any); fileInputRef.current?.click() }}>
                        📸 청소 완료 사진 추가
                    </button>
                )}

                {/* 지원서 폼 (OPEN) */}
                {job.status === 'OPEN' && !application && (
                    <div className="card mt-md mb-md p-md" style={{ border: '2px solid var(--color-primary)' }}>
                        <h3 className="font-bold text-md mb-sm flex items-center gap-xs"><span>✨</span> 이 청소에 지원하시겠어요?</h3>
                        <p className="text-secondary text-sm mb-md">공간 파트너가 클린파트너님의 프로필과 메시지를 확인 후 매칭을 수락합니다.</p>
                        <textarea
                            className="form-input mb-md"
                            placeholder="간단한 인사말이나 어필할 내용을 적어주세요 (선택)"
                            rows={3}
                            value={applyMessage}
                            onChange={e => setApplyMessage(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* 하단 액션 버튼 */}
            {job.status === 'OPEN' && (
                <div className="action-footer">
                    {application ? (
                        <button className="btn btn-secondary btn-full btn-lg" disabled style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}>
                            ⏳ 공간 파트너의 승낙(배정) 대기 중...
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleApply}
                            disabled={submitting}
                        >
                            {submitting ? <span className="spinner" /> : '🙋‍♂️ 지원하기'}
                        </button>
                    )}
                </div>
            )}

            {flow && job.status !== 'OPEN' && (
                <div className="action-footer">
                    <button
                        className={`btn ${flow.btnColor} btn-full btn-lg`}
                        onClick={handleStatusNext}
                        disabled={submitting || (extraCharge > 0 && !extraChargeReason.trim())}
                        id={`action-${flow.next}`}
                    >
                        {submitting ? <span className="spinner" /> : flow.btnLabel}
                    </button>
                </div>
            )}

            <style jsx>{`
        .job-header { display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-md); border-bottom: 1px solid var(--color-border-light); }
        .back-btn { font-size: 22px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0; }
        .back-btn:hover { background: var(--color-bg); }
        .job-space-name { font-size: var(--font-lg); font-weight: 700; }
        .job-address { font-size: var(--font-xs); color: var(--color-text-tertiary); }
        .status-banner { padding: var(--spacing-md); display: flex; justify-content: space-between; align-items: center; color: #fff; }
        .status-text { font-weight: 700; font-size: var(--font-md); }
        .status-price { font-size: var(--font-xl); font-weight: 800; }
        .info-card { margin-bottom: var(--spacing-md); }
        .info-row { display: flex; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); font-size: var(--font-sm); border-bottom: 1px solid var(--color-border-light); }
        .info-row:last-child { border-bottom: none; }
        .special-note { padding: var(--spacing-sm) var(--spacing-md); font-size: var(--font-sm); color: var(--color-text-secondary); background: var(--color-orange-light); border-radius: 0 0 16px 16px; }
        .checklist-section { margin-bottom: var(--spacing-md); }
        .checklist-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); }
        .checklist-title { font-size: var(--font-md); font-weight: 700; }
        .checklist-progress { font-size: var(--font-sm); font-weight: 700; color: var(--color-primary); }
        .checklist-progress-bar { height: 4px; background: var(--color-border); border-radius: 2px; margin-bottom: var(--spacing-md); }
        .checklist-progress-fill { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width .3s ease; }
        .checklist-items { display: flex; flex-direction: column; gap: var(--spacing-xs); }
        .checklist-row { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); border-radius: 12px; background: var(--color-surface); border: 1px solid var(--color-border-light); transition: all .2s; }
        .checklist-row.completed { background: var(--color-primary-light); border-color: var(--color-primary-soft); }
        .check-btn { flex-shrink: 0; }
        .check-circle { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; transition: all .2s; }
        .check-circle.checked { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
        .check-label { flex: 1; font-size: var(--font-sm); display: flex; align-items: center; gap: var(--spacing-xs); }
        .line-through { text-decoration: line-through; color: var(--color-text-tertiary); }
        .required-dot { background: var(--color-red); color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 4px; }
        .photo-btn { flex-shrink: 0; font-size: 20px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--color-bg); }
        .check-thumb { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .upload-all-btn { width: 100%; padding: var(--spacing-md); border: 2px dashed var(--color-primary); border-radius: 16px; color: var(--color-primary); font-weight: 700; font-size: var(--font-md); cursor: pointer; margin-bottom: var(--spacing-md); transition: all .2s; }
        .upload-all-btn:hover { background: var(--color-primary-light); }
        .action-footer { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; padding: var(--spacing-md); padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom, 0)); background: var(--color-surface); border-top: 1px solid var(--color-border-light); box-shadow: 0 -4px 12px rgba(0,0,0,.06); z-index: 100; }
      `}</style>
        </div>
    )
}
