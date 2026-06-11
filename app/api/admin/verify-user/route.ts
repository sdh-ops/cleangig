import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/verify-user
 * 관리자 전용 — 사용자 인증 승인/취소/반려
 *
 * Body:
 *   { user_id, is_verified: true }            — 인증 승인
 *   { user_id, is_verified: false }           — 인증 취소 (이미 승인된 건 되돌리기)
 *   { user_id, action: 'reject', reason? }    — 제출 반려 (재제출 요청)
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
    const { user_id, is_verified, action, reason } = body as {
      user_id?: string; is_verified?: boolean; action?: string; reason?: string
    }

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── 반려: is_verified는 false 유지, 제출 마커에 rejected 표시 → 심사 큐에서 제거 + 재제출 유도
    if (action === 'reject') {
      const { data: target } = await admin
        .from('users').select('preferences').eq('id', user_id).single()
      const prevPrefs = (target?.preferences as Record<string, unknown>) || {}
      const { error } = await admin
        .from('users')
        .update({
          is_verified: false,
          preferences: {
            ...prevPrefs,
            verification_status: 'rejected',
            verification_rejected_reason: reason || null,
            verification_rejected_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_id)
      if (error) throw error

      await admin.from('notifications').insert({
        user_id,
        title: '인증 서류 재제출이 필요해요',
        message: reason
          ? `반려 사유: ${reason}. 서류를 다시 제출해주세요.`
          : '제출하신 인증 서류를 확인할 수 없어요. 다시 제출해주세요.',
        url: '/profile/verification',
        type: 'general',
        is_read: false,
      })

      return NextResponse.json({ ok: true, user_id, action: 'rejected' })
    }

    // ── 승인/취소
    if (typeof is_verified !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'is_verified required' }, { status: 400 })
    }

    // 승인 시 반려 마커 제거
    let prefsPatch: Record<string, unknown> | undefined
    if (is_verified) {
      const { data: target } = await admin
        .from('users').select('preferences').eq('id', user_id).single()
      const prevPrefs = (target?.preferences as Record<string, unknown>) || {}
      const { verification_status, verification_rejected_reason, verification_rejected_at, ...rest } = prevPrefs
      prefsPatch = { ...rest, verification_status: 'approved', verified_at: new Date().toISOString() }
    }

    const { error } = await admin
      .from('users')
      .update({
        is_verified,
        ...(prefsPatch ? { preferences: prefsPatch } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (error) throw error

    // 인증 승인 시 인앱 알림
    if (is_verified) {
      await admin.from('notifications').insert({
        user_id,
        title: '신원 인증이 완료되었어요! ✅',
        message: '인증이 승인되었습니다. 이제 더 많은 작업을 받을 수 있어요.',
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
