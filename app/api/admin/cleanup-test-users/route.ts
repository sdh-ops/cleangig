import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * POST /api/admin/cleanup-test-users
 * 관리자 전용 — E2E 테스트 계정 비활성화
 * name이 'E2E워커', '테스트워커', 'E2E오퍼레이터' 등 테스트 패턴과 일치하는 계정을 is_active=false 처리
 */
export async function POST(request: Request) {
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

    const admin = createAdminClient()

    // 테스트 계정 패턴
    const TEST_PATTERNS = ['E2E워커', '테스트워커', 'E2E오퍼레이터', 'E2E테스트']

    const results: { pattern: string; count: number }[] = []

    for (const pattern of TEST_PATTERNS) {
      const { data, error } = await admin
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .ilike('name', `${pattern}%`)
        .select('id')

      if (error) {
        console.error(`[cleanup-test-users] pattern=${pattern}`, error)
        continue
      }
      results.push({ pattern, count: data?.length ?? 0 })
    }

    const total = results.reduce((s, r) => s + r.count, 0)
    return NextResponse.json({ ok: true, deactivated: total, results })
  } catch (error) {
    console.error('cleanup-test-users error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
