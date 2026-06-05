import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/support — 1:1 문의 티켓 생성
 * Body: { category, title, body, job_id? }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { category, title, body, job_id } = await req.json()

    if (!category || !title?.trim() || !body?.trim()) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
    }
    if (title.trim().length > 100) {
      return NextResponse.json({ ok: false, error: 'title_too_long' }, { status: 400 })
    }
    if (body.trim().length > 2000) {
      return NextResponse.json({ ok: false, error: 'body_too_long' }, { status: 400 })
    }

    const { data, error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      category,
      title: title.trim(),
      body: body.trim(),
      job_id: job_id || null,
      status: 'OPEN',
    }).select('id').single()

    if (error) throw error

    // 관리자에게 알림 (best-effort)
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
      if (admins && admins.length > 0) {
        await Promise.all(admins.map(admin =>
          supabase.from('notifications').insert({
            user_id: admin.id,
            title: `[문의] ${title.trim()}`,
            message: `새 1:1 문의가 접수됐습니다. 카테고리: ${category}`,
            url: `/admin/support/${data.id}`,
            type: 'support_ticket',
          })
        ))
      }
    } catch { /* 알림 실패는 무시 */ }

    return NextResponse.json({ ok: true, ticket_id: data.id })
  } catch (e) {
    console.error('support ticket error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}

/**
 * GET /api/support — 본인 문의 내역 조회
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, category, title, status, reply, replied_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ ok: true, tickets: data })
  } catch (e) {
    console.error('support fetch error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
