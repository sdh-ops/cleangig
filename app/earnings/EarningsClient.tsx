'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Wallet, Clock, TrendingUp, Banknote, CheckCircle2, Receipt, Info, ChevronDown } from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import { formatKRW, timeAgo } from '@/lib/utils'
import type { PaymentStatus } from '@/lib/types'

type Payment = {
  id: string
  status: PaymentStatus
  worker_payout: number
  platform_fee?: number
  host_fee?: number
  worker_fee?: number
  withholding_tax?: number
  worker_tax_type?: string
  created_at: string
  escrow_released_at?: string
  jobs?: { id: string; scheduled_at: string; spaces?: { name: string } }
}

type Props = {
  profile: { role: string }
  payments: Payment[]
  totalEarned: number
  pendingAmount: number
  monthEarned: number
  ytdWht?: number
}

export default function EarningsClient({ profile, payments, totalEarned, pendingAmount, monthEarned, ytdWht = 0 }: Props) {
  return (
    <div className="sseuksak-shell">
      <Header showLogo showBell />
      <div className="flex-1 pb-28">
        {/* Hero */}
        <div className="px-5 pt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-5">
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.10) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <p className="text-[13px] text-white/80 font-bold uppercase tracking-widest mb-1">총 수익 (정산 완료)</p>
              <p className="num-display text-white" style={{ fontSize: 44, lineHeight: 1.1 }}>{formatKRW(totalEarned)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="이번 달" value={formatKRW(monthEarned, { short: true })} icon={<TrendingUp size={14} />} />
                <Stat label="정산 대기" value={formatKRW(pendingAmount, { short: true })} icon={<Clock size={14} />} />
              </div>
            </div>
          </motion.div>

          {/* YTD withholding tax + tax setting entry */}
          <div className="mt-3 card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-info-soft text-info flex items-center justify-center shrink-0">
              <Receipt size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14.5px] font-bold text-text-soft">올해 낸 세금(3.3%)</p>
              <p className="t-money text-[16px] text-ink mt-0.5">{formatKRW(ytdWht)}</p>
            </div>
            <Link href="/profile/tax" className="text-[14.5px] font-black text-brand-dark flex items-center gap-0.5">
              세금 유형 <Info size={12} />
            </Link>
          </div>
        </div>

        <div className="px-5 pt-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="h-section text-ink">정산 내역</h2>
            <span className="text-[13.5px] font-bold text-text-faint">최근 50건</span>
          </div>

          {payments.length === 0 ? (
            <div className="card p-2">
              <EmptyState
                icon={<Wallet size={24} />}
                title="아직 정산 내역이 없어요"
                description="작업을 완료하면 여기에서 정산을 확인할 수 있어요."
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {payments.map((p) => (
                <PaymentRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <BottomNav role={profile.role === 'operator' ? 'operator' : 'worker'} />
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/12 p-3">
      <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-white/75">
        {icon}
        {label}
      </div>
      <div className="t-money text-[16px] text-white mt-1">{value}</div>
    </div>
  )
}

function PaymentRow({ p }: { p: Payment }) {
  const [open, setOpen] = useState(false)
  const fee = p.worker_fee || p.platform_fee || 0
  const tax = p.withholding_tax ?? 0
  // 워커 관점 작업 대금 = 실수령 + 떼인 것들 (역산). host_fee는 공간파트너 부담이라 제외.
  const grossForWorker = p.worker_payout + fee + tax
  const hasBreakdown = fee > 0 || tax > 0
  const settled = p.status === 'RELEASED' || p.status === 'PAID_OUT'

  return (
    <li className="card overflow-hidden">
      <button
        type="button"
        onClick={() => hasBreakdown && setOpen((o) => !o)}
        className={`w-full px-4 py-3.5 flex items-center gap-3 text-left ${hasBreakdown ? 'active:bg-surface-muted/40 transition' : ''}`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            settled
              ? 'bg-success-soft text-success'
              : p.status === 'HELD'
              ? 'bg-info-soft text-info'
              : p.status === 'FAILED'
              ? 'bg-danger-soft text-danger'
              : 'bg-surface-muted text-text-muted'
          }`}
        >
          {settled ? <CheckCircle2 size={16} /> : p.status === 'HELD' ? <Clock size={16} /> : <Banknote size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[14.5px] font-extrabold text-ink truncate">{p.jobs?.spaces?.name || '작업'}</h4>
            <span className="t-money text-[15px] text-ink shrink-0">+{formatKRW(p.worker_payout)}</span>
          </div>
          <p className="text-[13px] font-bold text-text-soft mt-0.5 flex items-center gap-1">
            {statusLabel(p.status)} · {timeAgo(p.created_at)}
            {hasBreakdown && (
              <ChevronDown size={13} className={`text-text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </p>
        </div>
      </button>
      {open && hasBreakdown && (
        <div className="px-4 pb-3.5 pl-[52px]">
          <div className="rounded-xl bg-surface-muted/50 px-3.5 py-3 flex flex-col gap-2">
            <BreakdownRow label="작업 대금" value={`${formatKRW(grossForWorker)}`} />
            {fee > 0 && <BreakdownRow label="플랫폼 수수료" value={`−${formatKRW(fee)}`} muted />}
            {tax > 0 && <BreakdownRow label="소득세 (3.3% 원천징수)" value={`−${formatKRW(tax)}`} muted />}
            <div className="h-px bg-line-soft my-0.5" />
            <BreakdownRow label="실수령액" value={`+${formatKRW(p.worker_payout)}`} bold />
            {tax > 0 && (
              <p className="text-[12px] text-text-faint font-bold leading-snug mt-0.5">
                💡 원천징수된 소득세는 5월 종합소득세 신고 때 환급받을 수 있어요.
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function BreakdownRow({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[13.5px] ${bold ? 'font-extrabold text-ink' : 'font-bold text-text-soft'}`}>{label}</span>
      <span className={`t-money text-[14px] ${bold ? 'text-ink font-black' : muted ? 'text-text-faint' : 'text-text-soft'}`}>
        {value}
      </span>
    </div>
  )
}

function statusLabel(s: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PENDING: '결제 대기',
    HELD: '안전 보관 중',
    RELEASED: '정산 완료',
    PAID_OUT: '입금 완료',
    REFUNDED: '환불',
    FAILED: '결제 실패',
  }
  return map[s]
}
