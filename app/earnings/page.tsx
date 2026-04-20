import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EarningsClient from './EarningsClient'

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, status, worker_payout, platform_fee, created_at, escrow_released_at, jobs(id, scheduled_at, spaces(name))')
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = (payments || []) as any[]
  const totalEarned = list.filter((p) => p.status === 'RELEASED').reduce((s, p) => s + (p.worker_payout || 0), 0)
  const pendingAmount = list.filter((p) => p.status === 'HELD').reduce((s, p) => s + (p.worker_payout || 0), 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthEarned = list
    .filter((p) => p.status === 'RELEASED' && new Date(p.created_at) >= monthStart)
    .reduce((s, p) => s + (p.worker_payout || 0), 0)

  return (
    <EarningsClient
      profile={profile}
      payments={list}
      totalEarned={totalEarned}
      pendingAmount={pendingAmount}
      monthEarned={monthEarned}
    />
  )
}
