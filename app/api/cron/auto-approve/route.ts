import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron Job — 매시간 실행
 * SUBMITTED 상태에서 24시간 이상 공간파트너 무응답 시 자동 승인
 * vercel.json crons 설정: schedule "0 * * * *"
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

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

      await supabase
        .from('payments')
        .update({
          status: 'RELEASED',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job.id)
        .eq('status', 'HELD')

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
    console.error('Auto-approve cron error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
