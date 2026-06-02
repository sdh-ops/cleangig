import { createBrowserClient } from '@supabase/ssr'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`[env] 필수 환경변수 누락: ${name} — .env.local 설정을 확인하세요`)
  return v
}

export function createClient() {
  return createBrowserClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}
