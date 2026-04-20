'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Bell } from 'lucide-react'
import Logo from './Logo'
import React from 'react'

type Props = {
  title?: string
  subtitle?: string
  showBack?: boolean
  showLogo?: boolean
  showBell?: boolean
  rightSlot?: React.ReactNode
  onBack?: () => void
  sticky?: boolean
  unreadCount?: number
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  showLogo = false,
  showBell = false,
  rightSlot,
  onBack,
  sticky = true,
  unreadCount = 0,
}: Props) {
  const router = useRouter()
  const handleBack = () => (onBack ? onBack() : router.back())

  return (
    <header
      className={`${sticky ? 'sticky top-0 z-20' : ''} glass border-b border-line-soft safe-top`}
    >
      <div className="flex items-center h-14 px-3">
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="뒤로가기"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-muted active:scale-95 transition"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {showLogo && !showBack && (
          <div className="pl-2">
            <Logo size="sm" variant="full" />
          </div>
        )}
        <div className="flex-1 px-2 min-w-0">
          {title && (
            <h1 className="text-[17px] font-extrabold text-ink leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-text-soft font-medium truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showBell && (
            <Link
              href="/notifications"
              aria-label="알림"
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-muted active:scale-95 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {rightSlot}
        </div>
      </div>
    </header>
  )
}
