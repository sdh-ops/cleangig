import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const checks = [
  ['users',            'id,role,can_operate,can_work,resident_id_last,bank_account,tax_type,sparkle_score,phone'],
  ['spaces',           'id,operator_id,checklist_template,base_price,location'],
  ['jobs',             'id,status,worker_id,supply_shortages,price_breakdown,checklist_completed,auto_approved,recurring_config'],
  ['payments',         'id,job_id,worker_payout,host_fee,worker_fee,withholding_tax,worker_tax_type,escrow_released_at'],
  ['disputes',         'id,status,final_verdict,ai_verdict,evidence_urls'],
  ['notifications',    'id,is_read,url,title'],
  ['messages',         'id,job_id,is_read,content'],
  ['reviews',          'id,reviewee_id,rating_breakdown,is_public'],
  ['push_subscriptions','id,user_id,endpoint'],
  ['consents',         'id,user_id,kind,version'],
  ['platform_settings','id,key,value'],
  ['worker_locations', 'id,job_id,lat,lng'],
  ['favorite_partners','id,operator_id,worker_id'],
  ['tax_reports',      'id,worker_id,period'],
]

const results = []
for (const [tbl, cols] of checks) {
  const { error } = await sb.from(tbl).select(cols).limit(1)
  results.push({ table: tbl, status: error ? 'FAIL' : 'OK', error: error?.message || '' })
}

const pass = results.filter(r => r.status === 'OK')
const fail = results.filter(r => r.status === 'FAIL')

console.log('\n=== Supabase 스키마 체크 ===')
for (const r of results)
  console.log(`${r.status === 'OK' ? '✅' : '❌'} ${r.table.padEnd(20)} ${r.error || ''}`)

console.log(`\n통과: ${pass.length}/${results.length}`)
if (fail.length) {
  console.log('\n미적용 마이그레이션이 있거나 컬럼 없음:')
  fail.forEach(r => console.log(' -', r.table, ':', r.error))
}
