import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

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
    } = body || {}

    if (!space_id || !first_scheduled_at || typeof price !== 'number') {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }
    const n = Math.min(Math.max(Number(occurrences) || 4, 1), 12)

    const stepDays = frequency === 'MONTHLY' ? 30 : frequency === 'BIWEEKLY' ? 14 : 7
    const seriesId = crypto.randomUUID()

    const rows: Record<string, unknown>[] = []
    const start = new Date(first_scheduled_at)
    for (let i = 0; i < n; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i * stepDays)
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

    // 첫 회차만 자동 매칭 트리거
    const firstId = inserted?.[0]?.id
    if (firstId) {
      const originHdr = req.headers.get('origin') || req.headers.get('host')
      const origin = originHdr ? (originHdr.startsWith('http') ? originHdr : `https://${originHdr}`) : ''
      if (origin) {
        fetch(`${origin}/api/jobs/notify-workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({ job_id: firstId }),
        }).catch(() => null)
      }
    }

    return NextResponse.json({ ok: true, series_id: seriesId, count: inserted?.length || 0, first_job_id: firstId })
  } catch (e) {
    console.error('recurring create error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
