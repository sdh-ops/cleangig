import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/admin'
import { LayoutDashboard, Users, Briefcase, AlertTriangle, Home, Shield, Settings } from 'lucide-react'
import Logo from '@/components/common/Logo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', user.id)
    .single()

  if (!profile || !isPlatformAdmin(profile.email, profile.role)) redirect('/')

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="w-[240px] bg-ink text-white flex-col hidden md:flex">
        <div className="px-5 py-6 border-b border-white/10">
          <Logo size="sm" tone="white" />
          <div className="mt-2 text-[11px] font-black text-brand-light tracking-wider uppercase">Admin Console</div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <AdminLink href="/admin" icon={<LayoutDashboard size={16} />} label="대시보드" />
          <AdminLink href="/admin/users" icon={<Users size={16} />} label="가입자 관리" />
          <AdminLink href="/admin/jobs" icon={<Briefcase size={16} />} label="청소 요청" />
          <AdminLink href="/admin/disputes" icon={<AlertTriangle size={16} />} label="분쟁 관리" tone="danger" />
          <AdminLink href="/admin/settings" icon={<Settings size={16} />} label="수수료 · 세율" />
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-white/70 hover:text-white rounded-lg hover:bg-white/5">
            <Home size={14} /> 메인으로 나가기
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-ink text-white flex items-center justify-between px-4 z-20 safe-top">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-brand-light" />
          <span className="font-black text-sm">쓱싹 Admin</span>
        </div>
        <Link href="/" className="text-[12px] font-bold text-white/80">메인 →</Link>
      </div>

      <main className="flex-1 md:pl-0 pt-14 md:pt-0 overflow-x-hidden">
        <div className="p-5 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

function AdminLink({ href, icon, label, tone }: { href: string; icon: React.ReactNode; label: string; tone?: 'danger' }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[13.5px] transition ${
        tone === 'danger' ? 'text-red-300 hover:bg-red-500/15' : 'text-white/85 hover:bg-white/8 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}
