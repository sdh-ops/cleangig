import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './ChatClient'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('jobs')
    .select('id, operator_id, worker_id, spaces(name), users:worker_id(id, name, profile_image), operator:operator_id(id, name, profile_image)')
    .eq('id', id)
    .single()

  if (!job) redirect('/')
  if (job.operator_id !== user.id && job.worker_id !== user.id) redirect('/')

  const partnerId = user.id === job.operator_id ? job.worker_id : job.operator_id
  const partner = user.id === job.operator_id ? (job as any).users : (job as any).operator

  return (
    <ChatClient
      jobId={id}
      userId={user.id}
      partnerId={partnerId || ''}
      partnerName={partner?.name || '상대방'}
      partnerImage={partner?.profile_image}
      spaceName={(job as any).spaces?.name || '청소 채팅'}
    />
  )
}
