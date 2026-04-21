import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * 분쟁 신고
 * Body: { job_id, category, description, evidence_urls?: string[] }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { job_id, category, description, evidence_urls } = body || {}
    if (!job_id || !category || !description) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, worker_id, status')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id && job.worker_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const { error } = await supabase.from('disputes').insert({
      job_id,
      reporter_id: user.id,
      status: 'OPEN',
      category,
      description,
      evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
    })
    if (error) throw error

    // Mark job as DISPUTED (runtime only; admin can resolve)
    await supabase.from('jobs').update({ status: 'DISPUTED' }).eq('id', job_id)

    // 상대방 + 관리자 알림
    const otherUserId = user.id === job.operator_id ? job.worker_id : job.operator_id
    if (otherUserId) {
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        title: '분쟁이 접수되었습니다',
        message: `${category} 관련 신고가 접수되어 관리자가 검토 중입니다.`,
        url: `/requests/${job_id}`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('dispute create error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
