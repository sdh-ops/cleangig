'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MapPinned, User, Wallet, Building2, Calendar } from 'lucide-react'

type Role = 'operator' | 'worker'
type Tab = { href: string; label: string; icon: React.ElementType; match: (p: string) => boolean }

const OPERATOR_TABS: Tab[] = [
  { href: '/dashboard', label: '홈', icon: Home, match: (p) => p === '/dashboard' },
  { href: '/spaces', label: '공간', icon: Building2, match: (p) => p.startsWith('/spaces') },
  { href: '/calendar', label: '캘린더', icon: Calendar, match: (p) => p.startsWith('/calendar') },
  { href: '/requests', label: '요청', icon: Briefcase, match: (p) => p.startsWith('/requests') },
  { href: '/profile', label: '내정보', icon: User, match: (p) => p.startsWith('/profile') },
]

const WORKER_TABS: Tab[] = [
  { href: '/clean', label: '홈', icon: Home, match: (p) => p === '/clean' },
  { href: '/clean/jobs', label: '작업찾기', icon: MapPinned, match: (p) => p.startsWith('/clean/jobs') && !p.includes('/active') },
  { href: '/calendar', label: '캘린더', icon: Calendar, match: (p) => p.startsWith('/calendar') },
  { href: '/earnings', label: '수익', icon: Wallet, match: (p) => p.startsWith('/earnings') },
  { href: '/profile', label: '내정보', icon: User, match: (p) => p.startsWith('/profile') },
]

// TODO: Add a dedicated Chat tab to BottomNav for both operator and worker roles.
// Currently chat is only accessible from job detail pages (complex architectural change — skipped for now).
export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname() || ''
  const tabs = role === 'operator' ? OPERATOR_TABS : WORKER_TABS

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 glass border-t border-line-soft"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="메인 탭"
    >
      <div className="mx-auto max-w-[480px]">
        <ul className="flex items-stretch">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = t.match(pathname)
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  className={`flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 flex-1 w-full transition-colors relative ${
                    active ? 'text-brand-dark' : 'text-text-faint'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active pill indicator */}
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand"
                    />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? 'text-brand-dark' : 'text-text-faint'}
                  />
                  <span
                    className={`text-[10.5px] tracking-tight font-bold transition-all ${
                      active ? 'text-brand-dark' : 'text-text-faint'
                    }`}
                  >
                    {t.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
