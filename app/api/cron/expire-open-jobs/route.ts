import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron Job — 매시간 실행
 * OPEN 상태에서 scheduled_at 이후 4시간 경과된 매칭 없는 작업 → CANCELLED
 * 공간파트너에게 알림 발송
 * vercel.json crons: schedule "30 * * * *"
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // 4시간 전 기준 — scheduled_at이 이미 지났고 아직 OPEN(worker_id null)인 작업
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, operator_id, scheduled_at, spaces(name)')
      .eq('status', 'OPEN')
      .is('worker_id', null)
      .lt('scheduled_at', fourHoursAgo)

    if (fetchError) throw fetchError
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ ok: true, expired: 0, message: '만료 대상 없음' })
    }

    const results: { id: string; ok: boolean; error?: string }[] = []

    for (const job of jobs) {
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'CANCELED', // single L — matches job_status enum
          cancel_reason: '매칭 파트너 없음 (자동 만료)',
          canceled_at: now,
          updated_at: now,
        })
        .eq('id', job.id)
        .eq('status', 'OPEN') // 동시성 보호

      if (updateError) {
        results.push({ id: job.id, ok: false, error: updateError.message })
        continue
      }

      // 결제 전액 환불 처리 (매칭 실패 = 플랫폼 책임 → 100% 환불)
      const { data: payment } = await supabase
        .from('payments')
        .select('id, pg_payment_key, gross_amount')
        .eq('job_id', job.id)
        .eq('status', 'HELD')
        .maybeSingle()

      let refundExecuted = false
      if (payment) {
        // Toss 환불 (pg_payment_key 있을 때)
        if (payment.pg_payment_key && process.env.TOSS_SECRET_KEY) {
          const encKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')
          const tossRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${payment.pg_payment_key}/cancel`,
            {
              method: 'POST',
              headers: { Authorization: `Basic ${encKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ cancelReason: '매칭 파트너 없음 — 자동 전액 환불', cancelAmount: payment.gross_amount }),
            },
          )
          if (tossRes.ok) {
            refundExecuted = true
          } else {
            const tossErr = await tossRes.json().catch(() => ({}))
            console.error('[expire-open-jobs] Toss cancel failed — 수동 환불 필요. payment:', payment.id, tossErr)
          }
        }

        // 환불 성공 시에만 REFUNDED — 실패 시 HELD 유지해 관리자 settle-payment로 재시도 가능
        if (refundExecuted || !payment.pg_payment_key) {
          await supabase
            .from('payments')
            .update({ status: 'REFUNDED', updated_at: now })
            .eq('id', payment.id)
        }
      }

      // 공간파트너에게 알림 — 환불 실제 실행 여부에 따라 문구 분기
      const spaceName = (job as any).spaces?.name ?? '작업'
      const refundMsg = refundExecuted
        ? ' 결제가 전액 환불됩니다.'
        : payment
          ? ' 환불이 순차 처리될 예정입니다. 지연 시 고객센터로 문의해주세요.'
          : ''
      await supabase.from('notifications').insert({
        user_id: job.operator_id,
        title: '청소 요청이 자동 취소됐어요',
        message: `${spaceName} 작업에 4시간 내 매칭된 클린파트너가 없어 취소됐습니다.${refundMsg}`,
        url: `/requests`,
        type: 'job_expired',
        is_read: false,
      })

      results.push({ id: job.id, ok: true })
    }

    const expired = results.filter((r) => r.ok).length
    return NextResponse.json({ ok: true, expired, results })
  } catch (error) {
    console.error('Expire open jobs cron error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'internal' },
      { status: 500 },
    )
  }
}
