import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import SpaceDetailClient from './SpaceDetailClient'

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: space } = await supabase.from('spaces').select('*').eq('id', id).single()
  if (!space) notFound()

  const isOwner = space.operator_id === user.id

  const [statsRes, jobIdRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, price, scheduled_at')
      .eq('space_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(20),
    supabase
      .from('jobs')
      .select('id')
      .eq('space_id', id)
      .limit(500),
  ])

  const list = (statsRes.data || []) as any[]
  const totalJobs = list.length
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const monthCount = list.filter((j) => j.scheduled_at >= monthStart).length
  const lifetimeSpent = list.reduce((s, j) => s + (j.price || 0), 0)

  const jobIds = (jobIdRes.data || []).map((j) => j.id)
  let spaceReviews: any[] = []
  if (jobIds.length > 0) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, rating, tags, comment, created_at, reviewer:reviewer_id(name)')
      .in('job_id', jobIds)
      .eq('is_public', true)
      .eq('review_type', 'worker_to_operator')
      .order('created_at', { ascending: false })
      .limit(10)
    spaceReviews = (reviews || []) as any[]
  }

  return (
    <SpaceDetailClient
      space={space as any}
      isOwner={isOwner}
      totalJobs={totalJobs}
      monthCount={monthCount}
      lifetimeSpent={lifetimeSpent}
      spaceReviews={spaceReviews}
    />
  )
}
