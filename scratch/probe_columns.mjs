import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// job_status_logs 실제 컬럼 확인
// anon으로 select * limit 0 → 컬럼명 에러 메시지에서 파악
const { data, error } = await sb.from('job_status_logs').select('*').limit(0)
if (error) {
  console.log('에러:', error.message)
} else {
  console.log('컬럼 확인 OK, 결과:', JSON.stringify(data))
}

// 직접 각 컬럼 존재 확인
for (const col of ['id','job_id','from_status','to_status','actor_id','changed_by','meta','created_at','changed_at','note']) {
  const { error: e } = await sb.from('job_status_logs').select(col).limit(1)
  console.log(`  ${col}: ${e ? '❌ ' + e.message.slice(0,60) : '✅ 존재'}`)
}
