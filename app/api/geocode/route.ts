import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // 인증: 로그인 사용자만 (네이버 지오코딩 쿼터 남용 방지)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const clientId = process.env.NAVER_GEOCODE_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_GEOCODE_CLIENT_SECRET || process.env.NAVER_MAP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    // Graceful fallback — return empty results rather than 500
    return NextResponse.json({
      addresses: [],
      meta: { totalCount: 0, page: 1, count: 0 },
      status: 'NO_CREDENTIALS',
    })
  }

  try {
    const response = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
        },
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('Naver geocode error:', response.status, body)
      return NextResponse.json({ addresses: [], error: 'upstream_failed' }, { status: 200 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ addresses: [], error: 'internal_error' }, { status: 200 })
  }
}
