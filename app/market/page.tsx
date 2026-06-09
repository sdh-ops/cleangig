'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import { Sparkles, Star, Heart, Search, BadgeCheck } from 'lucide-react'
import { TIER_BENEFITS } from '@/lib/matching'

type Worker = {
  id: string
  name: string
  profile_image?: string
  tier?: 'STARTER' | 'SILVER' | 'GOLD' | 'MASTER'
  avg_rating?: number
  total_jobs?: number
  bio?: string
  is_verified?: boolean
}

export default function MarketPage() {
  const supabase = createClient()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'operator' | 'worker'>('operator')

  useEffect(() => {
    (async () => {
      const [{ data: { user } }, { data: workersData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('users')
          .select('id, name, profile_image, tier, avg_rating, total_jobs, bio, is_active, is_verified')
          .eq('role', 'worker')
          .eq('is_active', true)
          .order('is_verified', { ascending: false })
          .order('avg_rating', { ascending: false })
          .limit(60),
      ])
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
        if (profile?.role === 'worker') setRole('worker')
      }
      setWorkers((workersData || []) as Worker[])
      setLoading(false)
    })()
  }, [])

  const filtered = workers.filter(
    (w) => !q || w.name.toLowerCase().includes(q.toLowerCase()) || (w.bio && w.bio.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="sseuksak-shell">
      <Header title="클린파트너 찾기" showBack />

      <div className="sticky top-14 z-10 px-5 py-3 bg-canvas/95 backdrop-blur border-b border-line-soft">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 / 특징 검색"
            className="input pl-11"
          />
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-12">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[84px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-2 mt-4">
            <EmptyState icon={<Sparkles size={22} />} title="검색 결과가 없어요" description="다른 키워드로 검색해보세요." />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((w) => {
              const tier = TIER_BENEFITS[w.tier || 'STARTER']
              return (
                <li key={w.id}>
                  <Link href={`/profile/worker/${w.id}`} className="card-interactive p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-brand-softer text-brand-dark flex items-center justify-center font-black text-xl overflow-hidden shrink-0">
                      {w.profile_image ? (
                        <img src={w.profile_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        w.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[14.5px] font-extrabold text-ink truncate">{w.name}</h4>
                        {w.is_verified
                          ? <BadgeCheck size={15} className="text-sky-500 shrink-0" />
                          : <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 shrink-0">미인증</span>
                        }
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
                        >
                          {tier.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11.5px] font-bold text-text-soft">
                        <span className="flex items-center gap-0.5">
                          <Star size={11} className="text-sun" fill="currentColor" />
                          {(w.avg_rating ?? 0).toFixed(1)}
                        </span>
                        <span>·</span>
                        <span>{w.total_jobs ?? 0}건</span>
                      </div>
                      {w.bio && <p className="text-[11.5px] font-medium text-text-muted truncate mt-1">{w.bio}</p>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <BottomNav role={role} />
    </div>
  )
}
