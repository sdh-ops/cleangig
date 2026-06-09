import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

/**
 * POST /api/admin/settle-payment
 * 관리자 전용 — 정산 상태 수동 변경
 *
 * Body:
 *   { payment_id, action: 'release' }              — HELD → RELEASED (즉시 정산, 3일 대기 스킵)
 *   { payment_id, action: 'mark_paid' }             — RELEASED → PAID_OUT (실제 이체 완료 확인)
 *   { payment_id, action: 'refund', reason? }       — HELD → 취소 + Toss 환불 API 호출
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('email, role')
      .eq('id', user.id)
      .single()

    if (!isPlatformAdmin(me?.email, me?.role)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const { payment_id, action, reason } = await req.json()
    if (!payment_id || !action) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 현재 payment 조회
    const { data: payment, error: fetchErr } = await admin
      .from('payments')
      .select('id, status, worker_id, worker_payout, gross_amount, pg_payment_key, job_id')
      .eq('id', payment_id)
      .single()

    if (fetchErr || !payment) {
      return NextResponse.json({ ok: false, error: 'payment_not_found' }, { status: 404 })
    }

    if (action === 'release') {
      // HELD → RELEASED
      if (payment.status !== 'HELD') {
        return NextResponse.json({ ok: false, error: `not_held (current: ${payment.status})` }, { status: 400 })
      }

      const { error } = await admin
        .from('payments')
        .update({
          status: 'RELEASED',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment_id)

      if (error) throw error

      // 워커 알림
      if (payment.worker_id) {
        await admin.from('notifications').insert({
          user_id: payment.worker_id,
          title: '정산이 처리됐어요! 💰',
          message: `${(payment.worker_payout ?? 0).toLocaleString()}원 정산이 시작됐습니다. 곧 등록 계좌로 입금됩니다.`,
          url: '/earnings',
          type: 'general',
          is_read: false,
        })
      }

      return NextResponse.json({ ok: true, action: 'released', payment_id })
    }

    if (action === 'mark_paid') {
      // RELEASED → PAID_OUT
      if (payment.status !== 'RELEASED') {
        return NextResponse.json({ ok: false, error: `not_released (current: ${payment.status})` }, { status: 400 })
      }

      const { error } = await admin
        .from('payments')
        .update({
          status: 'PAID_OUT',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment_id)

      if (error) throw error

      // 워커 입금 완료 알림
      if (payment.worker_id) {
        await admin.from('notifications').insert({
          user_id: payment.worker_id,
          title: '입금이 완료됐어요! 🎉',
          message: `${(payment.worker_payout ?? 0).toLocaleString()}원이 등록하신 계좌로 입금되었습니다.`,
          url: '/earnings',
          type: 'general',
          is_read: false,
        })
      }

      return NextResponse.json({ ok: true, action: 'paid_out', payment_id })
    }

    if (action === 'refund') {
      // HELD → REFUNDED + Toss 환불 API 호출
      if (payment.status !== 'HELD') {
        return NextResponse.json({ ok: false, error: `not_held (current: ${payment.status})` }, { status: 400 })
      }

      // Toss 환불 (pg_payment_key 있을 때만)
      if (payment.pg_payment_key) {
        const encKey = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')
        const tossRes = await fetch(
          `https://api.tosspayments.com/v1/payments/${payment.pg_payment_key}/cancel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${encKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cancelReason: reason || '관리자 직접 환불',
              cancelAmount: payment.gross_amount,
            }),
          },
        )
        if (!tossRes.ok) {
          const tossErr = await tossRes.json().catch(() => ({}))
          console.error('[settle/refund] Toss cancel failed', tossErr)
          // Toss 실패해도 DB는 REFUNDED 처리
        }
      }

      const { error } = await admin
        .from('payments')
        .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
        .eq('id', payment_id)
      if (error) throw error

      // job CANCELED
      if (payment.job_id) {
        await admin
          .from('jobs')
          .update({ status: 'CANCELED', updated_at: new Date().toISOString() })
          .eq('id', payment.job_id)
      }

      // 워커 알림 (작업 취소)
      if (payment.worker_id) {
        await admin.from('notifications').insert({
          user_id: payment.worker_id,
          title: '작업이 취소되었습니다',
          message: '해당 작업이 관리자에 의해 취소되어 정산이 진행되지 않습니다.',
          url: '/earnings',
          type: 'general',
          is_read: false,
        })
      }

      return NextResponse.json({ ok: true, action: 'refunded', payment_id })
    }

    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  } catch (e) {
    console.error('[settle-payment]', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'internal' },
      { status: 500 },
    )
  }
}
