import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // 유저 현황
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: opUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'operator')
    const { count: workerUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker')

    // 일감 현황
    const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
    const { count: openJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'OPEN')
    const { count: inProgressJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'])
    const { count: completedJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['APPROVED', 'PAID_OUT'])
    const { count: disputedJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'DISPUTED')

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>대시보드 홈</h1>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🧑‍🤝‍🧑 가입자 현황</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
                <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>전체 가입자</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0F172A' }}>{totalUsers}명</div>
                </div>
                <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>공간 파트너</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0EA5E9' }}>{opUsers}명</div>
                </div>
                <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>클린 파트너</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>{workerUsers}명</div>
                </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💼 청소 의뢰 현황</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
                <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>누적 요청</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{totalJobs}건</div>
                </div>
                <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>모집 중 (OPEN)</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0EA5E9' }}>{openJobs}건</div>
                </div>
                <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>진행 중</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{inProgressJobs}건</div>
                </div>
                <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>완료/정산</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{completedJobs}건</div>
                </div>
                <Link href="/admin/disputes" style={{ textDecoration: 'none', background: '#FEF2F2', padding: 20, borderRadius: 16, border: '1px solid #FECDD3', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: '#E11D48', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🚨 분쟁 중</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#BE123C' }}>{disputedJobs}건</div>
                </Link>
            </div>
        </div>
    )
}
