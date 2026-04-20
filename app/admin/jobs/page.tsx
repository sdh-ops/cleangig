import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

export default async function AdminJobsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const sp = (await searchParams) || {}
  const statusFilter = sp.status || 'all'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  let query = supabase
    .from('jobs')
    .select('id, status, price, scheduled_at, is_urgent, spaces(name), operator:operator_id(name), worker:worker_id(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (statusFilter !== 'all') query = query.eq('status', statusFilter as JobStatus)

  const { data: jobs } = await query

  const filters: { key: string; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'OPEN', label: '매칭 대기' },
    { key: 'ASSIGNED', label: '배정' },
    { key: 'IN_PROGRESS', label: '진행' },
    { key: 'SUBMITTED', label: '검수 대기' },
    { key: 'APPROVED', label: '승인' },
    { key: 'DISPUTED', label: '분쟁' },
    { key: 'CANCELED', label: '취소' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="h-hero text-ink">청소 요청 관리</h1>
        <p className="t-caption mt-1">모든 작업을 모니터링하고 조치하세요.</p>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/jobs?status=${f.key}`}
            className={`shrink-0 chip ${statusFilter === f.key ? 'chip-brand' : 'chip-muted'} !px-3.5 !py-1.5`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-muted text-[11px] font-black text-text-soft uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">공간</th>
                <th className="px-4 py-3">파트너</th>
                <th className="px-4 py-3">작업자</th>
                <th className="px-4 py-3">예정</th>
                <th className="px-4 py-3">가격</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {(jobs || []).map((j: any) => (
                <tr key={j.id} className="border-t border-line-soft hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${j.id}`} className="font-extrabold text-ink hover:text-brand-dark">
                      {j.spaces?.name || '(공간 없음)'}
                    </Link>
                    {j.is_urgent && <span className="ml-2 chip chip-danger !text-[10px]">긴급</span>}
                  </td>
                  <td className="px-4 py-3 text-text-soft font-bold">{j.operator?.name || '-'}</td>
                  <td className="px-4 py-3 text-text-soft font-bold">{j.worker?.name || '미배정'}</td>
                  <td className="px-4 py-3 text-text-soft font-bold">{formatScheduled(j.scheduled_at)}</td>
                  <td className="px-4 py-3 font-extrabold text-ink t-money">{formatKRW(j.price, { short: true })}</td>
                  <td className="px-4 py-3">
                    <StatusChip kind="job" status={j.status as JobStatus} size="sm" />
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
