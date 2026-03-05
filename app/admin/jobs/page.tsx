import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminJobsPage() {
    const supabase = await createClient()

    // 일감 목록 (요청일 기준 내림차순 정렬)
    const { data: jobs } = await supabase
        .from('jobs')
        .select(`
            id, status, price, scheduled_at, created_at,
            spaces (name, address),
            operator:users!jobs_operator_id_fkey (id, name),
            worker:users!jobs_worker_id_fkey (id, name)
        `)
        .order('created_at', { ascending: false })

    const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
        OPEN: { label: '모집중', color: '#0369A1', bg: '#E0F2FE' },
        ASSIGNED: { label: '배정됨', color: '#5B21B6', bg: '#EDE9FE' },
        EN_ROUTE: { label: '이동중', color: '#5B21B6', bg: '#EDE9FE' },
        ARRIVED: { label: '도착', color: '#5B21B6', bg: '#EDE9FE' },
        IN_PROGRESS: { label: '진행중', color: '#B45309', bg: '#FEF3C7' },
        SUBMITTED: { label: '검수대기', color: '#0F766E', bg: '#CCFBF1' },
        APPROVED: { label: '승인됨', color: '#15803D', bg: '#DCFCE7' },
        DISPUTED: { label: '분쟁중', color: '#BE123C', bg: '#FFE4E6' },
        PAID_OUT: { label: '정산완료', color: '#15803D', bg: '#DCFCE7' },
        CANCELED: { label: '취소', color: '#334155', bg: '#F1F5F9' },
    }

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>전체 청소 의뢰 현황</h1>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>의뢰 공간</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>공간 파트너</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>클린 파트너</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>상태</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>청소 예정일시</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>금액</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>상세 보기</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs?.map((job: any) => {
                            const st = STATUS_MAP[job.status] || { label: job.status, color: '#000', bg: '#eee' }
                            return (
                                <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{job.spaces?.name}</div>
                                        <div style={{ fontSize: 12, color: '#64748B' }}>{job.spaces?.address}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#475569' }}>{job.operator?.name || '-'}</td>
                                    <td style={{ padding: '16px 20px', color: '#475569' }}>{job.worker?.name || '-'}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ background: st.bg, color: st.color, padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#64748B' }}>
                                        {new Date(job.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0F172A' }}>
                                        ₩{job.price.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <Link href={`/requests/${job.id}`} style={{ textDecoration: 'none', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#3B82F6', display: 'inline-block' }}>
                                            조회
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {(!jobs || jobs.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>생성된 청소 의뢰가 없습니다.</div>
                )}
            </div>
        </div>
    )
}
