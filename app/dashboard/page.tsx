import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'operator') redirect('/clean')

    const today = new Date().toISOString().split('T')[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: todayJobs } = await supabase
        .from('jobs')
        .select('id, status, price, scheduled_at, spaces(name, type)')
        .eq('operator_id', user.id)
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`)
        .order('scheduled_at') as { data: any[] | null }

    const { data: spaces } = await supabase
        .from('spaces').select('id, name, type, base_price, is_active')
        .eq('operator_id', user.id).eq('is_active', true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentJobs } = await supabase
        .from('jobs')
        .select('id, status, price, scheduled_at, spaces(name)')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5) as { data: any[] | null }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data: monthJobs } = await supabase
        .from('jobs').select('status, price')
        .eq('operator_id', user.id).gte('scheduled_at', monthStart)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthTotal = (monthJobs as any[])?.reduce((s: number, j: { price: number }) => s + (j.price || 0), 0) || 0
    const monthCount = monthJobs?.length || 0

    return (
        <DashboardClient
            profile={profile}
            todayJobs={todayJobs || []}
            spaces={(spaces || []) as any[]}
            recentJobs={recentJobs || []}
            monthTotal={monthTotal}
            monthCount={monthCount}
        />
    )
}
