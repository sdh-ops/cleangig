import { createClient } from '@/lib/supabase/server'
import AdminDisputesClient from './AdminDisputesClient'

export default async function AdminDisputesPage() {
    const supabase = await createClient()

    // 분쟁(DISPUTED) 중인 일감 목록 가져오기
    const { data: jobs } = await supabase
        .from('jobs')
        .select(`
            id, status, price, scheduled_at, created_at,
            spaces (name, address),
            operator:users!jobs_operator_id_fkey (id, name, email, phone),
            worker:users!jobs_worker_id_fkey (id, name, email, phone)
        `)
        .eq('status', 'DISPUTED')
        .order('created_at', { ascending: false })

    // 관련 dispute 신고 내역 매핑
    const disputeJobIds = jobs?.map(j => j.id) || []

    let disputesMap: any = {}
    if (disputeJobIds.length > 0) {
        const { data: disputesData } = await supabase
            .from('disputes')
            .select('*')
            .in('job_id', disputeJobIds)

        disputesData?.forEach(d => {
            if (!disputesMap[d.job_id]) disputesMap[d.job_id] = []
            disputesMap[d.job_id].push(d)
        })
    }

    const initialJobs = jobs?.map(job => ({ ...job, disputes: disputesMap[job.id] || [] })) || []

    return <AdminDisputesClient initialJobs={initialJobs} />
}
