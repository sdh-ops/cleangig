import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

type Verdict = 'APPROVE_WORK' | 'REFUND' | 'DISMISS'

/**
 * 분쟁 해결 — 관리자 전용.
 * RLS가 owner 한정이라 service_role(admin) 클라이언트로 타인 작업/결제/분쟁을 갱신한다.
 * 호출 전 반드시 isPlatformAdmin 검증.
 *
 * Body: { dispute_id, verdict: 'APPROVE_WORK'|'REFUND'|'DISMISS', refund_amount?, note? }
 *  - APPROVE_WORK: 워커 작업 인정 → job APPROVED, 에스크로 RELEASED, 분쟁 RESOLVED
 *  - REFUND:       요청자 환불 → job CANCELED, 결제 REFUNDED, 분쟁 RESOLVED
 *  - DISMISS:      신고 기각 → 분쟁 CLOSED, job APPROVED(작업 유지)
 */
export async function POST(req: Request) {
  try {
    // 1) 관리자 인증 (일반 클라이언트 — 본인 세션)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    const { data: me } = await supabase.from('users').select('email, role').eq('id', user.id).single()
    if (!isPlatformAdmin(me?.email, me?.role)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const verdict = body?.verdict as Verdict
    const disputeId = body?.dispute_id as string
    const note = typeof body?.note === 'string' ? body.note.trim() : ''
    const refundAmount = Math.max(0, Math.round(Number(body?.refund_amount) || 0))
    if (!disputeId || !['APPROVE_WORK', 'REFUND', 'DISMISS'].includes(verdict)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    // 2) service_role로 처리
    const admin = createAdminClient()

    const { data: dispute } = await admin
      .from('disputes')
      .select('id, status, job_id, reporter_id, jobs(id, operator_id, worker_id, price)')
      .eq('id', disputeId)
      .single()
    if (!dispute) return NextResponse.json({ ok: false, error: 'dispute_not_found' }, { status: 404 })
    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      return NextResponse.json({ ok: false, error: 'already_resolved' }, { status: 409 })
    }
    const job = (dispute as any).jobs

    // 분쟁 상태/판정 갱신
    const disputeStatus = verdict === 'DISMISS' ? 'CLOSED' : 'RESOLVED'
    await admin
      .from('disputes')
      .update({
        status: disputeStatus,
        final_verdict: verdict,
        refund_amount: verdict === 'REFUND' ? refundAmount : 0,
        ai_reasoning: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)

    // 작업 동결 해제
    const newJobStatus = verdict === 'REFUND' ? 'CANCELED' : 'APPROVED'
    if (job?.id) {
      await admin
        .from('jobs')
        .update({ status: newJobStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id)

      // 결제 상태 갱신 (있을 경우)
      const payStatus = verdict === 'REFUND' ? 'REFUNDED' : 'RELEASED'
      await admin
        .from('payments')
        .update({
          status: payStatus,
          ...(verdict !== 'REFUND' ? { escrow_released_at: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job.id)
    }

    // 당사자 알림
    const verdictLabel =
      verdict === 'APPROVE_WORK' ? '작업이 정상 인정되어 정산이 진행됩니다.'
        : verdict === 'REFUND' ? `환불 처리되었습니다${refundAmount > 0 ? ` (₩${refundAmount.toLocaleString()})` : ''}.`
          : '신고가 기각되었습니다.'
    const recipients = [job?.operator_id, job?.worker_id].filter(Boolean) as string[]
    if (recipients.length > 0 && job?.id) {
      await admin.from('notifications').insert(
        recipients.map((uid) => ({
          user_id: uid,
          title: '분쟁이 처리되었습니다',
          message: verdictLabel,
          url: `/requests/${job.id}`,
        })),
      )
    }

    return NextResponse.json({ ok: true, dispute_status: disputeStatus, job_status: newJobStatus })
  } catch (e) {
    console.error('dispute resolve error', e)
    const msg = e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'server_misconfigured'
      : 'internal'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
