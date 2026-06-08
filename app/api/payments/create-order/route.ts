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
      price,
      price_breakdown,
      checklist,
      special_instructions,
      is_urgent,
      is_recurring,
      frequency,
      occurrences,
    } = body

    if (!space_id || !price || !scheduled_at) {
      return NextResponse.json({ ok: false, error: 'missing_required_fields' }, { status: 400 })
    }
    if (price < 1000) {
      return NextResponse.json({ ok: false, error: 'amount_too_small' }, { status: 400 })
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
        price,
        price_breakdown: price_breakdown ?? null,
        checklist: checklist ?? [],
        special_instructions: special_instructions ?? null,
        is_urgent: is_urgent ?? false,
        is_recurring: is_recurring ?? false,
        frequency: frequency ?? null,
        occurrences: occurrences ?? null,
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
