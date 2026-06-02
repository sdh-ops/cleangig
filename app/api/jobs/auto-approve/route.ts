import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * 전액 정산 보호 (Auto-Approval)
 * SUBMITTED 상태에서 공간파트너가 24시간 응답 없으면 자동 승인.
 * payments 테이블의 HELD → RELEASED 전환 (실결제 도입 후 유효).
 * Cron job에서 호출 권장.
 */
export async function POST(req: Request) {
  try {
    // 크론 전용: CRON_SECRET 일치해야 실행 (무인증 대량 자동승인·에스크로 해제 방지)
    // Vercel Cron / 외부 스케줄러는 Authorization: Bearer <CRON_SECRET> 헤더 전송
    const secret = process.env.CRON_SECRET
    const auth = req.headers.get('authorization')
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, worker_id, operator_id, price')
      .eq('status', 'SUBMITTED')
      .lt('updated_at', oneDayAgo.toISOString())

    if (fetchError) throw fetchError
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ ok: true, approved: 0, message: '자동 승인 대상 없음' })
    }

    const results: { id: string; ok: boolean; error?: string }[] = []

    for (const job of jobs) {
      // 1. job 상태 APPROVED + auto_approved 플래그
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'APPROVED',
          auto_approved: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      if (updateError) {
        results.push({ id: job.id, ok: false, error: updateError.message })
        continue
      }

      // 2. payments HELD → RELEASED (존재할 경우)
      await supabase
        .from('payments')
        .update({
          status: 'RELEASED',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job.id)
        .eq('status', 'HELD')

      // 3. 클린파트너 알림
      if (job.worker_id) {
        await supabase.from('notifications').insert({
          user_id: job.worker_id,
          title: '작업이 자동 승인되었습니다',
          message: '공간파트너의 무응답으로 24시간 후 자동 승인 처리되었어요. 정산이 진행됩니다.',
          url: `/clean/job/${job.id}`,
        })
      }

      results.push({ id: job.id, ok: true })
    }

    const approved = results.filter((r) => r.ok).length
    return NextResponse.json({ ok: true, approved, results })
  } catch (error) {
    console.error('Auto-approve error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
