import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelRefundRate } from '@/lib/pricing'

export const runtime = 'nodejs'

const DEPOSIT_AMOUNT = 5000

/**
 * 공간파트너 청소 요청 취소 + 환불 정산
 *
 * Body: { job_id, reason? }
 *
 * 1. 권한 확인 (operator)
 * 2. 취소 가능 상태 확인 (OPEN/ASSIGNED)
 * 3. 취소 수수료 계산 (scheduled_at 기준)
 * 4. 24h 이내 취소 + 배정 클린파트너 있을 경우 보증금 5,000원 추가 차감
 * 5. jobs.status = CANCELED
 * 6. payments 레코드 처리
 * 7. 클린파트너에게 알림
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

    // 기존 payment 조회 (후속 Toss 연결 시 실제 환불)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status, gross_amount')
      .eq('job_id', job_id)
      .maybeSingle()

    if (existingPayment) {
      await supabase
        .from('payments')
        .update({
          status: refundAmount > 0 ? 'REFUNDED' : 'RELEASED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
    } else {
      await supabase.from('payments').insert({
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

    // 클린파트너에게 알림
    if (job.worker_id) {
      const spaceName = (job as any).spaces?.name ?? '작업'
      const depositMsg = depositCharged
        ? ` 24시간 이내 취소로 보증금 ${DEPOSIT_AMOUNT.toLocaleString()}원이 차감됩니다.`
        : ''
      await supabase.from('notifications').insert({
        user_id: job.worker_id,
        title: '배정된 작업이 취소되었어요',
        message: `${spaceName}이 취소됐습니다. ${policy.label}${depositMsg}`,
        url: `/clean/job/${job_id}`,
        type: depositCharged ? 'deposit_charged' : 'job_canceled',
        is_read: false,
      })
    }

    return NextResponse.json({
      ok: true,
      refund_amount: refundAmount,
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
