import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export const runtime = 'nodejs'

// Body: { user_id, title, message, url }
// Requires VAPID keys in env. If not configured, falls back to creating in-app notification only.
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { user_id, title, message, url } = body || {}
    if (!user_id || !title || !message) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    // Always write in-app notification (triggers realtime overlay)
    await supabase.from('notifications').insert({
      user_id,
      title,
      message,
      url: url || null,
    })

    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPriv = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@sseuksak.com'

    if (vapidPub && vapidPriv) {
      try {
        webpush.setVapidDetails(vapidSubject, vapidPub, vapidPriv)
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', user_id)

        await Promise.all(
          (subs || []).map(async (s) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh || '', auth: s.auth || '' },
                },
                JSON.stringify({ title, message, url }),
              )
            } catch (e: any) {
              // Clean up stale subscriptions
              if (e?.statusCode === 404 || e?.statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
              }
            }
          }),
        )
      } catch (e) {
        console.error('webpush failed', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('push send error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
