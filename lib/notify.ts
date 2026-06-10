import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from './supabase/admin'
import { computeMatchScore } from './matching'

/**
 * 서버 전용 알림 허브.
 *
 * 인앱 알림(notifications INSERT → Realtime 오버레이)과 Web Push를 한 곳에서 처리한다.
 * 라우트 간 HTTP 홉(fetch + cookie 전달) 없이 직접 호출 — 서버리스 환경에서
 * 세션 부재로 알림이 유실되던 문제를 제거한다.
 */

export type NotifyPayload = {
  title: string
  message: string
  url?: string | null
  type?: string
}

type AdminClient = ReturnType<typeof createAdminClient>

/** 단일 사용자에게 인앱 알림 + Web Push 발송 */
export async function notifyUser(userId: string, payload: NotifyPayload, client?: AdminClient): Promise<void> {
  const admin = client ?? createAdminClient()

  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    title: payload.title,
    message: payload.message,
    url: payload.url ?? null,
    type: payload.type ?? 'general',
    is_read: false,
  })
  if (error) console.error('[notify] in-app insert 실패:', error.message)

  await sendWebPush(admin, [userId], payload)
}

/** 여러 사용자에게 일괄 발송 */
export async function notifyUsers(userIds: string[], payload: NotifyPayload, client?: AdminClient): Promise<void> {
  if (userIds.length === 0) return
  const admin = client ?? createAdminClient()

  const { error } = await admin.from('notifications').insert(
    userIds.map((id) => ({
      user_id: id,
      title: payload.title,
      message: payload.message,
      url: payload.url ?? null,
      type: payload.type ?? 'general',
      is_read: false,
    })),
  )
  if (error) console.error('[notify] in-app bulk insert 실패:', error.message)

  await sendWebPush(admin, userIds, payload)
}

/** Web Push 발송 (VAPID 미설정 시 조용히 skip — 인앱 알림은 이미 저장됨) */
async function sendWebPush(admin: AdminClient, userIds: string[], payload: NotifyPayload): Promise<void> {
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPriv = process.env.VAPID_PRIVATE_KEY
  if (!vapidPub || !vapidPriv) return

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@sseuksak.com',
      vapidPub,
      vapidPriv,
    )

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds)

    await Promise.all(
      (subs || []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh || '', auth: s.auth || '' } },
            JSON.stringify({ title: payload.title, message: payload.message, url: payload.url ?? null }),
          )
        } catch (e: any) {
          // 만료된 구독 정리
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          }
        }
      }),
    )
  } catch (e) {
    console.error('[notify] webpush 실패:', e)
  }
}

/**
 * OPEN job에 대해 근처 클린파트너 매칭 + 알림 발송.
 *
 * 1. Job + Space 좌표 조회
 * 2. Active 클린파트너 조회 (가용 + 타임윈도우 충돌 없음)
 * 3. 워커 최근 위치(worker_locations last-known)로 거리 점수 계산
 * 4. 상위 N명에게 인앱 + Web Push
 */
export async function notifyWorkersForJob(jobId: string): Promise<{ matched: number; skipped?: string }> {
  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id, operator_id, scheduled_at, is_urgent, price, status, spaces(id, name, type, address, location)')
    .eq('id', jobId)
    .single()
  if (!job) return { matched: 0, skipped: 'job_not_found' }
  if (job.status !== 'OPEN') return { matched: 0, skipped: 'not_open' }

  const coords = (job as any).spaces?.location?.coordinates as [number, number] | undefined
  const space_lat = coords?.[1] ?? 37.5665
  const space_lng = coords?.[0] ?? 126.978

  // 가용 클린파트너 (can_work + is_active)
  const { data: workers } = await admin
    .from('users')
    .select('id, name, tier, avg_rating, total_jobs, sparkle_score, preferences')
    .eq('role', 'worker')
    .eq('is_active', true)
    .or('can_work.eq.true,role.eq.worker')
    .limit(200)

  // 해당 시간대 일정 충돌 검사 (±3h)
  const schedTime = new Date((job as any).scheduled_at).getTime()
  const bufferMs = 3 * 60 * 60 * 1000
  const { data: busyRows } = await admin
    .from('jobs')
    .select('worker_id')
    .gte('scheduled_at', new Date(schedTime - bufferMs).toISOString())
    .lte('scheduled_at', new Date(schedTime + bufferMs).toISOString())
    .in('status', ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED'])
  const busy = new Set((busyRows || []).map((r) => r.worker_id).filter(Boolean))

  // 단골 파트너 보너스
  const { data: favs } = await admin
    .from('favorite_partners')
    .select('worker_id')
    .eq('operator_id', job.operator_id)
  const favSet = new Set((favs || []).map((f) => f.worker_id))

  // 워커 최근 위치 (최근 14일 GPS trail에서 worker별 최신 1건)
  const workerIds = (workers || []).map((w) => w.id)
  const lastKnown = new Map<string, { lat: number; lng: number }>()
  if (workerIds.length > 0) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: locs } = await admin
      .from('worker_locations')
      .select('worker_id, lat, lng, recorded_at')
      .in('worker_id', workerIds)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(2000)
    for (const l of locs || []) {
      if (!lastKnown.has(l.worker_id)) lastKnown.set(l.worker_id, { lat: Number(l.lat), lng: Number(l.lng) })
    }
  }

  // 거리 점수 만점(30) 중 위치 미상 워커에게 줄 중립값 (≈5km 상당). 만점 부여 시 실제 근거리 워커가 밀림
  const NEUTRAL_DISTANCE_SCORE = 15

  const scored = (workers || [])
    .filter((w) => !busy.has(w.id))
    .map((w) => {
      const loc = lastKnown.get(w.id)
      const hasLocation = !!loc
      const score = computeMatchScore({
        worker: {
          id: w.id,
          tier: (w.tier as any) ?? 'STARTER',
          avg_rating: w.avg_rating ?? 0,
          total_jobs: w.total_jobs ?? 0,
          sparkle_score: w.sparkle_score ?? 0,
        },
        worker_lat: loc?.lat ?? space_lat,
        worker_lng: loc?.lng ?? space_lng,
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
      // 위치 미상 워커: 거리 만점 대신 중립값으로 보정 (배제하진 않되 만점 왜곡 제거)
      const total = hasLocation
        ? score.total
        : score.total - score.breakdown.distance + NEUTRAL_DISTANCE_SCORE
      return { worker_id: w.id, score: total }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)

  if (scored.length === 0) return { matched: 0 }

  const spaceName = (job as any).spaces?.name ?? '공간'
  const payload: NotifyPayload = {
    title: (job as any).is_urgent ? '🚨 긴급 청소 요청' : '새 청소 요청',
    message: `${spaceName} — 지금 지원하면 우선 매칭`,
    url: `/clean/job/${jobId}`,
    type: 'general',
  }

  // 중복 방지: 같은 job url의 기존 미읽음 알림 삭제 후 재발송
  await admin
    .from('notifications')
    .delete()
    .in('user_id', scored.map((s) => s.worker_id))
    .eq('url', payload.url!)
    .eq('is_read', false)

  await notifyUsers(scored.map((s) => s.worker_id), payload, admin)

  return { matched: scored.length }
}
