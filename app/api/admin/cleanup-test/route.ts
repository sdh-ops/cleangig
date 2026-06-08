import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * 테스트 데이터 정리 엔드포인트
 * GET /api/admin/cleanup-test
 *
 * 플랫폼 관리자만 호출 가능.
 * 삭제 대상:
 *  1. 알려진 테스트 job ID 목록
 *  2. operator_id = worker_id 인 job (실제 운영에서 불가능한 패턴)
 *
 * 외래키 순서에 맞게 삭제:
 *   worker_locations → payments → disputes → messages → notifications → jobs
 */
const KNOWN_TEST_JOB_IDS = [
  '1e4ac197-feb0-47f7-98b2-65ad3fe77100',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!isPlatformAdmin(user.email, profile?.role)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // 삭제 대상 job ID 수집
    const targetIds = new Set<string>(KNOWN_TEST_JOB_IDS)

    // operator_id = worker_id인 job 수집 (최근 30일, JS 필터)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentJobs } = await admin
      .from('jobs')
      .select('id, operator_id, worker_id')
      .gte('created_at', thirtyDaysAgo)

    for (const j of recentJobs ?? []) {
      if (j.operator_id && j.worker_id && j.operator_id === j.worker_id) {
        targetIds.add(j.id)
      }
    }

    if (targetIds.size === 0) {
      return NextResponse.json({ ok: true, message: '삭제할 테스트 데이터 없음', deleted: [] })
    }

    const ids = [...targetIds]
    const counts: Record<string, number> = {}

    // 1. worker_locations
    { const { count } = await admin.from('worker_locations').delete({ count: 'exact' }).in('job_id', ids)
      counts.worker_locations = count ?? 0 }

    // 2. payments
    { const { count } = await admin.from('payments').delete({ count: 'exact' }).in('job_id', ids)
      counts.payments = count ?? 0 }

    // 3. disputes
    { const { count } = await admin.from('disputes').delete({ count: 'exact' }).in('job_id', ids)
      counts.disputes = count ?? 0 }

    // 4. messages
    { const { count } = await admin.from('messages').delete({ count: 'exact' }).in('job_id', ids)
      counts.messages = count ?? 0 }

    // 5. notifications — url 패턴으로 매칭
    let notifTotal = 0
    for (const id of ids) {
      const { count: c1 } = await admin.from('notifications').delete({ count: 'exact' }).like('url', `%/requests/${id}%`)
      const { count: c2 } = await admin.from('notifications').delete({ count: 'exact' }).like('url', `%/clean/job/${id}%`)
      notifTotal += (c1 ?? 0) + (c2 ?? 0)
    }
    counts.notifications = notifTotal

    // 6. jobs 본체
    const { count: jobCount, error: jobErr } = await admin
      .from('jobs')
      .delete({ count: 'exact' })
      .in('id', ids)
    if (jobErr) throw jobErr
    counts.jobs = jobCount ?? 0

    return NextResponse.json({ ok: true, deleted_job_ids: ids, counts })
  } catch (e) {
    console.error('cleanup-test error', e)
    return NextResponse.json({ ok: false, error: 'internal', detail: String(e) }, { status: 500 })
  }
}
