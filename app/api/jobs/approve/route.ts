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
      .select('id, operator_id, worker_id, status, price, price_breakdown, is_recurring, recurring_config, space_id, estimated_duration, checklist, special_instructions, is_urgent, time_window_start, time_window_end, preferred_worker_id, spaces(name)')
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
    const admin = createAdminClient()
    if (job.worker_id) {

      // 기존 레코드 조회 (confirm 시 worker_id=null로 선생성될 수 있음)
      const { data: existing, count } = await admin
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('job_id', job_id)

      const pb: any = job.price_breakdown ?? {}
      // 수수료: price_breakdown 우선, 없으면 현행 정책(host 5% + worker 15%) 적용
      const HOST_FEE_RATE = 0.05
      const WORKER_FEE_RATE = 0.15
      const WITHHOLDING_RATE = 0.033
      const hostFee = pb.host_fee ?? Math.round(job.price * HOST_FEE_RATE)
      const workerFee = pb.worker_fee ?? Math.round(job.price * WORKER_FEE_RATE)
      const platformFee = pb.platform_revenue ?? hostFee + workerFee
      const workerSubtotal = job.price - workerFee
      const withholdingTax = pb.estimated_withholding ?? Math.round(workerSubtotal * WITHHOLDING_RATE)
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
          host_fee_rate: HOST_FEE_RATE,
          worker_fee: workerFee,
          worker_fee_rate: WORKER_FEE_RATE,
          withholding_tax: withholdingTax,
          withholding_tax_rate: WITHHOLDING_RATE,
          worker_payout: workerPayout,
          worker_tax_type: 'FREELANCER',
          status: 'HELD',
        })
      } else {
        // 레코드 있음 → worker_id + 정산액 업데이트
        await admin.from('payments')
          .update({
            worker_id: job.worker_id,
            worker_fee: workerFee,
            worker_fee_rate: WORKER_FEE_RATE,
            withholding_tax: withholdingTax,
            withholding_tax_rate: WITHHOLDING_RATE,
            worker_payout: workerPayout,
            worker_tax_type: 'FREELANCER',
          })
          .eq('job_id', job_id)
      }

      // 4. 클린파트너에게 승인 알림 (중복 방지: 동일 job_id 알림이 이미 있으면 skip)
      const spaceName = (job as any).spaces?.name ?? '작업'
      // 한국어 조사 자동 선택 (이/가): 마지막 글자 받침 여부로 판단
      const lastChar = spaceName.charCodeAt(spaceName.length - 1)
      const hasReceivingConsonant = lastChar >= 0xAC00 && lastChar <= 0xD7A3
        ? (lastChar - 0xAC00) % 28 !== 0
        : false
      const particle = hasReceivingConsonant ? '이' : '가'

      const jobUrl = `/clean/job/${job_id}`
      const { count: existingCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', job.worker_id)
        .eq('url', jobUrl)
        .eq('type', 'job_approved')

      if (!existingCount || existingCount === 0) {
        await supabase.from('notifications').insert({
          user_id: job.worker_id,
          title: '작업이 승인됐어요! 정산이 곧 처리됩니다.',
          message: `${spaceName}${particle} 승인됐습니다. 수고하셨어요!`,
          url: jobUrl,
          type: 'job_approved',
          is_read: false,
        })
      }
    }

    // 5. 정기 청소 → 다음 인스턴스 자동 생성 (중복 방지: 이미 다음 작업 존재하면 skip)
    if ((job as any).is_recurring && (job as any).recurring_config) {
      const rc = (job as any).recurring_config as { interval?: string; day_of_week?: number }
      const intervalMs: Record<string, number> = {
        daily: 86400_000,
        weekly: 7 * 86400_000,
        biweekly: 14 * 86400_000,
        monthly: 30 * 86400_000,
      }
      const ms = rc.interval ? intervalMs[rc.interval] : null

      if (ms) {
        const currentScheduled = new Date((job as any).scheduled_at ?? Date.now())
        const nextScheduled = new Date(currentScheduled.getTime() + ms)

        // 중복 방지: 같은 space_id, is_recurring=true, OPEN/ASSIGNED 상태로 이미 예정된 작업 존재 여부
        const { count: dupCount } = await admin
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', (job as any).space_id)
          .eq('is_recurring', true)
          .in('status', ['OPEN', 'ASSIGNED'])
          .gte('scheduled_at', nextScheduled.toISOString())

        if (!dupCount || dupCount === 0) {
          await admin.from('jobs').insert({
            space_id: (job as any).space_id,
            operator_id: job.operator_id,
            status: 'OPEN',
            price: job.price,
            estimated_duration: (job as any).estimated_duration,
            scheduled_at: nextScheduled.toISOString(),
            is_recurring: true,
            recurring_config: rc,
            checklist: (job as any).checklist ?? [],
            special_instructions: (job as any).special_instructions ?? null,
            is_urgent: false,
            time_window_start: (job as any).time_window_start ?? null,
            time_window_end: (job as any).time_window_end ?? null,
            preferred_worker_id: (job as any).preferred_worker_id ?? null,
            auto_approved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          // 공간파트너에게 다음 정기 청소 생성 알림
          await supabase.from('notifications').insert({
            user_id: job.operator_id,
            title: '다음 정기 청소가 자동 등록됐어요',
            message: `${nextScheduled.toLocaleDateString('ko-KR')} 정기 청소가 자동으로 요청됐습니다.`,
            url: `/requests?filter=recurring`,
            type: 'recurring_created',
            is_read: false,
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('approve error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
