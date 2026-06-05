import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  let fontData: ArrayBuffer | null = null
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    ).then(r => r.text())
    const match = css.match(/src: url\(([^)]+\.woff2)\)/)
    if (match) {
      fontData = await fetch(match[1]).then(r => r.arrayBuffer())
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
          borderRadius: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 124,
            height: 124,
            borderRadius: 62,
            background: 'rgba(255,255,255,0.09)',
            top: 28,
            left: 28,
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: 'white',
              fontFamily: fontData ? 'NotoSansKR' : 'sans-serif',
              lineHeight: 1,
              letterSpacing: -2,
              textShadow: '0 2px 12px rgba(3,105,161,0.4)',
            }}
          >
            쓱싹
          </span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', lineHeight: 1, marginTop: 3 }}>
            ✦
          </span>
        </div>
      </div>
    ),
    {
      width: 180,
      height: 180,
      fonts: fontData
        ? [{ name: 'NotoSansKR', data: fontData, weight: 900, style: 'normal' as const }]
        : [],
    }
  )
}
