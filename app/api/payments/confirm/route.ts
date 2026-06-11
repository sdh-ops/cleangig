import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyWorkersForJob } from '@/lib/notify'
import { calculateSettlement, premiumFromBreakdown } from '@/lib/pricing'

export const runtime = 'nodejs'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'

/**
 * POST /api/payments/confirm
 *
 * Toss 결제 검증 → job 생성 → payment 레코드(HELD) 생성
 *
 * Body: { paymentKey, orderId, amount }
 *
 * 1. payment_order 조회 + 검증 (멱등성 포함)
 * 2. Toss API 결제 승인 호출
 * 3. jobs INSERT (status=OPEN)
 * 4. payments INSERT (status=HELD, pg_payment_key 저장)
 * 5. payment_order status → COMPLETED
 * 6. 워커 알림 발송
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { paymentKey, orderId, amount } = await req.json()
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. 주문 조회
    const { data: order, error: orderErr } = await admin
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 })
    }
    if (order.operator_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    // 멱등성: 이미 완료된 주문
    if (order.status === 'COMPLETED') {
      return NextResponse.json({ ok: true, jobId: order.job_id, already_confirmed: true })
    }
    if (order.status === 'FAILED') {
      return NextResponse.json({ ok: false, error: 'order_already_failed' }, { status: 400 })
    }

    // 금액 검증 (변조 방지)
    if (order.amount !== amount) {
      await admin.from('payment_orders').update({ status: 'FAILED' }).eq('id', orderId)
      return NextResponse.json({ ok: false, error: 'amount_mismatch' }, { status: 400 })
    }

    // 만료 검증
    if (new Date(order.expires_at) < new Date()) {
      await admin.from('payment_orders').update({ status: 'EXPIRED' }).eq('id', orderId)
      return NextResponse.json({ ok: false, error: 'order_expired' }, { status: 400 })
    }

    // 동시 confirm 방지 (CAS): PENDING → PROCESSING 전이에 성공한 요청만 진행.
    // 같은 orderId로 동시에 들어온 두 요청 중 하나만 Toss 승인을 호출한다.
    const { data: claimed } = await admin
      .from('payment_orders')
      .update({ status: 'PROCESSING' })
      .eq('id', orderId)
      .eq('status', order.status) // 읽은 시점 상태 그대로일 때만
      .select('id')
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ ok: false, error: 'confirm_in_progress' }, { status: 409 })
    }

    // 2. Toss 결제 승인 API 호출
    const encKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const tossData = await tossRes.json()

    if (!tossRes.ok) {
      await admin.from('payment_orders').update({ status: 'FAILED' }).eq('id', orderId)
      console.error('[confirm] Toss error', tossData)
      return NextResponse.json({
        ok: false,
        error: tossData.code ?? 'toss_verify_failed',
        message: tossData.message ?? '결제 검증에 실패했습니다.',
      }, { status: 400 })
    }

    // 3. job 생성
    const jd = order.job_data as any
    const { data: job, error: jobErr } = await admin.from('jobs').insert({
      space_id: jd.space_id,
      operator_id: jd.operator_id,
      status: 'OPEN',
      scheduled_at: jd.scheduled_at,
      estimated_duration: jd.estimated_duration ?? 90,
      time_window_start: jd.time_window_start ?? null,
      time_window_end: jd.time_window_end ?? null,
      price: jd.price,
      price_breakdown: jd.price_breakdown ?? null,
      checklist: jd.checklist ?? [],
      special_instructions: jd.special_instructions ?? null,
      is_urgent: jd.is_urgent ?? false,
      is_recurring: jd.is_recurring ?? false,
      supply_check_items: Array.isArray(jd.supply_check_items) ? jd.supply_check_items : [],
      auto_approved: false,
    }).select('id').single()

    if (jobErr || !job) {
      console.error('[confirm] job insert error', jobErr)
      // 결제는 승인됐는데 job 생성 실패 → 즉시 Toss 자동 환불 (돈만 빠지는 사각지대 제거)
      let refunded = false
      try {
        const cancelRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Basic ${encKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancelReason: '작업 생성 실패 — 자동 환불', cancelAmount: amount }),
        })
        refunded = cancelRes.ok
        if (!cancelRes.ok) {
          console.error('[confirm] 자동 환불 실패 — 수동 처리 필요. orderId:', orderId, 'paymentKey:', paymentKey)
        }
      } catch (e) {
        console.error('[confirm] 자동 환불 호출 예외 — 수동 처리 필요. orderId:', orderId, e)
      }
      await admin.from('payment_orders')
        .update({ status: 'FAILED', pg_payment_key: paymentKey })
        .eq('id', orderId)
      return NextResponse.json(
        {
          ok: false,
          error: 'job_creation_failed',
          refunded,
          message: refunded
            ? '작업 생성에 실패하여 결제가 자동 환불됐습니다. 다시 시도해주세요.'
            : '작업 생성에 실패했습니다. 결제 환불은 고객센터에서 처리됩니다.',
        },
        { status: 500 },
      )
    }

    // 4. payment 레코드 생성 (HELD = 에스크로 보관)
    // 워커 미정 시점 추정치 — 프리랜서·STARTER 기준. 최종 정산액은 approve에서 등급·세금유형·추가청구 반영해 재계산.
    const s = calculateSettlement(jd.price, { taxType: 'FREELANCER', premium: premiumFromBreakdown(jd.price_breakdown) })

    await admin.from('payments').insert({
      job_id: job.id,
      operator_id: jd.operator_id,
      gross_amount: s.gross_amount,
      platform_fee: s.platform_revenue,
      host_fee: s.host_fee,
      host_fee_rate: s.host_fee_rate,
      worker_fee: s.worker_fee,
      worker_fee_rate: s.worker_fee_rate,
      withholding_tax: s.withholding_tax,
      withholding_tax_rate: s.withholding_tax_rate,
      worker_payout: s.worker_payout,
      worker_tax_type: 'FREELANCER',
      status: 'HELD',
      pg_provider: 'toss',
      pg_order_id: orderId,
      pg_payment_key: paymentKey,
      paid_at: new Date().toISOString(),
    })

    // 5. payment_order 완료 처리
    await admin.from('payment_orders')
      .update({ status: 'COMPLETED', pg_payment_key: paymentKey, job_id: job.id })
      .eq('id', orderId)

    // 6. 워커 매칭 알림 — 서버에서 직접 호출 (HTTP 홉 제거: 기존 fetch는 쿠키 미전달로 401 유실)
    try {
      await notifyWorkersForJob(job.id)
    } catch (e) {
      console.error('[confirm] notify-workers 실패 (결제는 정상 완료):', e)
    }

    return NextResponse.json({ ok: true, jobId: job.id })
  } catch (e) {
    console.error('[confirm] unexpected error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
