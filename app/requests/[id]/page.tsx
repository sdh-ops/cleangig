import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
