import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSettlement, type TaxType } from '@/lib/pricing'

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
      .select('id, worker_id, operator_id, price, extra_charge_status, extra_charge_amount')
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

      // 정산액 확정 — 워커 세금유형·승인된 추가청구 반영 (수동 승인과 동일 로직)
      if (job.worker_id) {
        const { data: worker } = await supabase
          .from('users').select('tax_type').eq('id', job.worker_id).single()
        const taxType: TaxType = (worker?.tax_type as TaxType) ?? 'FREELANCER'
        const approvedExtra =
          (job as any).extra_charge_status === 'APPROVED' ? Number((job as any).extra_charge_amount) || 0 : 0
        const s = calculateSettlement((job.price || 0) + approvedExtra, { taxType })
        await supabase
          .from('payments')
          .update({
            gross_amount: s.gross_amount,
            platform_fee: s.platform_revenue,
            host_fee: s.host_fee,
            host_fee_rate: s.host_fee_rate,
            worker_fee: s.worker_fee,
            worker_fee_rate: s.worker_fee_rate,
            withholding_tax: s.withholding_tax,
            withholding_tax_rate: s.withholding_tax_rate,
            worker_payout: s.worker_payout,
            worker_tax_type: taxType,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', job.id)
          .eq('status', 'HELD')
      }

      // 에스크로 해제(HELD→RELEASED)는 release-payments 크론에 위임 — 수동/자동 승인 모두 3일 보류로 일관
      if (job.worker_id) {
        await supabase.from('notifications').insert({
          user_id: job.worker_id,
          title: '작업이 자동 승인되었습니다',
          message: '공간파트너의 무응답으로 24시간 후 자동 승인 처리되었어요. 며칠 내 정산이 진행됩니다.',
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
