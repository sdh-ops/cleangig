import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 공간파트너 청소 작업 승인 + 정산 레코드 생성
 *
 * Body: { job_id }
 *
 * 1. 권한 확인 (operator)
 * 2. 상태 확인 (SUBMITTED만 승인 가능)
 * 3. jobs.status = APPROVED
 * 4. payments 레코드 생성 (HELD) — admin client로 RLS 우회
 * 5. 클린파트너에게 승인 알림
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { job_id } = body
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    // 1. 권한 및 상태 확인
    const { data: job } = await supabase
      .from('jobs')
      .select('id, operator_id, worker_id, status, price, price_breakdown, spaces(name)')
      .eq('id', job_id)
      .single()

    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (job.status !== 'SUBMITTED') {
      return NextResponse.json({ ok: false, error: 'not_approvable', current_status: job.status }, { status: 400 })
    }

    // 2. jobs 상태 → APPROVED
    const { error: jobErr } = await supabase
      .from('jobs')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', job_id)
    if (jobErr) throw jobErr

    // 3. payments 레코드 생성/업데이트 (admin client — RLS 우회)
    if (job.worker_id) {
      const admin = createAdminClient()

      // 기존 레코드 조회 (confirm 시 worker_id=null로 선생성될 수 있음)
      const { data: existing, count } = await admin
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('job_id', job_id)

      const pb: any = job.price_breakdown ?? {}
      const hostFee = pb.host_fee ?? Math.round(job.price * 0.05)
      const workerFee = pb.worker_fee ?? Math.round(job.price * 0.05)
      const platformFee = pb.platform_revenue ?? hostFee + workerFee
      const workerSubtotal = job.price - workerFee
      const withholdingTax = pb.estimated_withholding ?? Math.round(workerSubtotal * 0.033)
      const workerPayout = pb.estimated_worker_payout ?? workerSubtotal - withholdingTax

      if (!count || count === 0) {
        // 레코드 없음 → 새로 생성
        await admin.from('payments').insert({
          job_id,
          operator_id: job.operator_id,
          worker_id: job.worker_id,
          gross_amount: job.price,
          platform_fee: platformFee,
          host_fee: hostFee,
          host_fee_rate: 0.05,
          worker_fee: workerFee,
          worker_fee_rate: 0.05,
          withholding_tax: withholdingTax,
          withholding_tax_rate: 0.033,
          worker_payout: workerPayout,
          worker_tax_type: 'FREELANCER',
          status: 'HELD',
        })
      } else {
        // 레코드 있음 → worker_id + 정산액 업데이트 (confirm 시 worker_id=null로 생성된 케이스)
        await admin.from('payments')
          .update({
            worker_id: job.worker_id,
            worker_fee: workerFee,
            worker_fee_rate: 0.05,
            withholding_tax: withholdingTax,
            withholding_tax_rate: 0.033,
            worker_payout: workerPayout,
            worker_tax_type: 'FREELANCER',
          })
          .eq('job_id', job_id)
      }

      // 4. 클린파트너에게 승인 알림
      const spaceName = (job as any).spaces?.name ?? '작업'
      await supabase.from('notifications').insert({
        user_id: job.worker_id,
        title: '작업이 승인됐어요! 정산이 곧 처리됩니다.',
        message: `${spaceName}이 승인됐습니다. 수고하셨어요!`,
        url: `/clean/job/${job_id}`,
        type: 'job_approved',
        is_read: false,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('approve error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
