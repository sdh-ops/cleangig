import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/common/Header'
import EmptyState from '@/components/common/EmptyState'
import { Star, BadgeCheck, Briefcase, ShieldCheck, Heart } from 'lucide-react'
import { TIER_BENEFITS } from '@/lib/matching'
import { timeAgo } from '@/lib/utils'

export default async function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: worker } = await supabase
    .from('users')
    .select('id, name, profile_image, bio, tier, avg_rating, total_jobs, is_verified, manner_temperature, role')
    .eq('id', id)
    .single()

  if (!worker || worker.role !== 'worker') notFound()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer:reviewer_id(name)')
    .eq('reviewee_id', id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: favorite } = await supabase
    .from('favorite_partners')
    .select('id')
    .eq('operator_id', user.id)
    .eq('worker_id', id)
    .maybeSingle()

  const tier = TIER_BENEFITS[worker.tier || 'STARTER']

  return (
    <div className="sseuksak-shell">
      <Header title="클린 파트너 프로필" showBack />
      <div className="flex-1 pb-8">
        <div className="px-5 pt-5 pb-6 bg-gradient-to-br from-brand to-brand-dark text-white relative overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-3xl overflow-hidden">
              {worker.profile_image ? (
                <img src={worker.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                worker.name?.charAt(0) ?? '?'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[22px] font-black">{worker.name}</h2>
                {worker.is_verified && (
                  <BadgeCheck size={18} className="text-sun" fill="#FFB800" stroke="#0A1F3D" strokeWidth={2} />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white/20">
                  {tier.label}
                </span>
                <span className="flex items-center gap-0.5 text-white/90 text-[13px] font-bold">
                  <Star size={13} className="text-sun" fill="currentColor" />
                  {(worker.avg_rating ?? 0).toFixed(1)}
                </span>
              </div>
              {worker.bio && <p className="text-[12.5px] font-bold text-white/85 mt-2 leading-snug">{worker.bio}</p>}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label="완료 작업" value={`${worker.total_jobs ?? 0}건`} icon={<Briefcase size={14} />} />
            <Stat label="매너 온도" value={`${(worker.manner_temperature ?? 36.5).toFixed(1)}°`} icon={<ShieldCheck size={14} />} />
            <Stat label="티어" value={tier.label} icon={<Star size={14} />} />
          </div>
        </div>

        {/* Reviews */}
        <div className="px-5 pt-5">
          <h3 className="h-section text-ink mb-3">받은 리뷰 {reviews?.length ? `(${reviews.length})` : ''}</h3>
          {!reviews || reviews.length === 0 ? (
            <div className="card p-2">
              <EmptyState icon={<Star size={22} />} title="아직 리뷰가 없어요" />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {reviews.map((r: any) => (
                <li key={r.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          className={n <= (r.rating ?? 0) ? 'text-sun' : 'text-line-strong'}
                          fill={n <= (r.rating ?? 0) ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] font-bold text-text-soft">
                      {r.reviewer?.name ?? '익명'} · {timeAgo(r.created_at)}
                    </span>
                  </div>
                  {r.comment && <p className="text-[13.5px] font-medium text-ink leading-snug">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-line-soft bg-surface/95 backdrop-blur safe-bottom">
        <div className="max-w-[480px] mx-auto px-5 py-3.5 flex gap-2">
          <Link
            href={`/requests/create?preferred_worker=${worker.id}`}
            className="flex-1 btn btn-primary"
          >
            <Briefcase size={16} /> 이 파트너에게 요청
          </Link>
          <button
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${favorite ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-text-faint'}`}
            aria-label="단골 등록"
          >
            <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold text-white/70">{icon}{label}</div>
      <div className="text-[14px] font-black text-white mt-0.5">{value}</div>
    </div>
  )
}
