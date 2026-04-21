import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import { isPlatformAdmin } from '@/lib/admin'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { count: totalJobs } = await supabase
    .from('jobs').select('id', { count: 'exact', head: true })
    .eq(profile.role === 'worker' ? 'worker_id' : 'operator_id', user.id)
    .eq('status', 'PAID_OUT')

  const isAdmin = isPlatformAdmin(profile.email, profile.role)

  return <ProfileClient profile={profile} totalCompletedJobs={totalJobs || 0} isAdmin={isAdmin} />
}
