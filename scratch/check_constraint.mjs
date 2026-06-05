import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// check_information_schema를 통해 제약 내용 확인
// 직접 각 값 시도
const testValues = ['NORMAL', 'normal', 'EASY', 'easy', 'HARD', 'hard', 'MEDIUM', 'medium', 'LOW', 'STANDARD', 'standard']
console.log('cleaning_difficulty 허용값 탐색...')
for (const v of testValues) {
  const { error: e } = await sb.from('spaces').insert({
    operator_id: '00000000-0000-0000-0000-000000000000',
    name: 'test', type: 'partyroom', address: 'test', base_price: 1000,
    estimated_duration: 60, cleaning_difficulty: v,
    checklist_template: [], photos: [], is_active: true
  }).select('id')
  // RLS가 막거나 다른 에러면 cleaning_difficulty 자체는 OK, constraint 에러면 NG
  const isConstraintError = e?.message?.includes('cleaning_difficulty_check')
  const isOtherError = e && !isConstraintError
  console.log(`  "${v}": ${isConstraintError ? '❌ constraint 위반' : isOtherError ? `✅ OK (다른 에러: ${e.message.slice(0,60)})` : '✅ OK (insert 성공)'}`)
}
