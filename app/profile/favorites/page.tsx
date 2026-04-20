import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/common/Header'
import EmptyState from '@/components/common/EmptyState'
import { Heart, Star, ChevronRight } from 'lucide-react'
import { TIER_BENEFITS } from '@/lib/matching'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('favorite_partners')
    .select('id, created_at, users:worker_id(id, name, profile_image, tier, avg_rating, total_jobs)')
    .eq('operator_id', user.id)
    .order('created_at', { ascending: false })

  const list = (data || []) as any[]

  return (
    <div className="sseuksak-shell">
      <Header title="단골 작업자" showBack />
      <div className="flex-1 px-5 pt-4 pb-20">
        {list.length === 0 ? (
          <div className="card p-2 mt-4">
            <EmptyState
              icon={<Heart size={22} />}
              title="아직 단골 작업자가 없어요"
              description="만족했던 작업자를 하트로 저장해보세요. 다음 요청 시 우선 매칭됩니다."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((fav) => {
              const u = fav.users
              if (!u) return null
              const tier = TIER_BENEFITS[u.tier || 'STARTER']
              return (
                <li key={fav.id}>
                  <Link href={`/profile/worker/${u.id}`} className="card-interactive p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center font-black overflow-hidden shrink-0">
                      {u.profile_image ? <img src={u.profile_image} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[14.5px] font-extrabold text-ink truncate">{u.name}</h4>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
                        >
                          {tier.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11.5px] font-bold text-text-soft">
                        <span className="flex items-center gap-0.5">
                          <Star size={11} className="text-sun" fill="currentColor" />
                          {(u.avg_rating ?? 0).toFixed(1)}
                        </span>
                        <span>·</span>
                        <span>{u.total_jobs ?? 0}건</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-faint shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
