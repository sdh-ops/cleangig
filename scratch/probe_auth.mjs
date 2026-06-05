import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const ts = Date.now()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// 임시 유저 만들어 인증
const { data: su } = await sb.auth.signUp({ email: `probe.${ts}@gmail.com`, password: 'Test1234!' })
const uid = su?.user?.id
if (!uid) { console.log('signUp 실패'); process.exit(1) }

// users 프로필
await sb.from('users').insert({ id: uid, email: `probe.${ts}@gmail.com`, name: 'Probe', role: 'operator', is_active: true, is_verified: false })

const base = {
  operator_id: uid, name: 'probe', type: 'partyroom', address: 'test',
  base_price: 1000, estimated_duration: 60,
  checklist_template: [], photos: [], is_active: true,
}

// cleaning_difficulty 없이 시도 (null)
const { error: nullErr } = await sb.from('spaces').insert({ ...base, cleaning_difficulty: null }).select('id')
console.log(`null:   ${nullErr ? '❌ ' + nullErr.message.slice(0,80) : '✅ OK'}`)

// 값 탐색
const vals = ['NORMAL','normal','EASY','easy','HARD','hard','MEDIUM','medium',
               'LOW','low','HIGH','high','STANDARD','standard','1','2','3',
               '쉬움','보통','어려움','일반']
for (const v of vals) {
  const { error: e } = await sb.from('spaces').insert({ ...base, cleaning_difficulty: v }).select('id')
  const label = e?.message?.includes('cleaning_difficulty_check') ? '❌ constraint'
    : e ? `✅ valid (err: ${e.message.slice(0,60)})`
    : '✅ inserted!'
  console.log(`"${v}": ${label}`)
}
process.exit(0)
