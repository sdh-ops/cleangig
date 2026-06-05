import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  let fontData: ArrayBuffer | null = null
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36' } }
    ).then(r => r.text())
    const woff2Url = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1]
    if (woff2Url) fontData = await fetch(woff2Url).then(r => r.arrayBuffer())
  } catch {}

  if (!fontData) {
    return new ImageResponse(
      (
        <div style={{
          width: 180, height: 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
          borderRadius: 40,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 72, lineHeight: 1 }}>✦</span>
            <span style={{
              fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.75)',
              fontFamily: 'sans-serif', letterSpacing: 2, marginTop: 2,
            }}>SSEUKSAK</span>
          </div>
        </div>
      ),
      { width: 180, height: 180 }
    )
  }

  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
        borderRadius: 40, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', width: 126, height: 126, borderRadius: 63,
          background: 'rgba(255,255,255,0.09)',
          top: 27, left: 27, display: 'flex',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, zIndex: 1 }}>
          <span style={{
            fontSize: 68, fontWeight: 900, color: 'white',
            fontFamily: 'NotoSansKR', lineHeight: 1, letterSpacing: -2,
            textShadow: '0 2px 12px rgba(3,105,161,0.4)',
          }}>쓱싹</span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)', lineHeight: 1, marginTop: 2 }}>✦</span>
        </div>
      </div>
    ),
    {
      width: 180, height: 180,
      fonts: [{ name: 'NotoSansKR', data: fontData, weight: 900, style: 'normal' as const }],
    }
  )
}
