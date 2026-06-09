import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/notifications
 * 외부 알림 채널 (SMS·알림톡) 발송 엔드포인트.
 * 현재 푸시 알림(Web Push)만 사용하므로 이 라우트는 no-op.
 * 향후 SMS 채널 도입 시 여기서 구현.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    console.log('[notifications] skip — no SMS channel configured:', body?.user_id)

    return NextResponse.json({ success: true, skipped: true })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
