import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * service_role 키를 사용하는 관리자 전용 Supabase 클라이언트 — RLS를 우회한다.
 *
 * ⚠️ 절대 클라이언트로 노출 금지. 호출 전에 반드시 앱 단에서 관리자 권한
 * (isPlatformAdmin)을 검증할 것. RLS를 무시하므로 인증 누락 시 전체 데이터 접근 가능.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('[supabase/admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
