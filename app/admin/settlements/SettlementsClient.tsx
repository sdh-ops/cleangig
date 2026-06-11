'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Banknote, AlertCircle, CheckCircle2, Loader2, Zap,
  Clock, CheckSquare, Square, ChevronsDown,
} from 'lucide-react'
import { formatKRW, timeAgo } from '@/lib/utils'
import CopyField from './CopyField'
import SettlementActions from './SettlementActions'

type Payment = {
  id: string
  status: string
  gross_amount: number
  worker_payout: number
  worker_fee: number
  host_fee: number
  withholding_tax: number
  worker_tax_type: string
  created_at: string
  worker_id?: string | null
  worker?: { id: string; name: string; phone?: string; bank_account?: any } | null
  jobs?: { id: string; spaces?: { name: string } | null } | null
}

type Props = {
  held: Payment[]
  released: Payment[]
  paidOut: Payment[]
  heldTotal: number
  releasedTotal: number
}

export default function SettlementsClient({ held, released, paidOut, heldTotal, releasedTotal }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [done, setDone] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleGroup = (ids: string[]) =>
    setSelected(prev => {
      const allIn = ids.every(id => prev.has(id))
      const next = new Set(prev)
      if (allIn) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })

  const runBatch = async (action: 'release' | 'mark_paid' | 'refund', ids: string[]) => {
    if (!ids.length || batchLoading) return
    if (action === 'refund' && !window.confirm(`선택한 ${ids.length}건을 환불 처리할까요?`)) return
    if (action === 'mark_paid' && !window.confirm(`선택한 ${ids.length}건을 입금 완료 처리할까요?\n실제 이체 완료 후 클릭해 주세요.`)) return

    setBatchLoading(true)
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch('/api/admin/settle-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: id, action }),
        }).then(r => r.json())
      )
    )

    const succeeded: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.ok) succeeded.push(ids[i])
    })

    setDone(prev => new Set([...prev, ...succeeded]))
    setSelected(prev => {
      const next = new Set(prev)
      succeeded.forEach(id => next.delete(id))
      return next
    })
    setBatchLoading(false)
    router.refresh()
  }

  const heldIds    = held.map(p => p.id).filter(id => !done.has(id))
  const releasedIds = released.map(p => p.id).filter(id => !done.has(id))
  const selectedHeld     = heldIds.filter(id => selected.has(id))
  const selectedReleased = releasedIds.filter(id => selected.has(id))
  const anySelected = selected.size > 0

  return (
    <div className="space-y-6 pb-24">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="정산 대기 (HELD)"      value={formatKRW(heldTotal, { short: true })}    count={held.length}    tone="warning" />
        <Kpi label="이체 필요 (RELEASED)"  value={formatKRW(releasedTotal, { short: true })} count={released.length} tone="info" />
        <Kpi label="입금 완료"              value={`${paidOut.length}건`}                     count={paidOut.length}  tone="success" />
      </div>

      {/* HELD */}
      <section>
        <SectionHeader
          icon={<Clock size={14} className="text-sky-500" />}
          title="정산 대기 (HELD)"
          count={heldIds.length}
          allSelected={heldIds.length > 0 && heldIds.every(id => selected.has(id))}
          onToggleAll={() => toggleGroup(heldIds)}
        />
        {heldIds.length === 0 ? (
          <EmptyCard text="정산 대기 중인 건이 없어요" />
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-100">
            {held.map(p => done.has(p.id) ? null : (
              <PaymentRow
                key={p.id}
                payment={p}
                checked={selected.has(p.id)}
                onCheck={() => toggle(p.id)}
                action={
                  <div className="flex gap-2 justify-end">
                    <SettlementActions paymentId={p.id} action="release"  label="즉시 정산" tone="warning" />
                    <SettlementActions paymentId={p.id} action="refund"   label="환불"      tone="danger" />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* RELEASED */}
      <section>
        <SectionHeader
          icon={<Banknote size={14} className="text-sky-500" />}
          title="이체 필요 (RELEASED)"
          count={releasedIds.length}
          badge={releasedIds.length > 0 ? '이체 필요' : undefined}
          allSelected={releasedIds.length > 0 && releasedIds.every(id => selected.has(id))}
          onToggleAll={() => toggleGroup(releasedIds)}
        />
        {releasedIds.length === 0 ? (
          <EmptyCard text="이체 대기 중인 건이 없어요" />
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-100">
            {released.map(p => done.has(p.id) ? null : (
              <ReleasedRow
                key={p.id}
                payment={p}
                checked={selected.has(p.id)}
                onCheck={() => toggle(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* PAID_OUT */}
      {paidOut.length > 0 && (
        <section>
          <SectionHeader
            icon={<CheckCircle2 size={14} className="text-emerald-500" />}
            title="입금 완료"
            count={paidOut.length}
          />
          <div className="card overflow-hidden divide-y divide-slate-100">
            {paidOut.map(p => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </div>
        </section>
      )}

      {/* 일괄처리 하단 바 */}
      {anySelected && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-xl">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-[14.5px] font-black text-slate-700 mr-1">
              {selected.size}건 선택
            </span>

            {selectedHeld.length > 0 && (
              <>
                <button
                  onClick={() => runBatch('release', selectedHeld)}
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14.5px] font-black bg-sky-500 hover:bg-sky-600 text-white active:scale-95 transition disabled:opacity-60"
                >
                  {batchLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  즉시 정산 {selectedHeld.length}건
                </button>
                <button
                  onClick={() => runBatch('refund', selectedHeld)}
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14.5px] font-black bg-red-500 hover:bg-red-600 text-white active:scale-95 transition disabled:opacity-60"
                >
                  환불 {selectedHeld.length}건
                </button>
              </>
            )}

            {selectedReleased.length > 0 && (
              <button
                onClick={() => runBatch('mark_paid', selectedReleased)}
                disabled={batchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14.5px] font-black bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition disabled:opacity-60"
              >
                {batchLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                입금 완료 {selectedReleased.length}건
              </button>
            )}

            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[14px] font-bold text-slate-400 hover:text-slate-600"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({
  icon, title, count, badge, allSelected, onToggleAll,
}: {
  icon: React.ReactNode
  title: string
  count: number
  badge?: string
  allSelected?: boolean
  onToggleAll?: () => void
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {onToggleAll && count > 0 ? (
        <button
          onClick={onToggleAll}
          className="flex items-center justify-center w-5 h-5 text-slate-400 hover:text-sky-500 transition"
          aria-label="전체 선택"
        >
          {allSelected
            ? <CheckSquare size={16} className="text-sky-500" />
            : <Square size={16} />
          }
        </button>
      ) : (
        <span className="w-5 flex items-center justify-center">{icon}</span>
      )}
      <h2 className="text-[14.5px] font-black text-slate-600 uppercase tracking-wider">
        {title} · {count}건
      </h2>
      {badge && count > 0 && (
        <span className="text-[13px] font-black px-2 py-0.5 rounded-full bg-sky-500 text-white">{badge}</span>
      )}
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-[15px] text-slate-400 font-semibold">{text}</p>
    </div>
  )
}

function PaymentRow({
  payment: p,
  checked,
  onCheck,
  action,
}: {
  payment: Payment
  checked?: boolean
  onCheck?: () => void
  action?: React.ReactNode
}) {
  const bank = p.worker?.bank_account as any
  const hasBankInfo = bank?.bank_name && bank?.account_number

  return (
    <div className="px-4 py-4 flex items-start gap-3">
      {onCheck && (
        <button
          onClick={onCheck}
          className="mt-0.5 shrink-0 text-slate-400 hover:text-sky-500 transition"
          aria-label="선택"
        >
          {checked
            ? <CheckSquare size={16} className="text-sky-500" />
            : <Square size={16} />
          }
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[14px] font-extrabold text-slate-900 truncate">
            {p.worker?.name ?? '(워커 없음)'}
          </p>
          <span className="text-[13px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {p.worker_tax_type === 'FREELANCER' ? '프리랜서' : '사업자'}
          </span>
        </div>

        {hasBankInfo ? (
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-slate-600">
            <Banknote size={12} className="text-slate-400 shrink-0" />
            <span>{bank.bank_name}</span>
            <CopyField
              value={String(bank.account_number).replace(/[^0-9]/g, '')}
              label={bank.account_number}
              className="font-bold text-slate-700 hover:text-sky-600"
            />
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

        <p className="text-[13.5px] text-slate-400 font-semibold mt-1">
          {p.jobs?.spaces?.name ?? '공간 없음'} · {timeAgo(p.created_at)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <CopyField
          value={String(p.worker_payout ?? 0)}
          label={`+${formatKRW(p.worker_payout)}`}
          className="text-[15px] font-black text-slate-900 hover:text-sky-600"
        />
        <p className="text-[13px] font-semibold text-slate-400 mt-0.5">
          거래 {formatKRW(p.gross_amount, { short: true })} · 수수료 −{formatKRW((p.worker_fee ?? 0) + (p.host_fee ?? 0))}
          {p.withholding_tax > 0 && ` · 원천징수 −${formatKRW(p.withholding_tax)}`}
        </p>
        {action && <div className="mt-2 flex justify-end">{action}</div>}
      </div>
    </div>
  )
}

function ReleasedRow({
  payment: p,
  checked,
  onCheck,
}: {
  payment: Payment
  checked?: boolean
  onCheck?: () => void
}) {
  const bank = p.worker?.bank_account as any
  const hasBank = bank?.bank_name && bank?.account_number
  const confirmText = `${p.worker?.name ?? '워커'}님 계좌로 ${formatKRW(p.worker_payout)}을(를) 실제로 이체하셨나요?\n\n${hasBank ? `${bank.bank_name} ${bank.account_number}${bank.account_holder ? ` (${bank.account_holder})` : ''}` : ''}\n\n확인을 누르면 워커에게 "입금 완료" 알림이 발송됩니다.`

  return (
    <PaymentRow
      payment={p}
      checked={checked}
      onCheck={onCheck}
      action={
        <SettlementActions
          paymentId={p.id}
          action="mark_paid"
          label="입금 완료"
          tone="success"
          disabled={!hasBank}
          disabledReason={!hasBank ? '계좌 미등록' : undefined}
          confirmText={confirmText}
        />
      }
    />
  )
}

function Kpi({ label, value, count, tone }: {
  label: string; value: string; count: number
  tone: 'warning' | 'info' | 'success'
}) {
  const bg   = tone === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'
  const text = tone === 'success' ? 'text-emerald-700' : 'text-sky-700'
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <p className={`text-[13px] font-black uppercase tracking-wide ${text}`}>{label}</p>
      <p className={`text-[20px] font-black mt-1 ${text}`}>{value}</p>
      <p className={`text-[13.5px] font-semibold mt-0.5 ${text} opacity-70`}>{count}건</p>
    </div>
  )
}
