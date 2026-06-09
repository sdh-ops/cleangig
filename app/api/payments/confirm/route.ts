import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      price: jd.price,
      price_breakdown: jd.price_breakdown ?? null,
      checklist: jd.checklist ?? [],
      special_instructions: jd.special_instructions ?? null,
      is_urgent: jd.is_urgent ?? false,
      is_recurring: jd.is_recurring ?? false,
      auto_approved: false,
    }).select('id').single()

    if (jobErr || !job) {
      console.error('[confirm] job insert error', jobErr)
      // 결제는 됐는데 job 생성 실패 → 심각. 수동 처리 필요. payment_key는 저장해둠
      await admin.from('payment_orders')
        .update({ status: 'FAILED', pg_payment_key: paymentKey })
        .eq('id', orderId)
      return NextResponse.json({ ok: false, error: 'job_creation_failed' }, { status: 500 })
    }

    // 4. payment 레코드 생성 (HELD = 에스크로 보관)
    const pb = jd.price_breakdown ?? {}
    const hostFee = pb.host_fee ?? Math.round(jd.price * 0.05)
    const workerFee = pb.worker_fee ?? Math.round(jd.price * 0.15)
    const platformFee = pb.platform_revenue ?? hostFee + workerFee
    const workerSubtotal = jd.price - workerFee
    const withholdingTax = pb.estimated_withholding ?? Math.round(workerSubtotal * 0.033)
    const workerPayout = pb.estimated_worker_payout ?? workerSubtotal - withholdingTax
    // Derive actual fee rates from breakdown amounts (avoids stale hardcoded values)
    const hostFeeRate = jd.price > 0 ? Math.round((hostFee / jd.price) * 1000) / 1000 : 0.05
    const workerFeeRate = jd.price > 0 ? Math.round((workerFee / jd.price) * 1000) / 1000 : 0.15

    await admin.from('payments').insert({
      job_id: job.id,
      operator_id: jd.operator_id,
      gross_amount: jd.price,
      platform_fee: platformFee,
      host_fee: hostFee,
      host_fee_rate: hostFeeRate,
      worker_fee: workerFee,
      worker_fee_rate: workerFeeRate,
      withholding_tax: withholdingTax,
      withholding_tax_rate: 0.033,
      worker_payout: workerPayout,
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

    // 6. 워커 매칭 알림 (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cleangig.vercel.app'
    fetch(`${appUrl}/api/jobs/notify-workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((e) => console.warn('[confirm] notify-workers failed', e))

    return NextResponse.json({ ok: true, jobId: job.id })
  } catch (e) {
    console.error('[confirm] unexpected error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
