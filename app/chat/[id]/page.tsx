import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './ChatClient'

export default async function ChatPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 작업 정보 가져오기 (권한 확인용)
    const { data: job } = await supabase
        .from('jobs')
        .select('*, spaces(name)')
        .eq('id', id)
        .single()

    if (!job) redirect('/')

    // 공간파트너이거나 배정된 클린파트너만 입장 가능
    if (job.operator_id !== user.id && job.worker_id !== user.id) {
        redirect('/')
    }

    const receiverId = user.id === job.operator_id ? job.worker_id : job.operator_id

    return (
        <ChatClient
            jobId={id}
            userId={user.id}
            receiverId={receiverId || ''}
            spaceName={job.spaces?.name || '청소 채팅'}
        />
    )
}
