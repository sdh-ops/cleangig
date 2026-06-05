import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  // Noto Sans KR Black (900) — 한글 렌더링용
  let fontData: ArrayBuffer | null = null
  try {
    // Google Fonts CSS에서 실제 woff2 URL 파싱
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    ).then(r => r.text())
    const match = css.match(/src: url\(([^)]+\.woff2)\)/)
    if (match) {
      fontData = await fetch(match[1]).then(r => r.arrayBuffer())
    }
  } catch { /* 폰트 없어도 fallback 렌더 */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
          borderRadius: 108,
          position: 'relative',
        }}
      >
        {/* 뒷쪽 글로우 원 */}
        <div
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: 180,
            background: 'rgba(255,255,255,0.09)',
            top: 76,
            left: 76,
            display: 'flex',
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            zIndex: 1,
          }}
        >
          {/* 쓱싹 텍스트 */}
          <span
            style={{
              fontSize: 192,
              fontWeight: 900,
              color: 'white',
              fontFamily: fontData ? 'NotoSansKR' : 'sans-serif',
              lineHeight: 1,
              letterSpacing: -6,
              textShadow: '0 4px 32px rgba(3,105,161,0.4)',
            }}
          >
            쓱싹
          </span>

          {/* 스파클 */}
          <span
            style={{
              fontSize: 64,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            ✦
          </span>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      fonts: fontData
        ? [{ name: 'NotoSansKR', data: fontData, weight: 900, style: 'normal' as const }]
        : [],
    }
  )
}
