import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import { formatKRW, spaceTypeLabel } from '@/lib/utils'

export default async function SpacesListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spaces } = await supabase
    .from('spaces')
    .select('id, name, type, base_price, is_active, photos, address')
    .eq('operator_id', user.id)
    .order('created_at', { ascending: false })

  const list = (spaces || []) as any[]

  return (
    <div className="sseuksak-shell">
      <Header
        title="내 공간"
        rightSlot={
          <Link
            href="/spaces/create"
            className="flex items-center gap-1 text-brand-dark font-bold text-sm px-3 py-1.5 rounded-full hover:bg-brand-softer"
          >
            <Plus size={16} strokeWidth={2.5} /> 새 공간
          </Link>
        }
      />
      <div className="flex-1 pb-28 px-5 pt-4">
        {list.length === 0 ? (
          <div className="card p-2 mt-4">
            <EmptyState
              icon={<Building2 size={24} />}
              title="등록된 공간이 없어요"
              description="첫 공간을 등록하고 원클릭 청소 요청을 시작하세요."
              actionLabel="공간 등록하기"
              actionHref="/spaces/create"
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((s) => (
              <li key={s.id}>
                <Link href={`/spaces/${s.id}`} className="card-interactive p-4 flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl bg-surface-muted overflow-hidden shrink-0 relative">
                    {s.photos?.[0] ? (
                      <img src={s.photos[0]} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-softer text-brand-dark">
                        <Building2 size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="chip chip-brand !text-[10px] !px-2 !py-0.5">
                        {spaceTypeLabel(s.type)}
                      </span>
                      {!s.is_active && <span className="chip chip-muted !text-[10px]">비활성</span>}
                    </div>
                    <h4 className="text-[14.5px] font-extrabold text-ink truncate">{s.name}</h4>
                    <p className="text-[11.5px] text-text-soft font-bold truncate mt-0.5">
                      {s.address?.split(' ').slice(0, 3).join(' ')} · 기본 {formatKRW(s.base_price, { short: true })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-text-faint shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav role="operator" />
    </div>
  )
}
