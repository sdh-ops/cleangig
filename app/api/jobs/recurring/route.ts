import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyWorkersForJob } from '@/lib/notify'

export const runtime = 'nodejs'

const MIN_PRICE = 15000
const MAX_PRICE = 1_000_000

/**
 * 고정 청소 (Recurring) 생성
 *
 * Body: {
 *   space_id,
 *   first_scheduled_at,  // ISO - 첫 회차
 *   estimated_duration,
 *   price,
 *   price_breakdown,
 *   checklist,
 *   special_instructions,
 *   preferred_worker_id?,
 *   frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
 *   occurrences,         // 생성할 반복 횟수 (기본 4, 최대 12)
 * }
 *
 * - 각 회차마다 jobs row 1개 INSERT (status='OPEN', is_recurring=true)
 * - recurring_config에 시리즈 정보 저장
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      space_id,
      first_scheduled_at,
      estimated_duration = 90,
      price,
      price_breakdown,
      checklist,
      special_instructions,
      preferred_worker_id,
      frequency = 'WEEKLY',
      occurrences = 4,
      supply_check_items,
    } = body || {}

    if (!space_id || !first_scheduled_at || typeof price !== 'number') {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    // 가격 서버 검증 — 클라이언트 계산값 신뢰 금지
    if (!Number.isInteger(price) || price < MIN_PRICE || price > MAX_PRICE) {
      return NextResponse.json({ ok: false, error: 'invalid_price' }, { status: 400 })
    }

    // 공간 소유권 검증
    const { data: space } = await supabase
      .from('spaces')
      .select('id, operator_id')
      .eq('id', space_id)
      .single()
    if (!space || space.operator_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden_space' }, { status: 403 })
    }

    const n = Math.min(Math.max(Number(occurrences) || 4, 1), 12)
    const seriesId = crypto.randomUUID()

    const rows: Record<string, unknown>[] = []
    const start = new Date(first_scheduled_at)
    for (let i = 0; i < n; i++) {
      const d = new Date(start)
      // MONTHLY는 달력 기준(말일 보정 포함), 나머지는 일 단위
      if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + i)
      else d.setDate(d.getDate() + i * (frequency === 'BIWEEKLY' ? 14 : 7))
      rows.push({
        space_id,
        operator_id: user.id,
        status: 'OPEN',
        scheduled_at: d.toISOString(),
        estimated_duration,
        price,
        price_breakdown: price_breakdown ?? null,
        checklist: checklist ?? [],
        special_instructions: special_instructions ?? null,
        is_urgent: false,
        is_recurring: true,
        supply_check_items: Array.isArray(supply_check_items) ? supply_check_items : [],
        preferred_worker_id: preferred_worker_id ?? null,
        recurring_config: {
          series_id: seriesId,
          sequence: i + 1,
          total: n,
          frequency,
        },
        auto_approved: false,
      })
    }

    const { data: inserted, error } = await supabase.from('jobs').insert(rows).select('id')
    if (error) throw error

    // 첫 회차만 자동 매칭 트리거 — 서버 직접 호출 (origin 헤더 기반 fetch 제거)
    const firstId = inserted?.[0]?.id
    if (firstId) {
      try {
        await notifyWorkersForJob(firstId)
      } catch (e) {
        console.error('[recurring] notify-workers 실패:', e)
      }
    }

    return NextResponse.json({ ok: true, series_id: seriesId, count: inserted?.length || 0, first_job_id: firstId })
  } catch (e) {
    console.error('recurring create error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
