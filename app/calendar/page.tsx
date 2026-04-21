import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'

export default async function HostCalendarPage({ searchParams }: { searchParams?: Promise<{ month?: string }> }) {
  const sp = (await searchParams) || {}
  const now = new Date()
  const targetMonth = sp.month ? new Date(sp.month + '-01') : now

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59)

  const col = profile.role === 'worker' ? 'worker_id' : 'operator_id'

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, price, scheduled_at, is_urgent, is_recurring, spaces(name, type)')
    .eq(col, user.id)
    .gte('scheduled_at', monthStart.toISOString())
    .lte('scheduled_at', monthEnd.toISOString())
    .order('scheduled_at')

  return (
    <CalendarClient
      role={profile.role === 'worker' ? 'worker' : 'operator'}
      jobs={(jobs || []) as any}
      year={targetMonth.getFullYear()}
      month={targetMonth.getMonth()}
    />
  )
}
