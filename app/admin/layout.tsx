import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        redirect('/')
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
            <aside style={{ width: 240, background: '#1E293B', color: '#fff', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800, padding: '0 12px' }}>
                    <span style={{ color: '#38BDF8' }}>CleanGig</span> Admin
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Link href="/admin" style={{ padding: '12px', borderRadius: 8, color: '#CBD5E1', textDecoration: 'none', fontWeight: 600, display: 'block' }}>
                        대시보드 홈
                    </Link>
                    <Link href="/admin/users" style={{ padding: '12px', borderRadius: 8, color: '#CBD5E1', textDecoration: 'none', fontWeight: 600, display: 'block' }}>
                        가입자 관리
                    </Link>
                    <Link href="/admin/jobs" style={{ padding: '12px', borderRadius: 8, color: '#CBD5E1', textDecoration: 'none', fontWeight: 600, display: 'block' }}>
                        일감 현황
                    </Link>
                    <Link href="/admin/disputes" style={{ padding: '12px', borderRadius: 8, color: '#F87171', textDecoration: 'none', fontWeight: 600, display: 'block' }}>
                        🚨 분쟁 관리
                    </Link>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <Link href="/" style={{ padding: '12px', color: '#94A3B8', fontSize: 13, textDecoration: 'none', display: 'block' }}>
                        ← 일반 홈으로 돌아가기
                    </Link>
                </div>
            </aside>
            <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    )
}
