import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') redirect('/dashboard')

    const today = new Date().toISOString().split('T')[0]

    const [
        { count: totalUsers },
        { count: totalOperators },
        { count: totalWorkers },
        { count: todayJobs },
        { count: openJobs },
        { count: disputedJobs },
        { data: recentEvents },
        { data: topWorkers },
        { data: churnRisks },
    ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'worker'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).gte('scheduled_at', `${today}T00:00:00`),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED'),
        supabase.from('agent_events').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('users').select('id, name, avg_rating, total_jobs, tier').eq('role', 'worker')
            .order('avg_rating', { ascending: false }).limit(5),
        supabase.from('churn_scores').select('*, users(name, role)').eq('risk_level', 'HIGH').limit(5).order('score', { ascending: false }),
    ])

    return (
        <AdminClient
            stats={{ totalUsers, totalOperators, totalWorkers, todayJobs, openJobs, disputedJobs }}
            recentEvents={(recentEvents as any[]) || []}
            topWorkers={(topWorkers as any[]) || []}
            churnRisks={(churnRisks as any[]) || []}
        />
    )
}
