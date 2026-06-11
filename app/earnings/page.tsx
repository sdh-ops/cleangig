import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EarningsClient from './EarningsClient'

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // profile + payments 병렬 — 둘 다 user.id에만 의존, 직렬 왕복 1회 절감
  const [profileRes, paymentsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('payments')
      .select('id, status, worker_payout, platform_fee, worker_fee, host_fee, withholding_tax, worker_tax_type, created_at, escrow_released_at, jobs(id, scheduled_at, spaces(name))')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/login')

  const list = (paymentsRes.data || []) as any[]
  // RELEASED = 정산 처리됨(이체 예정), PAID_OUT = 실제 입금 완료. 둘 다 수령 완료로 카운트.
  const isSettled = (status: string) => status === 'RELEASED' || status === 'PAID_OUT'
  const totalEarned = list.filter((p) => isSettled(p.status)).reduce((s, p) => s + (p.worker_payout || 0), 0)
  const pendingAmount = list.filter((p) => p.status === 'HELD').reduce((s, p) => s + (p.worker_payout || 0), 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthEarned = list
    .filter((p) => isSettled(p.status) && new Date(p.created_at) >= monthStart)
    .reduce((s, p) => s + (p.worker_payout || 0), 0)
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const ytdWht = list
    .filter((p) => isSettled(p.status) && new Date(p.created_at) >= yearStart)
    .reduce((s, p) => s + (p.withholding_tax || 0), 0)

  return (
    <EarningsClient
      profile={profile}
      payments={list}
      totalEarned={totalEarned}
      pendingAmount={pendingAmount}
      monthEarned={monthEarned}
      ytdWht={ytdWht}
    />
  )
}
