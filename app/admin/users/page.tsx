import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import { Star, BadgeCheck } from 'lucide-react'
import { maskName, timeAgo } from '@/lib/utils'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, phone, role, tier, total_jobs, avg_rating, is_verified, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="mb-6">
        <h1 className="h-hero text-ink">가입자 관리</h1>
        <p className="t-caption mt-1">최근 가입 순 200명. 티어 · 검증 · 평점 기준으로 관리하세요.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-muted text-[11px] font-black text-text-soft uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">티어</th>
                <th className="px-4 py-3">작업수</th>
                <th className="px-4 py-3">평점</th>
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {(users || []).map((u: any) => (
                <tr key={u.id} className="border-t border-line-soft hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-ink">{maskName(u.name || '무명')}</span>
                      {u.is_verified && <BadgeCheck size={14} className="text-brand-dark" />}
                    </div>
                    <div className="text-[11px] text-text-faint">{u.email || u.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${u.role === 'worker' ? 'chip-info' : u.role === 'admin' ? 'chip-danger' : 'chip-brand'} !text-[10px]`}>
                      {u.role === 'operator' ? '파트너' : u.role === 'worker' ? '작업자' : u.role === 'admin' ? 'Admin' : '미정'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="chip chip-muted !text-[10px]">{u.tier || 'STARTER'}</span></td>
                  <td className="px-4 py-3 font-bold text-ink">{u.total_jobs ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-0.5 font-bold text-ink">
                      <Star size={12} className="text-sun" fill="currentColor" />
                      {(u.avg_rating ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-soft">{timeAgo(u.created_at)}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="chip chip-success !text-[10px]">활성</span>
                    ) : (
                      <span className="chip chip-muted !text-[10px]">비활성</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
