import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notify'

export const runtime = 'nodejs'

/**
 * POST /api/jobs/reschedule — 공간파트너 청소 시간 변경
 *
 * Body: { job_id, scheduled_at, time_window_end?, estimated_duration? }
 *
 * 손님이 이용 시간을 연장하는 등으로 청소 시각을 조정해야 할 때 사용.
 * OPEN/ASSIGNED 상태에서만 가능(이미 출발한 뒤엔 불가 — 그땐 취소·보상 정책).
 * 배정된 워커가 있으면 변경 알림(인앱+웹푸시) 발송.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { job_id, scheduled_at, time_window_end, estimated_duration } = await req.json()
    if (!job_id || !scheduled_at) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    }

    const startMs = new Date(scheduled_at).getTime()
    if (!Number.isFinite(startMs) || startMs < Date.now() + 30 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: 'invalid_scheduled_at' }, { status: 400 })
    }
    const endMs = time_window_end ? new Date(time_window_end).getTime() : null
    const dur = Number.isFinite(estimated_duration) ? Math.min(Math.max(estimated_duration, 30), 720) : null
    if (endMs !== null) {
      if (!Number.isFinite(endMs) || endMs <= startMs) {
        return NextResponse.json({ ok: false, error: 'invalid_window' }, { status: 400 })
      }
      if (dur !== null && endMs - startMs < dur * 60000) {
        return NextResponse.json({ ok: false, error: 'window_shorter_than_duration' }, { status: 400 })
      }
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, worker_id, status, spaces(name)')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (!['OPEN', 'ASSIGNED'].includes(job.status)) {
      return NextResponse.json({ ok: false, error: 'not_reschedulable', current_status: job.status }, { status: 400 })
    }

    const patch: Record<string, unknown> = {
      scheduled_at,
      updated_at: new Date().toISOString(),
    }
    if (endMs !== null) patch.time_window_start = scheduled_at
    if (endMs !== null) patch.time_window_end = time_window_end
    if (dur !== null) patch.estimated_duration = dur

    const { error } = await supabase.from('jobs').update(patch).eq('id', job_id).in('status', ['OPEN', 'ASSIGNED'])
    if (error) throw error

    // 배정 워커에게 변경 알림
    if (job.worker_id) {
      const when = new Date(scheduled_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      try {
        await notifyUser(job.worker_id, {
          title: '청소 시간이 변경됐어요',
          message: `${(job as any).spaces?.name ?? '작업'} 청소 시간이 ${when}으로 변경됐습니다. 일정을 확인해주세요.`,
          url: `/clean/job/${job_id}`,
          type: 'job_assigned',
        })
      } catch (e) {
        console.error('[reschedule] 워커 알림 실패 (변경은 완료):', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reschedule]', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
