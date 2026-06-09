import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/health
 *
 * 운영 환경 준비 상태 진단 — 필수 환경 변수 존재 여부 확인
 * 실제 DB 연결 테스트는 하지 않음 (경량 체크)
 *
 * 관리자 페이지에서 호출하거나 배포 후 수동 확인용으로 사용
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
  const missing = checks.filter((c) => !c.ok)

  return NextResponse.json(
    {
      ok: allOk,
      status: allOk ? 'healthy' : 'degraded',
      checks,
      missing: missing.map((c) => ({ name: c.name, note: c.note })),
    },
    { status: allOk ? 200 : 503 },
  )
}
