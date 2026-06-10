import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/health
 *
 * 공개 응답: { ok, status }만 — 어떤 시크릿이 설정/미설정인지는 노출하지 않음
 * 관리자 응답: 환경변수별 체크 상세 포함 (배포 후 진단용)
 */
export async function GET() {
  const checks: { name: string; ok: boolean; note?: string }[] = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      note: '미설정 시 결제 생성/확인, 크론잡 전부 실패',
    },
    {
      name: 'TOSS_SECRET_KEY',
      ok: !!process.env.TOSS_SECRET_KEY,
      note: '미설정 시 Toss 결제 검증 실패',
    },
    {
      name: 'CRON_SECRET',
      ok: !!process.env.CRON_SECRET,
      note: '미설정 시 크론잡 401 반환',
    },
    { name: 'NEXT_PUBLIC_TOSS_CLIENT_KEY', ok: !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY },
    { name: 'NEXT_PUBLIC_APP_URL', ok: !!process.env.NEXT_PUBLIC_APP_URL },
    {
      name: 'VAPID_PRIVATE_KEY',
      ok: !!process.env.VAPID_PRIVATE_KEY,
      note: '미설정 시 웹 푸시 알림 발송 불가',
    },
  ]

  const allOk = checks.every((c) => c.ok)
  const status = allOk ? 'healthy' : 'degraded'

  // 상세 진단은 관리자에게만 — 비관리자/비로그인에겐 상태만
  let isAdmin = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: me } = await supabase
        .from('users')
        .select('email, role')
        .eq('id', user.id)
        .single()
      isAdmin = isPlatformAdmin(me?.email, me?.role)
    }
  } catch {
    // 세션 조회 실패 = 비관리자 취급
  }

  if (!isAdmin) {
    return NextResponse.json({ ok: allOk, status }, { status: allOk ? 200 : 503 })
  }

  const missing = checks.filter((c) => !c.ok)
  return NextResponse.json(
    {
      ok: allOk,
      status,
      checks,
      missing: missing.map((c) => ({ name: c.name, note: c.note })),
    },
    { status: allOk ? 200 : 503 },
  )
}
