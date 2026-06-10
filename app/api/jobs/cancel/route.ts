import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelRefundRate } from '@/lib/pricing'
import { notifyUser } from '@/lib/notify'

export const runtime = 'nodejs'

const DEPOSIT_AMOUNT = 5000

/**
 * 공간파트너 청소 요청 취소 + 환불 정산
 *
 * Body: { job_id, reason? }
 *
 * 1. 권한 확인 (operator)
 * 2. 취소 가능 상태 확인 (OPEN/ASSIGNED/EN_ROUTE/ARRIVED)
 * 3. 취소 수수료 계산 (scheduled_at 기준)
 * 4. 24h 이내 취소 + 배정 클린파트너 있을 경우 보증금 5,000원 추가 차감
 * 5. Toss 환불 API 호출 (refundAmount > 0, pg_payment_key 있을 때)
 * 6. payments 상태 처리:
 *    - refundAmount > 0 → REFUNDED (전액/부분 환불)
 *    - refundAmount = 0 → HELD 유지 (환불 불가 구간 — 워커 보상분, 관리자가 settle-payment로 정산)
 * 7. jobs.status = CANCELED + 클린파트너 알림
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { job_id, reason } = body
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, worker_id, status, scheduled_at, price, spaces(name)')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (!['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(job.status)) {
      return NextResponse.json({ ok: false, error: 'not_cancellable' }, { status: 400 })
    }

    const policy = cancelRefundRate(job.scheduled_at)
    const refundAmount = Math.round((job.price || 0) * policy.rate)
    const cancelFee = (job.price || 0) - refundAmount

    // 24h 이내 취소 + 배정 클린파트너 있으면 보증금 5,000원 추가 차감
    const scheduled = new Date(job.scheduled_at)
    const hoursLeft = (scheduled.getTime() - Date.now()) / (1000 * 60 * 60)
    const depositCharged = hoursLeft < 24 && !!job.worker_id

    const admin = createAdminClient()

    // 기존 payment 조회 (Toss 환불에 pg_payment_key 필요)
    const { data: existingPayment } = await admin
      .from('payments')
      .select('id, status, gross_amount, pg_payment_key')
      .eq('job_id', job_id)
      .maybeSingle()

    let refundExecuted = false

    if (existingPayment) {
      // 동시 취소/정산 방지: HELD 상태일 때만 처리
      if (existingPayment.status !== 'HELD') {
        return NextResponse.json(
          { ok: false, error: 'payment_not_cancellable', payment_status: existingPayment.status },
          { status: 409 },
        )
      }

      // Toss 실제 환불 (부분 환불 지원: cancelAmount = refundAmount)
      if (refundAmount > 0 && existingPayment.pg_payment_key && process.env.TOSS_SECRET_KEY) {
        const encKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')
        const tossRes = await fetch(
          `https://api.tosspayments.com/v1/payments/${existingPayment.pg_payment_key}/cancel`,
          {
            method: 'POST',
            headers: { Authorization: `Basic ${encKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cancelReason: reason || `공간파트너 취소 (${policy.label})`,
              cancelAmount: refundAmount,
            }),
          },
        )
        if (tossRes.ok) {
          refundExecuted = true
        } else {
          const tossErr = await tossRes.json().catch(() => ({}))
          console.error('[cancel] Toss 환불 실패:', tossErr)
          // 환불 실패 시 취소 진행하지 않음 — 결제는 살아있는데 작업만 취소되는 불일치 방지
          return NextResponse.json(
            { ok: false, error: 'refund_failed', message: '환불 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 502 },
          )
        }
      }

      // payments 상태 갱신:
      //   환불 발생 → REFUNDED
      //   환불 0원(환불 불가 구간) → HELD 유지 — 워커 몫 정산을 관리자가 settle-payment로 처리
      if (refundAmount > 0) {
        await admin
          .from('payments')
          .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
          .eq('id', existingPayment.id)
          .eq('status', 'HELD')
      }
    } else if (refundAmount === 0 || depositCharged) {
      // 결제 레코드 없는 경우(테스트 등) 취소 수수료 기록용 레코드 생성
      await admin.from('payments').insert({
        job_id,
        operator_id: job.operator_id,
        worker_id: job.worker_id,
        gross_amount: job.price,
        platform_fee: depositCharged ? DEPOSIT_AMOUNT : 0,
        worker_payout: 0,
        status: 'REFUNDED',
      })
    }

    const now = new Date().toISOString()
    await supabase
      .from('jobs')
      .update({
        status: 'CANCELED',
        canceled_by: user.id,
        canceled_at: now,
        cancel_reason: reason ?? null,
        cancel_deposit_charged: depositCharged,
        updated_at: now,
      })
      .eq('id', job_id)

    // 클린파트너에게 알림 (인앱 + Web Push)
    if (job.worker_id) {
      const spaceName = (job as any).spaces?.name ?? '작업'
      const depositMsg = depositCharged
        ? ` 24시간 이내 취소로 보증금 ${DEPOSIT_AMOUNT.toLocaleString()}원이 차감됩니다.`
        : ''
      await notifyUser(job.worker_id, {
        title: '배정된 작업이 취소되었어요',
        message: `${spaceName}이 취소됐습니다. ${policy.label}${depositMsg}`,
        url: `/clean/job/${job_id}`,
        type: depositCharged ? 'deposit_charged' : 'job_canceled',
      }, admin)
    }

    return NextResponse.json({
      ok: true,
      refund_amount: refundAmount,
      refund_executed: refundExecuted,
      cancel_fee: cancelFee,
      policy_label: policy.label,
      deposit_charged: depositCharged,
      deposit_amount: depositCharged ? DEPOSIT_AMOUNT : 0,
    })
  } catch (e) {
    console.error('cancel error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
