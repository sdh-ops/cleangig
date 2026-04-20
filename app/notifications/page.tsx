import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, url, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80)

  // mark all unread as read (bulk)
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)

  return <NotificationsClient notifications={data || []} />
}
