import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Next.js 클라이언트 번들은 정적 분석으로 NEXT_PUBLIC_* 를 치환한다.
  // process.env[변수] 동적 접근은 클라이언트에서 undefined가 되므로 닷 표기 필수.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('[env] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 누락 — .env.local 확인')
  return createBrowserClient(url, key)
}
