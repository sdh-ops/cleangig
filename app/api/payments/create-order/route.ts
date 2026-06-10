import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/payments/create-order
 *
 * 결제 전 임시 주문 생성 (payment_orders 테이블)
 * Toss 위젯이 사용할 orderId + amount 반환
 *
 * Body: {
 *   space_id, scheduled_at, estimated_duration?, price,
 *   price_breakdown, checklist?, special_instructions?,
 *   is_urgent?, is_recurring?, frequency?, occurrences?
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      space_id,
      scheduled_at,
      estimated_duration,
      time_window_start,
      time_window_end,
      price,
      price_breakdown,
      checklist,
      special_instructions,
      is_urgent,
      is_recurring,
      frequency,
      occurrences,
      supply_check_items,
    } = body

    if (!space_id || !price || !scheduled_at) {
      return NextResponse.json({ ok: false, error: 'missing_required_fields' }, { status: 400 })
    }

    // 가격 범위 검증 (변조 방지) — 정기청소 라우트와 동일 기준
    const MIN_PRICE = 15000
    const MAX_PRICE = 1_000_000
    if (!Number.isInteger(price) || price < MIN_PRICE || price > MAX_PRICE) {
      return NextResponse.json({ ok: false, error: 'invalid_price' }, { status: 400 })
    }

    // 과거 시각 예약 차단 (최소 30분 이후) — 예약 즉시 환불불가 구간 진입 방지
    const when = new Date(scheduled_at).getTime()
    if (!Number.isFinite(when) || when < Date.now() + 30 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: 'invalid_scheduled_at' }, { status: 400 })
    }

    // 공간 이름 + 소유권 확인
    const { data: space } = await supabase
      .from('spaces')
      .select('name, operator_id, is_active')
      .eq('id', space_id)
      .single()

    if (!space) return NextResponse.json({ ok: false, error: 'space_not_found' }, { status: 404 })
    if (space.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (!space.is_active) return NextResponse.json({ ok: false, error: 'space_inactive' }, { status: 400 })

    // orderId: Toss 정책 - 영문+숫자+특수문자(-, _), 64자 이내
    const orderId = `sseuksak-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const orderName = `쓱싹 청소 - ${space.name}`

    const admin = createAdminClient()
    const { error } = await admin.from('payment_orders').insert({
      id: orderId,
      operator_id: user.id,
      job_data: {
        space_id,
        operator_id: user.id,
        scheduled_at,
        estimated_duration: estimated_duration ?? 90,
        time_window_start: time_window_start ?? null,
        time_window_end: time_window_end ?? null,
        price,
        price_breakdown: price_breakdown ?? null,
        checklist: checklist ?? [],
        special_instructions: special_instructions ?? null,
        is_urgent: is_urgent ?? false,
        is_recurring: is_recurring ?? false,
        frequency: frequency ?? null,
        occurrences: occurrences ?? null,
        supply_check_items: Array.isArray(supply_check_items) ? supply_check_items : [],
      },
      amount: price,
      order_name: orderName,
      status: 'PENDING',
    })

    if (error) throw error

    return NextResponse.json({ ok: true, orderId, amount: price, orderName })
  } catch (e) {
    console.error('[create-order]', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
