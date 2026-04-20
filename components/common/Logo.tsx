import React from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'wordmark'
  tone?: 'brand' | 'ink' | 'white'
}

const sizes = {
  sm: { h: 28, t: 'text-[18px]' },
  md: { h: 36, t: 'text-[22px]' },
  lg: { h: 48, t: 'text-[30px]' },
  xl: { h: 72, t: 'text-[44px]' },
} as const

export default function Logo({ size = 'md', variant = 'full', tone = 'brand' }: Props) {
  const s = sizes[size]
  const colorMain = tone === 'white' ? '#FFFFFF' : tone === 'ink' ? '#0A1F3D' : '#00C896'
  const colorSub = tone === 'white' ? '#FFFFFF' : tone === 'ink' ? '#0A1F3D' : '#0A1F3D'

  const Mark = (
    <svg
      width={s.h}
      height={s.h}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="쓱싹 로고"
    >
      <defs>
        <linearGradient id="sk-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00C896" />
          <stop offset="100%" stopColor="#00A079" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sk-grad)" />
      {/* Swoosh lines - 쓱싹 */}
      <path
        d="M10 30 Q 18 18, 28 22 T 40 18"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      <path
        d="M10 36 Q 20 28, 32 30 T 40 26"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />
      <circle cx="40" cy="18" r="2.2" fill="#FFD447" />
    </svg>
  )

  if (variant === 'icon') return Mark

  const wordmark = (
    <span
      className={`${s.t} font-black tracking-tight`}
      style={{ color: colorSub, fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.045em' }}
    >
      쓱싹
    </span>
  )

  if (variant === 'wordmark') {
    return (
      <span className="inline-flex items-center" style={{ color: colorMain }}>
        {wordmark}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      {Mark}
      {wordmark}
    </span>
  )
}
