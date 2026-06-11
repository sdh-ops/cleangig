/**
 * 서버 API Route 전용 설정 헬퍼.
 * 'use client' 모듈(settings.ts)과 분리 — admin client는 서버에서만 사용 가능.
 */
import { createAdminClient } from './supabase/admin'
import { DEFAULT_FEES, type FeeSettings } from './pricing'

/**
 * API Route에서 platform_settings DB를 직접 읽어 수수료 설정 반환.
 * 캐시 없음 — 서버리스 함수는 인스턴스가 매번 달라질 수 있음.
 */
export async function getFeeSettingsServer(): Promise<FeeSettings> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'fees')
      .maybeSingle()
    if (data?.value) {
      return { ...DEFAULT_FEES, ...(data.value as Partial<FeeSettings>) }
    }
  } catch {
    // DB 오류 시 기본값 사용
  }
  return DEFAULT_FEES
}
