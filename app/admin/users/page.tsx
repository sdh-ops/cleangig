import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminUsersPage() {
    const supabase = await createClient()

    // 최신 가입자 순으로 전체 유저 조회
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>가입자 관리</h1>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>이름</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>이메일</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>역할</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>연락처</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>스파클 온도</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569' }}>가입일</th>
                            <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>상태/관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '16px 20px', fontWeight: 500 }}>
                                    {user.name}
                                    {user.is_admin && <span style={{ marginLeft: 8, background: '#DC2626', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>ADMIN</span>}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#64748B' }}>{user.email}</td>
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{
                                        background: user.role === 'operator' ? '#E0F2FE' : '#D1FAE5',
                                        color: user.role === 'operator' ? '#0369A1' : '#059669',
                                        padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-block'
                                    }}>
                                        {user.role === 'operator' ? '공간 파트너' : '클린 파트너'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', color: '#64748B' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '16px 20px', color: '#E11D48', fontWeight: 800 }}>{user.sparkle_score ? `${user.sparkle_score.toFixed(1)}점` : '-'}</td>
                                <td style={{ padding: '16px 20px', color: '#64748B' }}>{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    {/* TODO: 계정 정지 기능은 API 확장 시 추가 */}
                                    <button style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                                        상세
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!users || users.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>가입자가 없습니다.</div>
                )}
            </div>
        </div>
    )
}
