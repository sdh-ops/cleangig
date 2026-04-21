'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Wallet, Clock, TrendingUp, Banknote, CheckCircle2, Receipt, Info } from 'lucide-react'
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
      <Header title="수익 관리" />
      <div className="flex-1 pb-28">
        {/* Hero */}
        <div className="px-5 pt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-ink text-white p-5 overflow-hidden relative">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand/25 rounded-full blur-3xl" />
            <div className="relative z-10">
              <p className="text-[11px] text-white/70 font-bold">총 수익 (정산 완료)</p>
              <p className="t-money text-[32px] text-white leading-tight mt-1">{formatKRW(totalEarned)}</p>
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
              <p className="text-[12px] font-bold text-text-soft">올해 원천징수 누계</p>
              <p className="t-money text-[16px] text-ink mt-0.5">{formatKRW(ytdWht)}</p>
            </div>
            <Link href="/profile/tax" className="text-[12px] font-black text-brand-dark flex items-center gap-0.5">
              세금 유형 <Info size={12} />
            </Link>
          </div>
        </div>

        <div className="px-5 pt-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="h-section text-ink">정산 내역</h2>
            <span className="text-[11px] font-bold text-text-faint">최근 50건</span>
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
                <li key={p.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        p.status === 'RELEASED'
                          ? 'bg-success-soft text-success'
                          : p.status === 'HELD'
                          ? 'bg-info-soft text-info'
                          : p.status === 'FAILED'
                          ? 'bg-danger-soft text-danger'
                          : 'bg-surface-muted text-text-muted'
                      }`}
                    >
                      {p.status === 'RELEASED' ? <CheckCircle2 size={18} /> : p.status === 'HELD' ? <Clock size={18} /> : <Banknote size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-extrabold text-ink truncate">
                        {p.jobs?.spaces?.name || '작업'}
                      </h4>
                      <p className="text-[11.5px] text-text-soft font-bold mt-0.5">
                        {statusLabel(p.status)} · {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="t-money text-[15px] text-ink">+{formatKRW(p.worker_payout)}</div>
                      {(p.withholding_tax ?? 0) > 0 ? (
                        <p className="text-[10.5px] font-bold text-text-faint mt-0.5">
                          수수료 −{formatKRW((p.worker_fee || 0) + (p.host_fee || 0) || (p.platform_fee || 0))} · 원천징수 −{formatKRW(p.withholding_tax || 0)}
                        </p>
                      ) : (
                        <p className="text-[10.5px] font-bold text-text-faint mt-0.5">
                          수수료 −{formatKRW((p.worker_fee || 0) + (p.host_fee || 0) || (p.platform_fee || 0))}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
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
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/75">
        {icon}
        {label}
      </div>
      <div className="t-money text-[16px] text-white mt-1">{value}</div>
    </div>
  )
}

function statusLabel(s: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PENDING: '결제 대기',
    HELD: '에스크로 보관',
    RELEASED: '정산 완료',
    REFUNDED: '환불',
    FAILED: '결제 실패',
  }
  return map[s]
}
