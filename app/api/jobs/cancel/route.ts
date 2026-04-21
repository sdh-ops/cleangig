import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelRefundRate } from '@/lib/pricing'

export const runtime = 'nodejs'

/**
 * 호스트 청소 요청 취소 + 환불 정산
 *
 * Body: { job_id }
 *
 * 1. 권한 확인 (operator)
 * 2. 취소 가능 상태 확인 (OPEN/ASSIGNED)
 * 3. 취소 수수료 계산 (scheduled_at 기준)
 * 4. jobs.status = CANCELED
 * 5. payments 레코드가 있으면 REFUNDED(+ 환불액), 없으면 REFUNDED 레코드 INSERT
 * 6. 워커에게 알림
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { job_id } = await req.json()
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
      // 결제 시스템 미도입 단계: 요약 레코드만 생성
      await supabase.from('payments').insert({
        job_id,
        operator_id: job.operator_id,
        worker_id: job.worker_id,
        gross_amount: job.price,
        platform_fee: 0,
        worker_payout: 0,
        status: 'REFUNDED',
      })
    }

    await supabase.from('jobs').update({ status: 'CANCELED', updated_at: new Date().toISOString() }).eq('id', job_id)

    // 워커에게 알림
    if (job.worker_id) {
      await supabase.from('notifications').insert({
        user_id: job.worker_id,
        title: '배정된 작업이 취소되었어요',
        message: `${(job as any).spaces?.name ?? '작업'}이 취소됐습니다. ${policy.label}`,
        url: `/clean/job/${job_id}`,
      })
    }

    return NextResponse.json({
      ok: true,
      refund_amount: refundAmount,
      cancel_fee: cancelFee,
      policy_label: policy.label,
    })
  } catch (e) {
    console.error('cancel error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
