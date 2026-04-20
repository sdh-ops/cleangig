import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')
  if (profile.role === 'worker') redirect('/clean')

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [todayJobsRes, spacesRes, recentJobsRes, monthJobsRes, unreadRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, price, scheduled_at, estimated_duration, is_urgent, spaces(name, type, address)')
      .eq('operator_id', user.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at'),
    supabase
      .from('spaces')
      .select('id, name, type, base_price, is_active, photos')
      .eq('operator_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, status, price, scheduled_at, is_urgent, spaces(name, type), users:worker_id(name, avg_rating)')
      .eq('operator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('jobs')
      .select('id, status, price')
      .eq('operator_id', user.id)
      .gte('scheduled_at', monthStart.toISOString()),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  const monthJobs = (monthJobsRes.data as { status: string; price: number }[] | null) || []
  const monthTotal = monthJobs.reduce((s, j) => s + (j.price || 0), 0)
  const monthCount = monthJobs.length
  const monthApproved = monthJobs.filter((j) => j.status === 'APPROVED' || j.status === 'PAID_OUT').length

  return (
    <DashboardClient
      profile={profile}
      todayJobs={(todayJobsRes.data || []) as any}
      spaces={(spacesRes.data || []) as any}
      recentJobs={(recentJobsRes.data || []) as any}
      monthTotal={monthTotal}
      monthCount={monthCount}
      monthApproved={monthApproved}
      unreadCount={unreadRes.count || 0}
    />
  )
}
