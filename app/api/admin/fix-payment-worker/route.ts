import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/fix-payment-worker?job_id=xxx
 *
 * payments 레코드에 worker_id가 누락된 경우 (confirm→approve 순서 버그)
 * job의 worker_id를 payments에 반영한다.
 * - 플랫폼 관리자 세션 or
 * - Authorization: Bearer {CRON_SECRET} 헤더로 호출 가능
 */
export async function PATCH(req: Request) {
  try {
    // CRON_SECRET 기반 인증 (관리자 세션 없이 호출 가능)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const isCronAuth = cronSecret && bearerToken === cronSecret

    if (!isCronAuth) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (!isPlatformAdmin(user.email, profile?.role)) {
        return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(req.url)
    const job_id = searchParams.get('job_id')
    if (!job_id) return NextResponse.json({ ok: false, error: 'missing job_id' }, { status: 400 })

    const admin = createAdminClient()

    const { data: job } = await admin
      .from('jobs')
      .select('id, worker_id, status, price, price_breakdown, operator_id')
      .eq('id', job_id)
      .single()

    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (!job.worker_id) return NextResponse.json({ ok: false, error: 'no_worker_assigned' }, { status: 400 })

    const pb: any = job.price_breakdown ?? {}
    const hostFee = pb.host_fee ?? Math.round(job.price * 0.05)
    const workerFee = pb.worker_fee ?? Math.round(job.price * 0.05)
    const workerSubtotal = job.price - workerFee
    const withholdingTax = pb.estimated_withholding ?? Math.round(workerSubtotal * 0.033)
    const workerPayout = pb.estimated_worker_payout ?? workerSubtotal - withholdingTax

    const { error } = await admin
      .from('payments')
      .update({
        worker_id: job.worker_id,
        worker_fee: workerFee,
        worker_fee_rate: 0.06,
        withholding_tax: withholdingTax,
        withholding_tax_rate: 0.033,
        worker_payout: workerPayout,
        worker_tax_type: 'FREELANCER',
      })
      .eq('job_id', job_id)
      .is('worker_id', null)

    if (error) throw error

    return NextResponse.json({ ok: true, job_id, worker_id: job.worker_id, worker_payout: workerPayout })
  } catch (e) {
    console.error('fix-payment-worker error', e)
    return NextResponse.json({ ok: false, error: 'internal', detail: String(e) }, { status: 500 })
  }
}
