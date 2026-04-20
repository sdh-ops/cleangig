import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CleanMainClient from './CleanMainClient'

export default async function CleanMainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')
  if (profile.role === 'operator') redirect('/dashboard')

  // active jobs for this worker
  const { data: activeJob } = await supabase
    .from('jobs')
    .select('id, status, scheduled_at, price, estimated_duration, is_urgent, special_instructions, spaces(id, name, type, address, address_detail)')
    .eq('worker_id', user.id)
    .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'])
    .order('scheduled_at')
    .limit(1)
    .maybeSingle()

  // open jobs near me
  const { data: openJobs } = await supabase
    .from('jobs')
    .select('id, status, scheduled_at, price, is_urgent, spaces(id, name, type, address)')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })
    .limit(12)

  // week earnings
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const { data: weekPayments } = await supabase
    .from('payments')
    .select('worker_payout, status')
    .eq('worker_id', user.id)
    .gte('created_at', weekStart.toISOString())

  const weekEarnings = weekPayments?.reduce((s, p) => s + (p.worker_payout || 0), 0) || 0
  const pendingCount = weekPayments?.filter((p) => p.status === 'HELD').length || 0

  // unread notifications
  const { count: unread } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <CleanMainClient
      profile={profile}
      activeJob={activeJob as any}
      openJobs={(openJobs || []) as any}
      weekEarnings={weekEarnings}
      pendingCount={pendingCount}
      unreadCount={unread || 0}
    />
  )
}
