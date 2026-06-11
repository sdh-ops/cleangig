import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // fetch + mark-read 병렬 — 둘 다 user.id에만 의존
  const [{ data }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, title, message, url, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false),
  ])

  return <NotificationsClient notifications={data || []} />
}
