import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notify'

export const runtime = 'nodejs'

/**
 * POST /api/jobs/claim — 워커 작업 수락
 *
 * Body: { job_id }
 *
 * claim_job RPC(원자적 CAS — 동시 지원 시 한 명만 성공) 호출 후
 * 운영자 알림을 서버에서 발송한다 (인앱 + Web Push).
 * 기존엔 클라이언트가 알림을 보내서 수락 직후 이탈 시 운영자가 배정 사실을 모르는 문제가 있었음.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { job_id } = await req.json()
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    // 세션 컨텍스트로 RPC 호출 — claim_job 내부의 auth.uid()가 워커 본인
    const { data: claimed, error } = await supabase.rpc('claim_job', { p_job_id: job_id })
    if (error) {
      console.error('[claim] rpc error:', error.message)
      return NextResponse.json({ ok: false, error: 'claim_failed' }, { status: 500 })
    }
    if (!claimed) {
      return NextResponse.json({ ok: false, error: 'already_assigned' }, { status: 409 })
    }

    // 운영자 알림 — 서버에서 보장 발송 (클라 이탈과 무관)
    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, spaces(name)')
      .eq('id', job_id)
      .single()
    if (job?.operator_id) {
      try {
        await notifyUser(job.operator_id, {
          title: '클린파트너가 배정됐어요!',
          message: `${(job as any).spaces?.name ?? '작업'}에 클린파트너가 배정됐습니다. 예약 시간에 방문 예정이에요.`,
          url: `/requests/${job_id}`,
          type: 'job_assigned',
        })
      } catch (e) {
        console.error('[claim] 운영자 알림 실패 (배정은 완료):', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[claim]', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
