import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptSensitive } from '@/lib/crypto'

export const runtime = 'nodejs'

/**
 * 민감정보(주민등록번호 뒷자리) 암호화 저장 — 본인만.
 * 클라이언트에서 평문을 직접 DB에 저장하지 않고 이 라우트를 거쳐 암호화한다.
 *
 * Body: { resident_id_last: string(7자리) }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { resident_id_last } = await req.json()
    if (typeof resident_id_last !== 'string' || !/^\d{7}$/.test(resident_id_last)) {
      return NextResponse.json({ ok: false, error: 'invalid_resident_id' }, { status: 400 })
    }

    const encrypted = encryptSensitive(resident_id_last)

    // 본인 행 업데이트 → users_update_self RLS 통과
    const { error } = await supabase
      .from('users')
      .update({ resident_id_last: encrypted, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) throw error

    // 민감정보 수집 동의 기록
    await supabase.from('consents').insert({
      user_id: user.id,
      kind: 'SENSITIVE_ID',
      agreed: true,
      version: 'v1',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('sensitive save error', e)
    // ENCRYPTION_KEY 미설정 등 설정 오류를 구분해 안내
    const msg = e instanceof Error && e.message.includes('ENCRYPTION_KEY')
      ? 'server_misconfigured'
      : 'internal'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
