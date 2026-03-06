'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDisputesClient({ initialJobs }: { initialJobs: any[] }) {
    const [jobs, setJobs] = useState(initialJobs)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const router = useRouter()

    const handleResolve = async (jobId: string, action: 'APPROVED' | 'CANCELED') => {
        if (!confirm(`이 청소요청을 ${action === 'APPROVED' ? '강제 승인' : '환불(취소)'} 처리하시겠습니까? 돌이킬 수 없습니다.`)) return

        setLoadingId(jobId)
        const supabase = createClient()

        // 청소요청 상태 변경
        const { error } = await supabase.from('jobs').update({ status: action }).eq('id', jobId)

        if (!error) {
            // 분쟁 상태 완료로 변경
            await supabase.from('disputes').update({ status: 'RESOLVED', resolution_notes: `Admin forced ${action}` }).eq('job_id', jobId)

            alert('처리되었습니다.')
            setJobs(prev => prev.filter(j => j.id !== jobId))
            router.refresh()
        } else {
            alert('처리 중 오류가 발생했습니다.')
            console.error(error)
        }
        setLoadingId(null)
    }

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🚨 분쟁 관리 (중재실)</h1>
            <p style={{ color: '#64748B', marginBottom: 32 }}>공간 파트너가 문제 신고를 접수한 항목들입니다. 사유를 확인하고 강제 정산 승인 혹은 취소(환불)를 진행하세요.</p>

            {jobs.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 60, textAlign: 'center', color: '#94A3B8' }}>
                    현재 분쟁 중인 건이 없습니다. 평화롭네요! 🕊️
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {jobs.map(job => (
                        <div key={job.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #FECDD3', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ background: '#FFF1F2', padding: '16px 24px', borderBottom: '1px solid #FECDD3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 20 }}>⚠️</span>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#BE123C' }}>{job.spaces?.name}</div>
                                        <div style={{ fontSize: 13, color: '#E11D48' }}>{job.spaces?.address}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#9F1239', fontWeight: 600 }}>청소 예정일시: {new Date(job.scheduled_at).toLocaleString()}</div>
                            </div>

                            <div style={{ padding: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                                    <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>공간 파트너 (신고자 측)</h4>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{job.operator?.name}</div>
                                        <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{job.operator?.phone} / {job.operator?.email}</div>
                                    </div>
                                    <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>클린 파트너 (작업자 측)</h4>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{job.worker?.name}</div>
                                        <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{job.worker?.phone} / {job.worker?.email}</div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>접수된 분쟁 사유</h4>
                                    {job.disputes?.map((d: any, idx: number) => (
                                        <div key={idx} style={{ background: '#FEF2F2', padding: 16, borderRadius: 8, borderLeft: '4px solid #E11D48', marginBottom: 8 }}>
                                            <div style={{ fontSize: 12, color: '#9f1239', fontWeight: 700, marginBottom: 4 }}>
                                                {new Date(d.created_at).toLocaleString()} ∙ {d.category}
                                            </div>
                                            <div style={{ fontSize: 14, color: '#4C1D95' }}>{d.description}</div>
                                        </div>
                                    ))}
                                    {(!job.disputes || job.disputes.length === 0) && (
                                        <div style={{ fontSize: 14, color: '#64748B' }}>사유 미기재</div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #E2E8F0', paddingTop: 24 }}>
                                    <Link href={`/requests/${job.id}`} style={{ flex: 1, textDecoration: 'none', textAlign: 'center', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#475569' }}>
                                        상세 뷰 / 증빙 사진 확인
                                    </Link>
                                    <button
                                        onClick={() => handleResolve(job.id, 'APPROVED')}
                                        disabled={loadingId === job.id}
                                        style={{ flex: 1, background: '#10B981', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                                    >
                                        {loadingId === job.id ? '처리 중...' : '강제 승인 (정산 지급)'}
                                    </button>
                                    <button
                                        onClick={() => handleResolve(job.id, 'CANCELED')}
                                        disabled={loadingId === job.id}
                                        style={{ flex: 1, background: '#DC2626', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                                    >
                                        {loadingId === job.id ? '처리 중...' : '환불(취소) 및 매칭 무효'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
