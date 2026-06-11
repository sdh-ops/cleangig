import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIcal, upcomingCheckouts, isSafeIcalUrl } from '@/lib/ical'

export const runtime = 'nodejs'

const FETCH_TIMEOUT_MS = 8000
const MAX_ICS_BYTES = 1024 * 1024 // 1MB — 예약 캘린더로는 충분

/**
 * GET /api/spaces/ical?space_id=...
 *
 * 공간에 등록된 iCal(예약 캘린더) URL을 읽어 다가오는 체크아웃 날짜를 반환.
 * 본인 소유 공간만 조회 가능. 응답: { ok, checkouts: [{date, summary, nights}] }
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const spaceId = new URL(req.url).searchParams.get('space_id')
    if (!spaceId) return NextResponse.json({ ok: false, error: 'missing_space_id' }, { status: 400 })

    const { data: space } = await supabase
      .from('spaces')
      .select('id, operator_id, ical_url')
      .eq('id', spaceId)
      .single()
    if (!space) return NextResponse.json({ ok: false, error: 'space_not_found' }, { status: 404 })
    if (space.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (!space.ical_url) return NextResponse.json({ ok: true, checkouts: [], no_ical: true })

    if (!isSafeIcalUrl(space.ical_url)) {
      return NextResponse.json({ ok: false, error: 'invalid_ical_url' }, { status: 400 })
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    let icsText: string
    try {
      const res = await fetch(space.ical_url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'sseuksak-calendar-sync/1.0' },
        redirect: 'follow',
      })
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: 'ical_fetch_failed', status: res.status }, { status: 502 })
      }
      const buf = await res.arrayBuffer()
      if (buf.byteLength > MAX_ICS_BYTES) {
        return NextResponse.json({ ok: false, error: 'ical_too_large' }, { status: 502 })
      }
      icsText = new TextDecoder('utf-8').decode(buf)
    } finally {
      clearTimeout(timer)
    }

    const checkouts = upcomingCheckouts(parseIcal(icsText), 30)
    return NextResponse.json({ ok: true, checkouts })
  } catch (e) {
    console.error('[spaces/ical]', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
