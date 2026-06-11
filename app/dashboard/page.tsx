import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // profile을 데이터 쿼리와 함께 병렬 — 직렬 왕복 1회 절감
  const [profileRes, todayJobsRes, spacesRes, recentJobsRes, monthJobsRes, unreadRes, recurringRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
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
    supabase
      .from('jobs')
      .select('id, status, price, scheduled_at, estimated_duration, recurring_config, spaces(id, name, type)')
      .eq('operator_id', user.id)
      .eq('is_recurring', true)
      .not('status', 'in', '("CANCELED","PAID_OUT")')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(5),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/onboarding')
  if (profile.role === 'worker') redirect('/clean')

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
      recurringJobs={(recurringRes.data || []) as any}
      monthTotal={monthTotal}
      monthCount={monthCount}
      monthApproved={monthApproved}
      unreadCount={unreadRes.count || 0}
    />
  )
}
