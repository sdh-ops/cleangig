import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyWorkersForJob } from '@/lib/notify'

export const runtime = 'nodejs'

/**
 * 자동 매칭: OPEN job에 대해 근처 클린파트너에게 알림 (수동 재발송용)
 *
 * Body: { job_id }
 *
 * 실제 매칭·발송 로직은 lib/notify.ts notifyWorkersForJob.
 * 결제 confirm·정기청소 생성은 라우트를 거치지 않고 lib을 직접 호출한다.
 * 이 라우트는 운영자가 본인 작업에 대해 수동으로 재알림할 때만 사용.
 */
export async function POST(req: Request) {
  try {
    const { job_id } = await req.json()
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    // 본인 소유 작업만 (인가)
    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })

    const result = await notifyWorkersForJob(job_id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('notify-workers error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
