import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import { formatKRW, timeAgo } from '@/lib/utils'
import { Banknote, Clock, CheckCircle2, AlertCircle, Wallet } from 'lucide-react'
import SettlementActions from './SettlementActions'

export const dynamic = 'force-dynamic'

export default async function SettlementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('email, role').eq('id', user.id).single()
  if (!profile || !isPlatformAdmin(profile.email, profile.role)) redirect('/profile')

  // HELD + RELEASED + PAID_OUT payments with worker 계좌 정보
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, status, gross_amount, platform_fee, worker_payout,
      worker_fee, host_fee, withholding_tax, worker_tax_type,
      created_at, escrow_released_at, updated_at,
      job_id,
      jobs ( id, scheduled_at, spaces ( name ) ),
      worker:worker_id ( id, name, phone, bank_account )
    `)
    .in('status', ['HELD', 'RELEASED', 'PAID_OUT'])
    .order('created_at', { ascending: false })
    .limit(100)

  const list = (payments || []) as any[]

  const held     = list.filter((p) => p.status === 'HELD')
  const released = list.filter((p) => p.status === 'RELEASED')
  const paidOut  = list.filter((p) => p.status === 'PAID_OUT')

  const heldTotal     = held.reduce((s: number, p: any) => s + (p.worker_payout ?? 0), 0)
  const releasedTotal = released.reduce((s: number, p: any) => s + (p.worker_payout ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13.5px] font-black text-sky-600 uppercase tracking-widest mb-1">정산 관리</p>
        <h1 className="text-[22px] font-black text-slate-900">정산 현황</h1>
        <p className="text-[14.5px] text-slate-500 font-semibold mt-0.5">
          테스트 환경 — 실제 이체 없이 상태만 변경됩니다.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="정산 대기 (HELD)" value={formatKRW(heldTotal, { short: true })} count={held.length} tone="warning" />
        <Kpi label="이체 필요 (RELEASED)" value={formatKRW(releasedTotal, { short: true })} count={released.length} tone="info" />
        <Kpi label="입금 완료" value={`${paidOut.length}건`} count={paidOut.length} tone="success" />
      </div>

      {/* HELD — 즉시 정산 처리 가능 */}
      <Section
        title="정산 대기 (HELD)"
        icon={<Clock size={14} className="text-amber-500" />}
        count={held.length}
        empty="승인 완료 후 정산 대기 중인 건이 없어요"
      >
        {held.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            action={
              <div className="flex gap-2 justify-end">
                <SettlementActions
                  paymentId={p.id}
                  action="release"
                  label="즉시 정산"
                  tone="warning"
                />
                <SettlementActions
                  paymentId={p.id}
                  action="refund"
                  label="환불"
                  tone="danger"
                />
              </div>
            }
          />
        ))}
      </Section>

      {/* RELEASED — 이체 후 완료 처리 */}
      <Section
        title="이체 필요 (RELEASED)"
        icon={<Banknote size={14} className="text-sky-500" />}
        count={released.length}
        empty="이체 대기 중인 건이 없어요"
        highlight
      >
        {released.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            action={
              <SettlementActions
                paymentId={p.id}
                action="mark_paid"
                label="입금 완료"
                tone="success"
              />
            }
          />
        ))}
      </Section>

      {/* PAID_OUT — 히스토리 */}
      {paidOut.length > 0 && (
        <Section
          title="입금 완료"
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          count={paidOut.length}
          empty=""
        >
          {paidOut.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Kpi({ label, value, count, tone }: {
  label: string; value: string; count: number
  tone: 'warning' | 'info' | 'success'
}) {
  const bg =
    tone === 'warning' ? 'bg-amber-50 border-amber-200' :
    tone === 'info'    ? 'bg-sky-50 border-sky-200' :
                         'bg-emerald-50 border-emerald-200'
  const text =
    tone === 'warning' ? 'text-amber-700' :
    tone === 'info'    ? 'text-sky-700' :
                         'text-emerald-700'
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <p className={`text-[13px] font-black uppercase tracking-wide ${text}`}>{label}</p>
      <p className={`text-[20px] font-black mt-1 ${text}`}>{value}</p>
      <p className={`text-[13.5px] font-semibold mt-0.5 ${text} opacity-70`}>{count}건</p>
    </div>
  )
}

function Section({ title, icon, count, empty, highlight, children }: {
  title: string; icon: React.ReactNode; count: number
  empty: string; highlight?: boolean; children?: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <h2 className="text-[14.5px] font-black text-slate-600 uppercase tracking-wider">{title} · {count}건</h2>
        {highlight && count > 0 && (
          <span className="text-[13px] font-black px-2 py-0.5 rounded-full bg-sky-500 text-white">이체 필요</span>
        )}
      </div>

      {count === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-[15px] text-slate-400 font-semibold">{empty}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {children}
        </div>
      )}
    </section>
  )
}

function PaymentRow({ payment: p, action }: { payment: any; action?: React.ReactNode }) {
  const bank = p.worker?.bank_account as any
  const hasBankInfo = bank?.bank_name && bank?.account_number

  return (
    <div className="px-4 py-4 flex items-start gap-4">
      {/* 워커 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[14px] font-extrabold text-slate-900 truncate">
            {p.worker?.name ?? '(워커 없음)'}
          </p>
          <span className="text-[13px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {p.worker_tax_type === 'FREELANCER' ? '프리랜서' : '사업자'}
          </span>
        </div>

        {/* 계좌 */}
        {hasBankInfo ? (
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-slate-600">
            <Banknote size={12} className="text-slate-400 shrink-0" />
            <span>{bank.bank_name} {bank.account_number}</span>
            {bank.account_holder && (
              <span className="text-slate-400">({bank.account_holder})</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[14.5px] font-bold text-red-500">
            <AlertCircle size={12} />
            계좌 미등록
          </div>
        )}

        {/* 작업 정보 */}
        <p className="text-[13.5px] text-slate-400 font-semibold mt-1">
          {p.jobs?.spaces?.name ?? '공간 없음'} · {timeAgo(p.created_at)}
        </p>
      </div>

      {/* 금액 */}
      <div className="text-right shrink-0">
        <p className="text-[15px] font-black text-slate-900">
          +{formatKRW(p.worker_payout)}
        </p>
        <p className="text-[13px] font-semibold text-slate-400 mt-0.5">
          거래 {formatKRW(p.gross_amount, { short: true })} · 수수료 −{formatKRW((p.worker_fee ?? 0) + (p.host_fee ?? 0))}
          {p.withholding_tax > 0 && ` · 원천징수 −${formatKRW(p.withholding_tax)}`}
        </p>
        {action && <div className="mt-2 flex justify-end">{action}</div>}
      </div>
    </div>
  )
}
