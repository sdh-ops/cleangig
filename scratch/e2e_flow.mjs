// 실제 Supabase에 대고 작업 라이프사이클 전 구간을 검증하는 e2e 스크립트.
// 결제(보류)는 제외. operator/worker 테스트 계정을 만들어 RLS 포함 실증한다.
// 실행: node scratch/e2e_flow.mjs   (cleangig 디렉터리에서)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// .env.local 파싱
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ts = Date.now()
const results = []
const step = async (name, fn) => {
  try { const r = await fn(); results.push([name, 'PASS', r ?? '']); return r }
  catch (e) { results.push([name, 'FAIL', e?.message || String(e)]); throw e }
}
const mk = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

let opId, wkId, spaceId, jobId
const op = mk(), wk = mk()

try {
  // 1. 회원가입 (이메일 확인 OFF여야 세션 즉시 발급)
  await step('operator signUp', async () => {
    const { data, error } = await op.auth.signUp({ email: `e2e.op.${ts}@sseuksak-e2e.dev`, password: 'Test1234!' })
    if (error) throw error
    if (!data.session) throw new Error('세션 없음 → Supabase 이메일 확인(Confirm email)이 켜져 있음. 끄거나 기존계정 사용 필요')
    opId = data.user.id
    return opId.slice(0, 8)
  })
  await step('worker signUp', async () => {
    const { data, error } = await wk.auth.signUp({ email: `e2e.wk.${ts}@sseuksak-e2e.dev`, password: 'Test1234!' })
    if (error) throw error
    if (!data.session) throw new Error('세션 없음 → 이메일 확인 켜짐')
    wkId = data.user.id
    return wkId.slice(0, 8)
  })

  // 2. 프로필 생성 (users_insert_self: auth.uid()=id)
  await step('operator 프로필 insert', async () => {
    const { error } = await op.from('users').insert({ id: opId, email: `e2e.op.${ts}@sseuksak-e2e.dev`, name: 'E2E운영자', role: 'operator', is_active: true, is_verified: false })
    if (error) throw error
  })
  await step('worker 프로필 insert', async () => {
    const { error } = await wk.from('users').insert({ id: wkId, email: `e2e.wk.${ts}@sseuksak-e2e.dev`, name: 'E2E워커', role: 'worker', is_active: true, is_verified: false })
    if (error) throw error
  })

  // 3. 공간 등록 (operator)
  await step('공간 등록', async () => {
    const { data, error } = await op.from('spaces').insert({
      operator_id: opId, name: `[E2E]테스트공간${ts}`, type: 'partyroom', address: '서울시 강남구 테스트로 1',
      base_price: 40000, estimated_duration: 90, cleaning_difficulty: '보통', checklist_template: [], photos: [], is_active: true,
    }).select('id').single()
    if (error) throw error
    spaceId = data.id; return spaceId.slice(0, 8)
  })

  // 4. 청소 요청 생성 (OPEN)
  await step('청소 요청 생성(OPEN)', async () => {
    const { data, error } = await op.from('jobs').insert({
      space_id: spaceId, operator_id: opId, status: 'OPEN',
      scheduled_at: new Date(Date.now() + 3600e3).toISOString(), estimated_duration: 90,
      price: 40000, checklist: [], is_urgent: false, is_recurring: false, auto_approved: false,
    }).select('id').single()
    if (error) throw error
    jobId = data.id; return jobId.slice(0, 8)
  })

  // 5. 워커가 OPEN 작업 조회 (jobs_select: OPEN 공개)
  await step('워커 OPEN 작업 조회', async () => {
    const { data, error } = await wk.from('jobs').select('id, status').eq('id', jobId).single()
    if (error) throw error
    if (data.status !== 'OPEN') throw new Error('OPEN 아님')
  })

  // 6. 워커 수락 (조건부 update + select → 1행이어야)
  await step('워커 수락(경합방지)', async () => {
    const { data, error } = await wk.from('jobs')
      .update({ worker_id: wkId, status: 'ASSIGNED', updated_at: new Date().toISOString() })
      .eq('id', jobId).eq('status', 'OPEN').select('id')
    if (error) throw error
    if (!data || data.length !== 1) throw new Error(`수락 0행 — RLS가 막거나 이미 선점 (rows=${data?.length})`)
  })

  // 7. 상태 전이 ASSIGNED→EN_ROUTE→ARRIVED→IN_PROGRESS→SUBMITTED
  for (const next of ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED']) {
    await step(`상태 전이 → ${next}`, async () => {
      const patch = { status: next, updated_at: new Date().toISOString() }
      if (next === 'IN_PROGRESS') patch.started_at = new Date().toISOString()
      if (next === 'SUBMITTED') { patch.completed_at = new Date().toISOString(); patch.checklist_completed = [] }
      const { data, error } = await wk.from('jobs').update(patch).eq('id', jobId).select('id')
      if (error) throw error
      if (!data?.length) throw new Error('0행 — RLS 차단 가능')
    })
  }

  // 8. operator 승인 (SUBMITTED→APPROVED)
  await step('operator 승인(→APPROVED)', async () => {
    const { data, error } = await op.from('jobs').update({ status: 'APPROVED', updated_at: new Date().toISOString() }).eq('id', jobId).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('0행 — RLS 차단')
  })

  // 9. operator → worker 리뷰 (avg_rating 트리거 작동 확인)
  await step('리뷰 등록(트리거)', async () => {
    const { error } = await op.from('reviews').insert({ job_id: jobId, reviewer_id: opId, reviewee_id: wkId, rating: 5, rating_breakdown: { cleanliness: 5, communication: 5, punctuality: 5 }, is_public: true })
    if (error) throw error
  })
  await step('워커 avg_rating 갱신 확인', async () => {
    const { data, error } = await wk.from('users').select('avg_rating').eq('id', wkId).single()
    if (error) throw error
    return `avg_rating=${data.avg_rating}`
  })

} catch { /* 실패해도 아래 리포트 출력 */ }

// 정리 시도 (RLS상 가능한 것만)
try { if (jobId) await op.from('jobs').delete().eq('id', jobId) } catch {}
try { if (spaceId) await op.from('spaces').delete().eq('id', spaceId) } catch {}

console.log('\n================ E2E 결과 ================')
for (const [n, s, d] of results) console.log(`${s === 'PASS' ? '✅' : '❌'} ${s.padEnd(4)} ${n}${d ? '  · ' + d : ''}`)
const pass = results.filter((r) => r[1] === 'PASS').length
console.log(`\n${pass}/${results.length} 통과`)
console.log('남은 테스트 데이터: users 2건(opId/wkId, 삭제는 service_role 필요), 그 외 정리 시도함')
process.exit(results.some((r) => r[1] === 'FAIL') ? 1 : 0)
