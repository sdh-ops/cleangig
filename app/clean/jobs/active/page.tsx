import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import NaverMap from '@/components/common/NaverMap'
import { Clock, MapPin, Sparkles, ChevronRight } from 'lucide-react'
import { formatKRW, formatScheduled, maskAddress, spaceTypeLabel } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

export default async function ActiveJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('jobs')
    .select('id, status, price, scheduled_at, is_urgent, spaces(id, name, type, address, location)')
    .eq('worker_id', user.id)
    .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'])
    .order('scheduled_at', { ascending: true })

  const jobs = (data || []) as any[]

  const markers = jobs
    .filter((j) => j.spaces?.location?.coordinates)
    .map((j, i) => ({
      lat: j.spaces.location.coordinates[1],
      lng: j.spaces.location.coordinates[0],
      title: `${i + 1}. ${j.spaces.name}`,
      tone: (j.is_urgent ? 'danger' : 'brand') as 'danger' | 'brand',
    }))

  return (
    <div className="sseuksak-shell">
      <Header title="진행 중 작업" showBell />
      <div className="flex-1 pb-28">
        {jobs.length === 0 ? (
          <div className="px-5 pt-5">
            <div className="card p-2">
              <EmptyState
                icon={<Sparkles size={22} />}
                title="진행 중인 작업이 없어요"
                description="작업을 찾아 지원하면 여기에 표시됩니다."
                actionLabel="작업 찾기"
                actionHref="/clean/jobs"
              />
            </div>
          </div>
        ) : (
          <>
            {markers.length > 0 && (
              <div className="mx-5 mt-4">
                <NaverMap height={200} markers={markers} showCurrent interactive />
              </div>
            )}

            <ul className="px-5 pt-4 flex flex-col gap-3">
              {jobs.map((j, i) => (
                <li key={j.id}>
                  <Link href={`/clean/job/${j.id}`} className="card-interactive p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-black text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
                          {j.is_urgent && <span className="chip chip-danger !text-[10px]">긴급</span>}
                        </div>
                        <h4 className="text-[14.5px] font-extrabold text-ink truncate">{j.spaces?.name}</h4>
                        <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                          <Clock size={11} /> {formatScheduled(j.scheduled_at)}
                        </p>
                        <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={11} /> {maskAddress(j.spaces?.address || '')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="t-money text-[14.5px] text-ink">{formatKRW(Math.round(j.price * 0.88), { short: true })}</div>
                        <ChevronRight size={16} className="text-text-faint ml-auto mt-0.5" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  )
}
