import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notify'

export const runtime = 'nodejs'

/**
 * POST /api/jobs/no-entry — 워커 "입장 불가(헛걸음)" 신고
 *
 * Body: { job_id, note? }
 *
 * 손님 미퇴실 등으로 청소를 시작 못 한 경우 워커가 신고.
 * 보상(공간파트너 부담 → 워커 지급):
 *   - 현장 도착(ARRIVED) 입장불가: 작업료 50% 또는 10,000원 중 큰 값
 *   - 이동 중(EN_ROUTE) 통보: 5,000원
 * 결제 처리: 공간파트너에게 (결제액 − 보상) Toss 환불, 워커에게 보상액 정산.
 */
const EN_ROUTE_COMP = 5000
const ARRIVED_MIN_COMP = 10000

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { job_id, note } = await req.json()
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, worker_id, status, price, spaces(name)')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.worker_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (!['EN_ROUTE', 'ARRIVED'].includes(job.status)) {
      return NextResponse.json({ ok: false, error: 'not_reportable', current_status: job.status }, { status: 400 })
    }

    const price = job.price || 0
    const comp = job.status === 'ARRIVED'
      ? Math.max(Math.round(price * 0.5), ARRIVED_MIN_COMP)
      : EN_ROUTE_COMP
    const refundToOperator = Math.max(0, price - comp)

    const admin = createAdminClient()

    const { data: payment } = await admin
      .from('payments')
      .select('id, status, gross_amount, pg_payment_key')
      .eq('job_id', job_id)
      .maybeSingle()

    // 공간파트너 부분 환불 (결제액 − 보상). HELD 상태 + pg_payment_key 있을 때만 실제 환불
    if (payment && payment.status === 'HELD' && refundToOperator > 0 && payment.pg_payment_key && process.env.TOSS_SECRET_KEY) {
      const encKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')
      const tossRes = await fetch(
        `https://api.tosspayments.com/v1/payments/${payment.pg_payment_key}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${encKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancelReason: '입장 불가(헛걸음) — 보상 제외 부분 환불', cancelAmount: refundToOperator }),
        },
      )
      if (!tossRes.ok) {
        const e = await tossRes.json().catch(() => ({}))
        console.error('[no-entry] Toss 부분환불 실패:', e)
        return NextResponse.json({ ok: false, error: 'refund_failed', message: '환불 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 })
      }
    }

    // payment를 보상액 기준으로 재설정 — 워커가 보상액 수령 (플랫폼 수수료 0), 다음 정산에 포함
    if (payment) {
      await admin
        .from('payments')
        .update({
          worker_id: job.worker_id,
          gross_amount: comp,
          host_fee: 0, worker_fee: 0, platform_fee: 0,
          withholding_tax: 0, withholding_tax_rate: 0,
          worker_payout: comp,
          status: 'RELEASED',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
    }

    const now = new Date().toISOString()
    await admin
      .from('jobs')
      .update({
        status: 'CANCELED',
        canceled_by: job.worker_id,
        canceled_at: now,
        cancel_reason: `입장 불가(헛걸음) 신고 — 보상 ${comp.toLocaleString()}원${note ? ` · ${String(note).slice(0, 200)}` : ''}`,
        updated_at: now,
      })
      .eq('id', job_id)

    const spaceName = (job as any).spaces?.name ?? '작업'
    // 공간파트너 알림
    await notifyUser(job.operator_id, {
      title: '클린파트너가 입장하지 못했어요',
      message: `${spaceName} 청소를 시작하지 못해 취소됐습니다. 헛걸음 보상 ${comp.toLocaleString()}원을 제외한 금액이 환불됩니다.`,
      url: `/requests/${job_id}`,
      type: 'job_canceled',
    }, admin)
    // 워커 알림
    await notifyUser(job.worker_id, {
      title: '헛걸음 보상이 처리됐어요',
      message: `${spaceName} 입장 불가로 ${comp.toLocaleString()}원 보상이 정산에 포함됩니다.`,
      url: '/earnings',
      type: 'general',
    }, admin)

    return NextResponse.json({ ok: true, compensation: comp, refunded_to_operator: refundToOperator })
  } catch (e) {
    console.error('[no-entry]', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
