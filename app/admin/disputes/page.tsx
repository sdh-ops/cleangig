import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { timeAgo, formatKRW } from '@/lib/utils'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!isPlatformAdmin(me?.email, me?.role)) redirect('/')

  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, status, category, description, refund_amount, created_at, job_id, reporter:reporter_id(name), jobs(id, price, spaces(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  const list = (disputes || []) as any[]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-danger-soft flex items-center justify-center">
          <AlertTriangle size={20} className="text-danger" />
        </div>
        <div>
          <h1 className="h-hero text-ink">분쟁 관리</h1>
          <p className="t-caption mt-1">신고 내용과 AI 판정을 기반으로 조치하세요.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[14px] font-bold text-text-soft">분쟁 건이 없습니다 ✨</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((d) => (
            <li key={d.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`chip !text-[10px] ${
                    d.status === 'OPEN' ? 'chip-warning' : d.status === 'RESOLVED' ? 'chip-success' : 'chip-muted'
                  }`}
                >
                  {d.status}
                </span>
                <span className="chip chip-info !text-[10px]">{d.category || '일반'}</span>
                <span className="text-[11px] text-text-faint font-bold ml-auto">{timeAgo(d.created_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/requests/${d.job_id}`} className="text-[14px] font-extrabold text-ink hover:text-brand-dark">
                    {d.jobs?.spaces?.name || '(공간 없음)'}
                  </Link>
                  <p className="text-[12px] text-text-soft font-bold mt-0.5">신고자: {d.reporter?.name || '알수없음'}</p>
                </div>
                {d.refund_amount > 0 && (
                  <div className="t-money text-[14px] text-danger">환불 {formatKRW(d.refund_amount)}</div>
                )}
              </div>
              {d.description && (
                <p className="mt-3 text-[13px] font-medium text-ink-soft leading-snug line-clamp-2">{d.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
