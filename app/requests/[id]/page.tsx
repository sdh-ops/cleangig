import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/admin'
import RequestDetailClient from './RequestDetailClient'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: job } = await supabase
        .from('jobs')
        .select(`
            *,
            spaces(*),
            users:jobs_worker_id_fkey(id, name, avg_rating, tier, profile_image, phone)
        `)
        .eq('id', id)
        .single()

    if (!job) redirect('/dashboard')

    // 접근 제어: 공간파트너(operator), 배정된 클린파트너(worker), 플랫폼 관리자만 열람 허용
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const isAdmin = isPlatformAdmin(user.email, profile?.role)
    const isOwner = job.operator_id === user.id
    const isAssignedWorker = !!job.worker_id && job.worker_id === user.id
    if (!isOwner && !isAssignedWorker && !isAdmin) redirect('/dashboard')

    let isFavorite = false
    if (job.worker_id) {
        const { data: fav } = await supabase
            .from('favorite_partners')
            .select('id')
            .eq('operator_id', user.id)
            .eq('worker_id', job.worker_id)
            .maybeSingle()
        if (fav) isFavorite = true
    }

    return <RequestDetailClient job={job as any} userId={user.id} initialIsFavorite={isFavorite} />
}
