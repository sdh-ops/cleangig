import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const accounts = [
  { email: 'operator@sseuksak-test.com', password: 'Sseuksak1234!', role: 'operator', name: '테스트운영자', can_operate: true, can_work: false },
  { email: 'worker@sseuksak-test.com',   password: 'Sseuksak1234!', role: 'worker',   name: '테스트워커',   can_operate: false, can_work: true, phone2: true },
]

for (const acc of accounts) {
  // 이미 있으면 signIn으로 확인, 없으면 signUp
  let userId
  const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email: acc.email, password: acc.password })
  if (si?.user) {
    userId = si.user.id
    console.log(`✅ 기존 계정 존재: ${acc.email}`)
  } else {
    const { data: su, error: suErr } = await sb.auth.signUp({ email: acc.email, password: acc.password })
    if (suErr) { console.log(`❌ signUp 실패 (${acc.email}): ${suErr.message}`); continue }
    if (!su.session) { console.log(`❌ 세션 없음 — Confirm email 켜져 있음`); continue }
    userId = su.user.id
    console.log(`✅ 신규 생성: ${acc.email}`)
  }

  // users 프로필 upsert
  const { error: pe } = await sb.from('users').upsert({
    id: userId, email: acc.email, name: acc.name, role: acc.role,
    can_operate: acc.can_operate, can_work: acc.can_work,
    is_active: true, is_verified: false,
    phone: acc.phone2 ? '010-1111-1111' : '010-0000-0000',
  }, { onConflict: 'id' })
  if (pe) console.log(`  ⚠️ 프로필 upsert: ${pe.message}`)
  else console.log(`  ✅ 프로필 저장 완료`)
}

console.log('\n=== 테스트 계정 ===')
console.log('공간파트너: operator@sseuksak-test.com / Sseuksak1234!')
console.log('청소파트너: worker@sseuksak-test.com / Sseuksak1234!')
