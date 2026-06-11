import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notify'

/**
 * POST /api/notifications
 * 클라이언트 측 인앱 알림 이후 Web Push 발송 릴레이.
 * 클라이언트는 in-app INSERT 후 이 엔드포인트를 fire-and-forget으로 호출한다.
 * 서버에서만 실행 가능한 web-push 라이브러리를 통해 VAPID 푸시를 발송한다.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { user_id, title, message, url, type } = body as {
      user_id: string
      title: string
      message: string
      url?: string
      type?: string
    }

    if (!user_id || !title || !message) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }

    // Web Push만 발송 (in-app은 이미 클라이언트에서 INSERT됨 — 중복 방지)
    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPriv = process.env.VAPID_PRIVATE_KEY
    if (!vapidPub || !vapidPriv) {
      return NextResponse.json({ ok: true, skipped: 'vapid_not_configured' })
    }

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:sdh@thenanbiz.com',
      vapidPub,
      vapidPriv,
    )

    const adminClient = (await import('@/lib/supabase/admin')).createAdminClient()
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    await Promise.all(
      (subs || []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh || '', auth: s.auth || '' } },
            JSON.stringify({ title, message, url: url ?? null }),
          )
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await adminClient.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          }
        }
      }),
    )

    return NextResponse.json({ ok: true, sent: (subs || []).length })
  } catch (e) {
    console.error('[notifications/push] 실패:', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
