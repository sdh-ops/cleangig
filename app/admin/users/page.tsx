import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import { Star, BadgeCheck, Phone, Mail } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import VerifyUserButton from '@/components/admin/VerifyUserButton'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>
}) {
  const sp = (await searchParams) || {}
  const roleFilter = sp.role || 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  let query = supabase
    .from('users')
    .select('id, name, email, phone, role, tier, total_jobs, avg_rating, is_verified, is_active, created_at, can_operate, can_work')
    .order('created_at', { ascending: false })
    .limit(200)

  if (roleFilter !== 'all') query = query.eq('role', roleFilter)

  const { data: users } = await query

  // 카운트
  const [cAll, cOp, cWorker] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
  ])

  const roleFilters = [
    { key: 'all',      label: `전체 ${cAll.count ?? 0}명` },
    { key: 'operator', label: `공간파트너 ${cOp.count ?? 0}명` },
    { key: 'worker',   label: `클린파트너 ${cWorker.count ?? 0}명` },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest mb-0.5">회원 관리</p>
        <h1 className="text-[20px] font-black text-slate-900">가입자 목록</h1>
      </div>

      {/* 역할 필터 */}
      <div className="flex items-center gap-2">
        {roleFilters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/users?role=${f.key}`}
            className={`px-3.5 py-1.5 rounded-full text-[14.5px] font-bold transition
              ${roleFilter === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* 유저 카드 리스트 (모바일 친화적) */}
      <div className="space-y-2">
        {(users || []).map((u: any) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-start gap-3">
              {/* 아바타 */}
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[15px] font-black text-slate-600">
                {(u.name || '?').charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                {/* 이름 + 뱃지 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-extrabold text-slate-900">{u.name || '이름 없음'}</span>
                  {u.is_verified && <BadgeCheck size={14} className="text-sky-500" />}
                  <span className={`text-[13px] font-black px-2 py-0.5 rounded-full
                    ${u.role === 'worker'   ? 'bg-sky-100 text-sky-700' :
                      u.role === 'admin'    ? 'bg-red-100 text-red-700' :
                      'bg-brand-softer text-brand-dark'}`}>
                    {u.role === 'operator' ? '공간파트너' :
                     u.role === 'worker'   ? '클린파트너' :
                     u.role === 'admin'    ? 'ADMIN' : '미정'}
                  </span>
                  {!u.is_active && (
                    <span className="text-[13px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">비활성</span>
                  )}
                </div>

                {/* 연락처 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  {u.phone && (
                    <a href={`tel:${u.phone}`} className="flex items-center gap-1 text-[14.5px] font-bold text-slate-600 hover:text-sky-600">
                      <Phone size={11} /> {u.phone}
                    </a>
                  )}
                  {u.email && (
                    <span className="flex items-center gap-1 text-[13.5px] text-slate-400 font-medium">
                      <Mail size={11} /> {u.email}
                    </span>
                  )}
                </div>

                {/* 작업 통계 (클린파트너) */}
                {u.role === 'worker' && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[13.5px] font-bold text-slate-500">
                      완료 <span className="text-slate-800 font-extrabold">{u.total_jobs ?? 0}건</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-[13.5px] font-bold text-slate-500">
                      <Star size={11} className="text-amber-400" fill="currentColor" />
                      <span className="text-slate-800 font-extrabold">{(u.avg_rating ?? 0).toFixed(1)}</span>
                    </span>
                    <span className={`text-[13px] font-black px-2 py-0.5 rounded-full
                      ${u.tier === 'MASTER' ? 'bg-purple-100 text-purple-700' :
                        u.tier === 'GOLD'   ? 'bg-amber-100 text-amber-700'   :
                        u.tier === 'SILVER' ? 'bg-slate-200 text-slate-600'   :
                        'bg-slate-100 text-slate-500'}`}>
                      {u.tier || 'STARTER'}
                    </span>
                  </div>
                )}
              </div>

              {/* 가입일 + 인증 버튼 */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                <p className="text-[13.5px] text-slate-400 font-bold">{timeAgo(u.created_at)}</p>
                <VerifyUserButton userId={u.id} isVerified={!!u.is_verified} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[13.5px] text-slate-400 font-bold">{(users || []).length}명 표시 중</p>
    </div>
  )
}
