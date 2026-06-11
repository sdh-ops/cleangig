/**
 * 인앱 알림 헬퍼 (클라이언트 사이드)
 * 서버사이드 라우트에서는 supabase client를 직접 사용하세요.
 */
import { createClient } from '@/lib/supabase/client'

export type NotificationType =
  | 'job_assigned'
  | 'job_canceled'
  | 'job_en_route'
  | 'job_arrived'
  | 'job_in_progress'
  | 'job_submitted'
  | 'job_approved'
  | 'extra_charge_requested'
  | 'extra_charge_approved'
  | 'extra_charge_rejected'
  | 'supply_shortage'
  | 'review_received'
  | 'deposit_charged'
  | 'general'

export interface NotifyParams {
  userId: string
  title: string
  message: string
  url?: string
  type?: NotificationType
}

/**
 * 특정 사용자에게 인앱 알림을 발송합니다.
 * notifications 테이블에 레코드를 INSERT합니다.
 */
export async function notify({
  userId,
  title,
  message,
  url,
  type = 'general',
}: NotifyParams): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      url: url ?? null,
      type,
      is_read: false,
    })
  } catch {
    // 알림 실패는 조용히 처리 — 주 기능에 영향 없음
  }

  // Web Push 릴레이 (서버 전용 VAPID 발송) — fire-and-forget, UX 블로킹 없음
  fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title, message, url, type }),
  }).catch(() => {})
}
