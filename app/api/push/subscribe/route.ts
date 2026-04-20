import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { endpoint, keys, user_agent } = body || {}
    if (!endpoint) return NextResponse.json({ ok: false, error: 'missing_endpoint' }, { status: 400 })

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys?.p256dh || null,
          auth: keys?.auth || null,
          user_agent: user_agent || null,
        },
        { onConflict: 'user_id,endpoint' },
      )
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('push subscribe error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    const { endpoint } = (await req.json()) || {}
    if (!endpoint) return NextResponse.json({ ok: false, error: 'missing_endpoint' }, { status: 400 })

    await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
