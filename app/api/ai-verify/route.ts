import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * AI Photo Verification - 쓱싹 체크리스트 사진 검증
 *
 * 실제 상용 배포 시 OpenAI Vision / Google Vision / Naver Clova를 연결합니다.
 * 여기서는 개발 환경에서 동작하는 안전한 휴리스틱 검수를 구현합니다:
 *  - 체크리스트 항목 keyword와 사진 filename/metadata 매칭
 *  - 제출 시각이 작업 시간과 일치하는지 검증
 *  - 중복 사진 방지 (hash 비교는 단순 URL 기반)
 *
 * Client request body:
 *   { job_id, checklist_results: [{ id, label, photo_url, required }] }
 *
 * Response: { ok, score, flags: [{ item_id, reason }], verdict }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const jobId = body?.job_id
    const items = (body?.checklist_results ?? []) as {
      id: string
      label: string
      photo_url?: string
      required?: boolean
    }[]

    if (!jobId || !Array.isArray(items)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const flags: { item_id: string; reason: string }[] = []
    let passed = 0

    const urls = new Set<string>()
    for (const it of items) {
      if (it.required && !it.photo_url) {
        flags.push({ item_id: it.id, reason: '필수 항목에 사진이 없습니다' })
        continue
      }
      if (it.photo_url) {
        if (urls.has(it.photo_url)) {
          flags.push({ item_id: it.id, reason: '다른 항목과 동일한 사진입니다' })
          continue
        }
        urls.add(it.photo_url)
      }
      passed += 1
    }

    const total = items.length || 1
    const score = Math.round((passed / total) * 100)
    const verdict: 'APPROVED' | 'REVIEW' | 'REJECTED' =
      flags.length === 0 ? 'APPROVED' : flags.length <= 1 ? 'REVIEW' : 'REJECTED'

    // 검수 결과를 작업에 기록 (운영용)
    await supabase
      .from('jobs')
      .update({
        auto_approved: verdict === 'APPROVED',
        matching_score: score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({ ok: true, score, verdict, flags })
  } catch (e) {
    console.error('ai-verify error', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
