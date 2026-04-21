import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeMatchScore } from '@/lib/matching'

export const runtime = 'nodejs'

/**
 * 자동 매칭: OPEN job 생성 후 근처 클린 파트너에게 알림
 *
 * Body: { job_id }
 * 1. Job + Space 좌표 조회
 * 2. Active 워커 조회 (반경 내, 가용, 타임윈도우 충돌 없음)
 * 3. matching_score 계산 후 상위 N명
 * 4. 각각 notifications 테이블에 INSERT (NotificationOverlay가 실시간 수신)
 * 5. push_subscriptions 있으면 Web Push (internal call to /api/push/send)
 */
export async function POST(req: Request) {
  try {
    const { job_id } = await req.json()
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, scheduled_at, is_urgent, price, status, spaces(id, name, type, address, location)')
      .eq('id', job_id)
      .single()
    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (job.status !== 'OPEN') return NextResponse.json({ ok: true, matched: 0, skipped: 'not_open' })

    const coords = (job as any).spaces?.location?.coordinates as [number, number] | undefined
    const space_lat = coords?.[1] ?? 37.5665
    const space_lng = coords?.[0] ?? 126.978

    // 가용 워커 조회 (can_work + is_active)
    const { data: workers } = await supabase
      .from('users')
      .select('id, name, tier, avg_rating, total_jobs, sparkle_score, preferences')
      .eq('role', 'worker')
      .eq('is_active', true)
      .or('can_work.eq.true,role.eq.worker')
      .limit(200)

    // 해당 시간대 워커 일정 충돌 검사
    const schedTime = new Date((job as any).scheduled_at).getTime()
    const bufferMs = 3 * 60 * 60 * 1000 // 3h 블록
    const busyStart = new Date(schedTime - bufferMs).toISOString()
    const busyEnd = new Date(schedTime + bufferMs).toISOString()
    const { data: busyRows } = await supabase
      .from('jobs')
      .select('worker_id')
      .gte('scheduled_at', busyStart)
      .lte('scheduled_at', busyEnd)
      .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'])
    const busy = new Set((busyRows || []).map((r) => r.worker_id).filter(Boolean))

    // Favorite partners (우선 순위 +bonus)
    const { data: favs } = await supabase
      .from('favorite_partners')
      .select('worker_id')
      .eq('operator_id', job.operator_id)
    const favSet = new Set((favs || []).map((f) => f.worker_id))

    // Score & sort — worker GPS가 없으므로 공간 위치로 대체 (실운영에선 worker last-known location 사용)
    const scored = (workers || [])
      .filter((w) => !busy.has(w.id))
      .map((w) => {
        const prefs = (w.preferences || {}) as Record<string, unknown>
        const radiusKm = (prefs?.radius_km as number) ?? 5
        const score = computeMatchScore({
          worker: {
            id: w.id,
            tier: (w.tier as any) ?? 'STARTER',
            avg_rating: w.avg_rating ?? 0,
            total_jobs: w.total_jobs ?? 0,
            sparkle_score: w.sparkle_score ?? 0,
          },
          worker_lat: space_lat,
          worker_lng: space_lng,
          space_lat,
          space_lng,
          job: {
            price: (job as any).price ?? 0,
            is_urgent: !!(job as any).is_urgent,
            scheduled_at: (job as any).scheduled_at,
            is_recurring: false,
          },
          is_favorite: favSet.has(w.id),
        })
        return { worker_id: w.id, score: score.total, radiusKm }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)

    const spaceName = (job as any).spaces?.name ?? '공간'
    const title = (job as any).is_urgent ? '🚨 긴급 청소 요청' : '새 청소 요청'
    const message = `${spaceName} — 지금 지원하면 우선 매칭`
    const url = `/clean/job/${job_id}`

    // 알림 INSERT (NotificationOverlay가 realtime 수신)
    if (scored.length > 0) {
      await supabase.from('notifications').insert(
        scored.map((s) => ({ user_id: s.worker_id, title, message, url })),
      )
    }

    // Web Push (있다면)
    const originHdr = req.headers.get('origin') || req.headers.get('host')
    const origin = originHdr ? (originHdr.startsWith('http') ? originHdr : `https://${originHdr}`) : ''
    if (origin && scored.length > 0) {
      // fire-and-forget
      await Promise.all(
        scored.map((s) =>
          fetch(`${origin}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
            body: JSON.stringify({ user_id: s.worker_id, title, message, url }),
          }).catch(() => null),
        ),
      )
    }

    return NextResponse.json({ ok: true, matched: scored.length })
  } catch (e) {
    console.error('notify-workers error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
