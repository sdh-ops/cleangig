import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron — 매일 03:00 실행
 *
 * APPROVED 상태인 jobs의 payments를 HELD → RELEASED 처리.
 * 승인(completed_at) 후 3일 이상 경과한 건만 대상.
 *
 * 실결제 도입 후: 이 크론에서 Toss 에스크로 해제 API 호출 추가 필요.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // 승인 후 3일(72h) 경과한 APPROVED jobs 조회
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: jobs, error: fetchError } = await admin
      .from('jobs')
      .select('id, worker_id, operator_id, completed_at')
      .eq('status', 'APPROVED')
      .not('completed_at', 'is', null)
      .lt('completed_at', threeDaysAgo.toISOString())

    if (fetchError) throw fetchError
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ ok: true, released: 0, message: '정산 대상 없음' })
    }

    const results: { id: string; ok: boolean; worker_payout?: number; error?: string }[] = []

    for (const job of jobs) {
      // 해당 job의 HELD payments 조회
      const { data: payment, error: payErr } = await admin
        .from('payments')
        .select('id, worker_payout, worker_id')
        .eq('job_id', job.id)
        .eq('status', 'HELD')
        .single()

      if (payErr || !payment) {
        // 이미 RELEASED됐거나 payments 레코드 없음 → skip
        continue
      }

      // HELD → RELEASED
      const { error: updateErr } = await admin
        .from('payments')
        .update({
          status: 'RELEASED',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)

      if (updateErr) {
        results.push({ id: job.id, ok: false, error: updateErr.message })
        continue
      }

      // 워커 인앱 + SMS 정산 알림
      const workerId = payment.worker_id ?? job.worker_id
      if (workerId) {
        await admin.from('notifications').insert({
          user_id: workerId,
          title: '정산이 완료되었어요! 💰',
          message: `${(payment.worker_payout ?? 0).toLocaleString()}원이 정산 처리되었습니다. 등록된 계좌로 입금 예정입니다.`,
          url: '/earnings',
          type: 'general',
          is_read: false,
        })
      }

      results.push({ id: job.id, ok: true, worker_payout: payment.worker_payout ?? 0 })
    }

    const released = results.filter((r) => r.ok).length
    return NextResponse.json({ ok: true, released, results })
  } catch (error) {
    console.error('release-payments cron error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
