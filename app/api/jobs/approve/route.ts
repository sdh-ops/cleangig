import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSettlement, type TaxType } from '@/lib/pricing'

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
      .select('id, operator_id, worker_id, status, price, price_breakdown, extra_charge_status, extra_charge_amount, completed_at, is_recurring, recurring_config, space_id, estimated_duration, checklist, special_instructions, is_urgent, time_window_start, time_window_end, preferred_worker_id, spaces(name)')
      .eq('id', job_id)
      .single()

    if (!job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (job.operator_id !== user.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    if (job.status !== 'SUBMITTED') {
      return NextResponse.json({ ok: false, error: 'not_approvable', current_status: job.status }, { status: 400 })
    }

    // 2. jobs 상태 → APPROVED
    // completed_at 누락 시 보정 — release-payments 크론이 completed_at 기준이라 null이면 정산이 영원히 안 됨
    const approveUpdate: Record<string, unknown> = { status: 'APPROVED', updated_at: new Date().toISOString() }
    if (!(job as any).completed_at) approveUpdate.completed_at = new Date().toISOString()
    const { error: jobErr } = await supabase
      .from('jobs')
      .update(approveUpdate)
      .eq('id', job_id)
    if (jobErr) throw jobErr

    // 3. payments 레코드 생성/업데이트 (admin client — RLS 우회)
    const admin = createAdminClient()
    if (job.worker_id) {

      // 기존 레코드 조회 (confirm 시 worker_id=null로 선생성될 수 있음)
      const { count } = await admin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', job_id)

      // 워커 세금 유형 조회 (사업자면 원천징수 없음). 미설정 시 프리랜서 기본
      const { data: worker } = await admin
        .from('users')
        .select('tax_type')
        .eq('id', job.worker_id)
        .single()
      const taxType: TaxType = (worker?.tax_type as TaxType) ?? 'FREELANCER'

      // 승인된 추가 청구액을 정산 총액에 합산 (승인 시점이 정산 확정 지점)
      const approvedExtra =
        (job as any).extra_charge_status === 'APPROVED' ? Number((job as any).extra_charge_amount) || 0 : 0
      const grossAmount = (job.price || 0) + approvedExtra

      // 정산 = 단일 소스(calculateSettlement)로 계산 — 세금유형·반올림 일관성 보장
      const s = calculateSettlement(grossAmount, { taxType })

      const paymentRow = {
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
      }

      if (!count || count === 0) {
        await admin.from('payments').insert({
          job_id,
          operator_id: job.operator_id,
          worker_id: job.worker_id,
          status: 'HELD',
          ...paymentRow,
        })
      } else {
        await admin.from('payments')
          .update({ worker_id: job.worker_id, ...paymentRow })
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
      // 자동 다음 회차 생성은 legacy { interval } 형식만 대상.
      // recurring 라우트의 { frequency } 시리즈는 전 회차를 선생성하므로 여기서 연장하지 않음
      // (연장 시 결제 없는 OPEN 작업이 무한 생성됨).
      const rc = (job as any).recurring_config as { interval?: string; day_of_week?: number }
      const interval = (rc.interval ?? '').toLowerCase()
      const stepDaysMap: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14 }

      if (interval && (interval === 'monthly' || stepDaysMap[interval])) {
        const currentScheduled = new Date((job as any).scheduled_at ?? Date.now())
        const nextScheduled = new Date(currentScheduled)
        // monthly는 달력 기준(말일 보정 포함) — 30일 고정 오프셋은 월별 편차 발생
        if (interval === 'monthly') nextScheduled.setMonth(nextScheduled.getMonth() + 1)
        else nextScheduled.setDate(nextScheduled.getDate() + stepDaysMap[interval])

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
