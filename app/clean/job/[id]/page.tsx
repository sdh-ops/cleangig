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
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeUploadIdx, setActiveUploadIdx] = useState<number | null>(null)

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
        const { data } = await supabase
            .from('jobs').select('*, spaces(*)')
            .eq('id', id).single()
        if (data) {
            setJob(data as Job)
            setChecklist((data.checklist as ChecklistItem[]) || [])
        }
        setLoading(false)
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
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>🏠 공간 이용 가이드</h3>
                            <button
                                onClick={() => router.push(`/chat/${id}`)}
                                style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}
                            >
                                💬 운영자 채팅
                            </button>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)' }}>
                            <div className="guide-item">
                                <span className="guide-label">상세 주소</span>
                                <div className="guide-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {space?.address} {space?.address_detail}
                                    <a
                                        href={`https://map.kakao.com/link/search/${encodeURIComponent(space?.address)}`}
                                        target="_blank"
                                        className="map-link"
                                    >
                                        📍 길찾기
                                    </a>
                                </div>
                            </div>
                            <div className="guide-item" style={{ marginTop: 12 }}>
                                <span className="guide-label">출입 비밀번호</span>
                                <div className="guide-value font-bold" style={{ fontSize: 18, color: 'var(--color-primary)' }}>
                                    {space?.entry_code || '현장 확인 필요'}
                                </div>
                            </div>
                            {space?.caution_notes && (
                                <div className="guide-item" style={{ marginTop: 12 }}>
                                    <span className="guide-label">주의사항</span>
                                    <div className="guide-value" style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                                        {space?.caution_notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 일정 정보 */}
                <div className="info-card card">
                    <div className="info-row">
                        <span>⏰ 시작 예정</span>
                        <span className="font-bold">{new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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

                {/* 완료 사진 업로드 버튼 (IN_PROGRESS) */}
                {job.status === 'IN_PROGRESS' && (
                    <button className="upload-all-btn" onClick={() => { setActiveUploadIdx(undefined as any); fileInputRef.current?.click() }}>
                        📸 청소 완료 사진 추가
                    </button>
                )}
            </div>

            {/* 하단 액션 버튼 */}
            {flow && (
                <div className="action-footer">
                    <button
                        className={`btn ${flow.btnColor} btn-full btn-lg`}
                        onClick={handleStatusNext}
                        disabled={submitting}
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
