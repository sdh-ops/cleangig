import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CleanMainClient from './CleanMainClient'

export default async function CleanMainPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'worker') redirect('/dashboard')

    // 내 진행 중 작업 (있으면)
    const { data: activeJob } = await supabase
        .from('jobs')
        .select('*, spaces(*)')
        .eq('worker_id', user.id)
        .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'])
        .order('scheduled_at')
        .limit(1)
        .maybeSingle()

    // 이번 주 정산
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const { data: weekPayments } = await supabase
        .from('payments')
        .select('worker_payout, status')
        .eq('worker_id', user.id)
        .gte('created_at', weekStart.toISOString())

    const weekEarnings = weekPayments?.reduce((s, p) => s + (p.worker_payout || 0), 0) || 0
    const pendingCount = weekPayments?.filter(p => p.status === 'HELD').length || 0

    return <CleanMainClient profile={profile} activeJob={activeJob} weekEarnings={weekEarnings} pendingCount={pendingCount} />
}
