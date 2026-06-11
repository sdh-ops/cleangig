'use client'

import Image from 'next/image'

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'wordmark'
  tone?: 'brand' | 'ink' | 'white'
}

const sizes = {
  sm: { img: 28, t: 'text-[18px]' },
  md: { img: 36, t: 'text-[22px]' },
  lg: { img: 48, t: 'text-[30px]' },
  xl: { img: 72, t: 'text-[44px]' },
} as const

export default function Logo({ size = 'md', variant = 'full', tone = 'brand' }: Props) {
  const s = sizes[size]
  const colorSub = tone === 'white' ? '#FFFFFF' : '#0A1F3D'

  const Mark = (
    <Image
      src="/appicon.png"
      alt="쓱싹 로고"
      width={s.img}
      height={s.img}
      style={{ borderRadius: s.img * 0.26, flexShrink: 0 }}
      priority
    />
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
      <span className="inline-flex items-center" style={{ color: colorSub }}>
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
