'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Job, ChecklistItem } from '@/lib/types'
import SecureImage from '@/components/common/SecureImage'

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

        // photos 테이블에 기록
        await supabase.from('photos').insert({
            job_id: id,
            uploaded_by: user.id,
            type: 'after',
            photo_url: path,
            checklist_item_id: checklistIdx !== undefined ? checklist[checklistIdx]?.id : null,
        })

        // 체크리스트에 사진 URL 업데이트
        if (checklistIdx !== undefined) {
            const next = [...checklist]
            next[checklistIdx] = { ...next[checklistIdx], completed: true, photo_url: path }
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

        const currentReports = (job.pre_damage_report as any) || []
        const newReport = { desc: damageDesc || '특이사항 없음', photo_url: path }

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
        <div className="page-container premium-bg" style={{ backgroundColor: '#fff', minHeight: '100dvh' }}>
            <header style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 20px 16px',
                background: '#fff', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #F2F4F6'
            }}>
                <button onClick={() => router.back()} style={{
                    fontSize: '20px', width: '40px', height: '40px', background: '#F2L4F6',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
                }}>←</button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#000', letterSpacing: '-0.02em' }}>{space?.name || '청소 작업'}</h1>
                    <p style={{ fontSize: '13px', color: '#8B95A1', fontWeight: 500, marginTop: '2px' }}>{space?.address}</p>
                </div>
            </header>

            {/* 상태 진행 카드 */}
            <div style={{ padding: '20px' }}>
                <div style={{
                    background: '#F9FAFB', borderRadius: '24px', padding: '24px',
                    border: '1px solid #F2F4F6', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{
                            background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                            padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800
                        }}>
                            {job.status === 'ASSIGNED' && '준비 단계'}
                            {job.status === 'EN_ROUTE' && '이동 단계'}
                            {job.status === 'ARRIVED' && '작업 대기'}
                            {job.status === 'IN_PROGRESS' && '작업 중'}
                            {['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && '완료 확인'}
                        </span>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary)' }}>₩{job.price.toLocaleString()}</div>
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#191F28' }}>
                        {job.status === 'ASSIGNED' && '🚗 지금 출발할까요?'}
                        {job.status === 'EN_ROUTE' && '📍 현장으로 가는 중'}
                        {job.status === 'ARRIVED' && '🏠 도착을 완료했어요'}
                        {job.status === 'IN_PROGRESS' && '🧹 반짝이는 청소 중'}
                        {job.status === 'SUBMITTED' && '⏳ 품질 검수 대기'}
                        {job.status === 'APPROVED' && '✅ 승인된 작업'}
                        {job.status === 'PAID_OUT' && '💰 정산이 완료된 작업'}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#4E5968', lineHeight: 1.5 }}>
                        {job.status === 'ASSIGNED' && '지금 출발 버튼을 눌러 이동을 시작하세요.'}
                        {job.status === 'EN_ROUTE' && '현장에 도착하면 도착 완료 버튼을 눌러주세요.'}
                        {job.status === 'ARRIVED' && '체크리스트를 확인하며 꼼꼼히 청소해 주세요.'}
                        {job.status === 'IN_PROGRESS' && '완료 후에는 모든 공간 사진을 꼭 남겨주세요.'}
                        {job.status === 'SUBMITTED' && 'AI와 공간 파트너가 꼼꼼히 확인하고 있어요.'}
                    </p>
                </div>
            </div>

            <div className="page-content" style={{ padding: '0 20px 120px' }}>
                {/* 매칭 전용 상세 정보 */}
                {['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '20px' }}>📘</span> 현장 가이드라인
                            </h3>
                            <button
                                onClick={() => router.push(`/chat/${id}`)}
                                style={{ background: '#F2F4F6', color: '#4E5968', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none' }}
                            >
                                💬 채팅 문의
                            </button>
                        </div>

                        {/* 기준 사진 */}
                        {(space?.reference_photos?.length > 0) && (
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '10px' }}>✨ 목표 청소 상태 (기준 뷰)</p>
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
                                    {space.reference_photos.map((url: string, i: number) => (
                                        <img key={i} src={url} alt="기준사진" style={{ width: 140, height: 100, borderRadius: '16px', objectFit: 'cover', flexShrink: 0, border: '1px solid #F2F4F6' }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 출입 방법 */}
                            <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '20px', border: '1px solid #F2F4F6' }}>
                                <div style={{ fontSize: '12px', color: '#8B95A1', fontWeight: 700, marginBottom: '6px' }}>🔑 출입 방법 및 비밀번호</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {space?.entry_code || '현장 확인 필요'}
                                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(space?.address || '')}`} target="_blank" rel="noreferrer"
                                        style={{ background: '#03C75A', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}>
                                        🗺️ 길찾기
                                    </a>
                                </div>
                            </div>

                            {/* 도구 위치 및 쓰레기 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '20px', border: '1px solid #F2F4F6' }}>
                                    <div style={{ fontSize: '12px', color: '#8B95A1', fontWeight: 700, marginBottom: '4px' }}>🧽 도구 위치</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4E5968' }}>{space?.cleaning_tool_location || '제공 안됨'}</div>
                                </div>
                                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '20px', border: '1px solid #F2F4F6' }}>
                                    <div style={{ fontSize: '12px', color: '#8B95A1', fontWeight: 700, marginBottom: '4px' }}>🗑 쓰레기 방식</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4E5968' }}>{space?.trash_guide || '확인 필요'}</div>
                                </div>
                            </div>

                            {space?.parking_guide && (
                                <div style={{ padding: '0 8px', fontSize: '13px', color: '#6B7684' }}>
                                    <span style={{ fontWeight: 800 }}>🚗 주차: </span>{space.parking_guide}
                                </div>
                            )}

                            {space?.caution_notes && (
                                <div style={{ padding: '16px', borderRadius: '16px', background: '#FFF1F2', color: '#E11D48', fontSize: '13px', fontWeight: 600 }}>
                                    <span style={{ display: 'block', fontWeight: 800, marginBottom: '4px' }}>⚠️ 주의사항</span>
                                    {space.caution_notes}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 파손 사전 보고 */}
                {job.status === 'ARRIVED' && (
                    <div style={{ marginTop: '24px', padding: '20px', background: '#FFF1F2', borderRadius: '24px', border: '1px solid #FECDD3' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>📢</span>
                            <div>
                                <h4 style={{ color: '#E11D48', fontWeight: 800, margin: '0 0 4px' }}>작업 시작 전 체크하세요!</h4>
                                <p style={{ fontSize: '13px', color: '#BE123C', lineHeight: 1.5, marginBottom: '16px' }}>
                                    이전 사용자가 망가뜨린 부분이 있나요? 나중에 책임질 수 없도록 미리 사진을 찍어 보고하세요.
                                </p>
                                {showDamageReport ? (
                                    <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #FF8E99' }}>
                                        <textarea
                                            placeholder="파손이나 오염 상태를 간략히 적어주세요."
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #F2F4F6', background: '#F9FAFB', fontSize: '14px', marginBottom: '12px' }}
                                            rows={2}
                                            value={damageDesc}
                                            onChange={e => setDamageDesc(e.target.value)}
                                        />
                                        <button
                                            style={{ width: '100%', height: '48px', background: '#E11D48', color: '#fff', borderRadius: '12px', fontWeight: 700, border: 'none' }}
                                            onClick={() => damagePhotoInputRef.current?.click()}
                                            disabled={submitting || !damageDesc}
                                        >
                                            {submitting ? '제출 중...' : '📸 사진 찍고 보고하기'}
                                        </button>
                                        <button style={{ width: '100%', background: 'transparent', color: '#8B95A1', fontSize: '13px', marginTop: '10px', border: 'none' }} onClick={() => setShowDamageReport(false)}>취소</button>
                                    </div>
                                ) : (
                                    <button
                                        style={{ width: '100%', height: '44px', background: '#E11D48', color: '#fff', borderRadius: '12px', fontWeight: 800, border: 'none' }}
                                        onClick={() => setShowDamageReport(true)}
                                    >
                                        파손/오염 사전 보고
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 체크리스트 섹션 */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && checklist.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>📝 체크리스트</h2>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>{completedCount} / {checklist.length} 완료</span>
                        </div>
                        <div style={{ height: '8px', background: '#F2F4F6', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--color-primary)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {checklist.map((item, idx) => (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    borderRadius: '16px', background: item.completed ? '#F0F7FF' : '#F9FAFB',
                                    border: `1px solid ${item.completed ? '#D0E6FF' : '#F2F4F6'}`,
                                    transition: 'all 0.2s'
                                }}>
                                    <button onClick={() => toggleChecklist(idx)} disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: item.completed ? 'var(--color-primary)' : '#fff',
                                            border: `2px solid ${item.completed ? 'var(--color-primary)' : '#D1D8E0'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: '14px', fontWeight: 800
                                        }}>
                                        {item.completed ? '✓' : ''}
                                    </button>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            fontSize: '15px', fontWeight: 600,
                                            color: item.completed ? '#8B95A1' : '#191F28',
                                            textDecoration: item.completed ? 'line-through' : 'none'
                                        }}>{item.label}</span>
                                        {item.required && <span style={{ color: '#E11D48', fontSize: '10px', fontWeight: 800, background: '#FFF1F2', padding: '1px 4px', borderRadius: '4px' }}>필수</span>}
                                    </div>
                                    {job.status === 'IN_PROGRESS' && (
                                        <button
                                            onClick={() => { setActiveUploadIdx(idx); fileInputRef.current?.click() }}
                                            style={{ background: '#fff', border: '1px solid #F2F4F6', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                                        >
                                            {item.photo_url ? '✅' : uploadingIdx === idx ? '⏳' : '📸'}
                                        </button>
                                    )}
                                    {item.photo_url && !['IN_PROGRESS'].includes(job.status) && (
                                        <SecureImage srcOrPath={item.photo_url} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 비품 점검 */}
                {['IN_PROGRESS', 'ARRIVED', 'SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status) && (job.supplies_to_check as string[])?.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>🚨 부족한 비품 보고</h2>
                        <p style={{ fontSize: '13px', color: '#8B95A1', marginBottom: '16px' }}>공간에 없는 비품을 선택해 실시간으로 알려주세요.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {(job.supplies_to_check as string[]).map((item, idx) => {
                                const isShort = supplyShortages.includes(item)
                                return (
                                    <button key={idx}
                                        onClick={() => {
                                            setSupplyShortages(prev =>
                                                prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
                                            )
                                        }}
                                        disabled={['SUBMITTED', 'APPROVED', 'PAID_OUT'].includes(job.status)}
                                        style={{
                                            padding: '16px', borderRadius: '20px', textAlign: 'center',
                                            background: isShort ? '#FFF1F2' : '#F9FAFB',
                                            border: `1px solid ${isShort ? '#FECDD3' : '#F2F4F6'}`,
                                            color: isShort ? '#E11D48' : '#4E5968',
                                            fontSize: '14px', fontWeight: 700, transition: 'all 0.2s'
                                        }}
                                    >
                                        {isShort && '⚠️ '} {item}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 지원서 폼 (OPEN) */}
                {job.status === 'OPEN' && !application && (
                    <div style={{ marginTop: '32px', padding: '24px', background: '#F0F7FF', borderRadius: '24px', border: '1px solid #D0E6FF' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#191F28' }}>✨ 이 청소에 지원하시겠어요?</h3>
                        <p style={{ fontSize: '14px', color: '#4E5968', lineHeight: 1.5, marginBottom: '20px' }}>공간 파트너가 클린파트너님의 프로필과 메시지를 확인 후 매칭을 수락합니다.</p>
                        <textarea
                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #D1D8E0', background: '#fff', fontSize: '15px', marginBottom: '20px' }}
                            placeholder="간단한 인사말이나 어필할 내용을 적어주세요 (선택)"
                            rows={3}
                            value={applyMessage}
                            onChange={e => setApplyMessage(e.target.value)}
                        />
                        <button
                            onClick={handleApply}
                            disabled={submitting}
                            style={{
                                width: '100%', height: '56px', borderRadius: '16px', border: 'none',
                                background: 'var(--color-primary)', color: '#fff',
                                fontSize: '16px', fontWeight: 800,
                                boxShadow: '0 8px 16px rgba(49, 130, 246, 0.2)',
                                opacity: submitting ? 0.6 : 1
                            }}
                        >
                            {submitting ? '지원 처리 중...' : '🙋‍♂️ 지원하기'}
                        </button>
                    </div>
                )}

                {/* 지원 완료 대기 상태 */}
                {job.status === 'OPEN' && application && (
                    <div style={{ marginTop: '32px', padding: '24px', background: '#F9FAFB', borderRadius: '24px', border: '1px solid #F2F4F6', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>지원을 완료했어요</h3>
                        <p style={{ fontSize: '14px', color: '#8B95A1' }}>공간 파트너의 매칭 승낙을 기다리고 있습니다.</p>
                    </div>
                )}

                {/* 추가 요금 청구 */}
                {job.status === 'IN_PROGRESS' && (
                    <div style={{ marginTop: '40px', padding: '24px', background: '#F9FAFB', borderRadius: '24px', border: '1px solid #F2F4F6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>💸 특이 오염 추가 청구</h3>
                            <button style={{ color: 'var(--color-primary)', background: 'none', border: 'none', fontWeight: 700, fontSize: '13px' }} onClick={() => setShowExtraCharge(!showExtraCharge)}>
                                {showExtraCharge || extraCharge > 0 ? '접기' : '작성하기'}
                            </button>
                        </div>
                        {(showExtraCharge || extraCharge > 0) && (
                            <div>
                                <p style={{ fontSize: '13px', color: '#8B95A1', lineHeight: 1.5, marginBottom: '16px' }}>토사물, 심한 쓰레기 등 규정 외 오염이 있다면 금액을 청구하세요. (사진 증거 필수)</p>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>추가 금액 (원)</label>
                                    <input
                                        type="number" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #F2F4F6', fontSize: '14px', fontWeight: 700 }}
                                        placeholder="청구할 금액 입력"
                                        value={extraCharge || ''} onChange={e => setExtraCharge(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>청구 사유</label>
                                    <textarea
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #F2F4F6', fontSize: '14px' }}
                                        placeholder="상세 사유를 입력하세요." rows={2}
                                        value={extraChargeReason} onChange={e => setExtraChargeReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 고객센터 지원 버튼 */}
                {['ARRIVED', 'IN_PROGRESS'].includes(job.status) && (
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <button
                            onClick={() => { if (window.confirm('도저히 작업이 불가능한 현장인가요? CS팀이 즉시 개입합니다.')) alert('접수되었습니다.'); }}
                            style={{ color: '#8B95A1', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', textDecoration: 'underline' }}>
                            도움이 필요한가요? CS 긴급 중재 요청
                        </button>
                    </div>
                )}
            </div>

            {/* 하단 플로팅 버튼 */}
            {flow && job.status !== 'OPEN' && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 50, transform: 'translateX(-50%)',
                    width: '100%', maxWidth: '480px', padding: '20px',
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(15px)',
                    borderTop: '1px solid #F2F4F6', zIndex: 100
                }}>
                    <button
                        onClick={handleStatusNext}
                        disabled={submitting || (extraCharge > 0 && !extraChargeReason.trim())}
                        style={{
                            width: '100%', height: '56px', borderRadius: '18px', border: 'none',
                            background: 'var(--color-primary)', color: '#fff',
                            fontSize: '18px', fontWeight: 800,
                            boxShadow: '0 8px 16px rgba(49, 130, 246, 0.25)',
                            transition: 'all 0.2s', opacity: (submitting || (extraCharge > 0 && !extraChargeReason.trim())) ? 0.5 : 1
                        }}
                    >
                        {submitting ? '처리 중...' : flow.btnLabel}
                    </button>
                </div>
            )}

            {/* 숨겨진 입력 */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => { const file = e.target.files?.[0]; if (file && activeUploadIdx !== null) handlePhotoUpload(file, activeUploadIdx); e.target.value = ''; }} />
            <input ref={damagePhotoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => { const file = e.target.files?.[0]; if (file) handleDamageReportUpload(file); e.target.value = ''; }} />

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
            `}</style>
        </div>
    )
}
