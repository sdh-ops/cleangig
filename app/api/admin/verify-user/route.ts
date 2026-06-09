import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/verify-user
 * 관리자 전용 — 사용자 is_verified 토글
 *
 * Body: { user_id: string, is_verified: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('email, role')
      .eq('id', user.id)
      .single()

    if (!isPlatformAdmin(me?.email, me?.role)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, is_verified } = body as { user_id?: string; is_verified?: boolean }

    if (!user_id || typeof is_verified !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'user_id and is_verified required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('users')
      .update({ is_verified, updated_at: new Date().toISOString() })
      .eq('id', user_id)

    if (error) throw error

    // 인증 승인 시 인앱 알림
    if (is_verified) {
      await admin.from('notifications').insert({
        user_id,
        title: '신원 인증이 완료되었어요! ✅',
        message: '클린파트너 인증이 승인되었습니다. 이제 더 많은 작업을 받을 수 있어요.',
        url: '/earnings',
        type: 'general',
        is_read: false,
      })
    }

    return NextResponse.json({ ok: true, user_id, is_verified })
  } catch (error) {
    console.error('verify-user error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
