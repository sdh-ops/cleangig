import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled } from '@/lib/utils'
import { Wallet } from 'lucide-react'
import type { PaymentStatus } from '@/lib/types'

export default async function HostPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'operator') redirect('/earnings')

  const { data } = await supabase
    .from('payments')
    .select('id, status, gross_amount, platform_fee, created_at, jobs(id, scheduled_at, spaces(name))')
    .eq('operator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60)

  const list = (data || []) as any[]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const monthPaid = list
    .filter((p) => p.created_at >= monthStart && ['HELD', 'RELEASED'].includes(p.status))
    .reduce((s, p) => s + (p.gross_amount || 0), 0)
  const ytd = list.filter((p) => ['HELD', 'RELEASED'].includes(p.status)).reduce((s, p) => s + (p.gross_amount || 0), 0)

  return (
    <div className="sseuksak-shell">
      <Header title="결제 내역" />
      <div className="flex-1 pb-28 px-5 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <SummaryCard label="이번 달 지출" value={formatKRW(monthPaid, { short: true })} />
          <SummaryCard label="누적 지출" value={formatKRW(ytd, { short: true })} />
        </div>

        {list.length === 0 ? (
          <div className="card p-2">
            <EmptyState icon={<Wallet size={22} />} title="결제 내역이 없어요" description="청소 요청이 완료되면 여기에 표시됩니다." />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {list.map((p) => (
              <li key={p.id}>
                <Link href={`/requests/${p.jobs?.id}`} className="card-interactive p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-softer flex items-center justify-center text-brand-dark shrink-0">
                    <Wallet size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <StatusChip kind="payment" status={p.status as PaymentStatus} size="sm" />
                    </div>
                    <h4 className="text-[14px] font-extrabold text-ink truncate">{p.jobs?.spaces?.name || '결제'}</h4>
                    <p className="text-[11.5px] text-text-soft font-bold mt-0.5">{formatScheduled(p.jobs?.scheduled_at || p.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="t-money text-[14.5px] text-ink">-{formatKRW(p.gross_amount)}</div>
                    <p className="text-[10.5px] font-bold text-text-faint mt-0.5">수수료 {formatKRW(p.platform_fee)}</p>
                  </div>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-bold text-text-soft">{label}</p>
      <p className="t-money text-[22px] text-ink mt-1">{value}</p>
    </div>
  )
}
