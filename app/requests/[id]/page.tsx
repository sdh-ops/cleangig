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
        .select('*, spaces(*), users!jobs_worker_id_fkey(id, name, avg_rating, tier, profile_image)')
        .eq('id', id)
        .single()

    if (!job) redirect('/dashboard')

    const { data: photos } = await supabase
        .from('photos').select('*').eq('job_id', id).order('created_at')

    const { data: payment } = await supabase
        .from('payments').select('*').eq('job_id', id).maybeSingle()

    const { data: applications } = await supabase
        .from('job_applications')
        .select('*, users!job_applications_worker_id_fkey(name, avg_rating, tier, profile_image)')
        .eq('job_id', id)
        .order('created_at')

    return <RequestDetailClient job={job as any} photos={photos || []} payment={payment} applications={applications || []} userId={user.id} />
}
