import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/admin'
import {
  LayoutDashboard, Users, Briefcase, AlertTriangle,
  Home, Shield, Settings, ChevronRight, Wallet, ShieldCheck,
} from 'lucide-react'
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

  // 즉시 처리 필요 카운트 (분쟁 + 검수대기 + 정산 이체 필요 + 인증 심사)
  const [disputeRes, submittedRes, releasedRes, pendingVerifyRes] = await Promise.all([
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'RELEASED'),
    supabase.from('users').select('biz_reg_image, preferences').eq('is_verified', false).limit(500),
  ])
  // 인증 심사 대기 = 미인증 + 서류 제출 + 미반려 (JS 필터 — JSON OR 조건 PostgREST 한계 회피)
  const verifyCount = ((pendingVerifyRes.data || []) as any[]).filter((u) => {
    const prefs = u.preferences || {}
    if (prefs.verification_status === 'rejected') return false
    return !!u.biz_reg_image || !!prefs.verification_doc_url
  }).length
  const urgentCount = (disputeRes.count ?? 0) + (submittedRes.count ?? 0) + verifyCount
  const releasedCount = releasedRes.count ?? 0

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      {/* ── 데스크탑 사이드바 */}
      <aside className="w-[220px] bg-[#0F172A] text-white flex-col hidden md:flex fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-5 border-b border-white/8">
          <Logo size="sm" tone="white" />
          <div className="mt-1.5 text-[13px] font-black text-sky-400 tracking-[0.15em] uppercase">운영 콘솔</div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <p className="px-3 pt-1 pb-2 text-[13px] font-black text-white/30 uppercase tracking-widest">현황</p>
          <SideLink href="/admin" icon={<LayoutDashboard size={15} />} label="대시보드" />
          <SideLink
            href="/admin/jobs"
            icon={<Briefcase size={15} />}
            label="작업 관리"
            badge={submittedRes.count ?? 0}
            badgeTone="warning"
          />
          <SideLink
            href="/admin/disputes"
            icon={<AlertTriangle size={15} />}
            label="분쟁 처리"
            badge={disputeRes.count ?? 0}
            badgeTone="danger"
          />

          <p className="px-3 pt-4 pb-2 text-[13px] font-black text-white/30 uppercase tracking-widest">관리</p>
          <SideLink
            href="/admin/verifications"
            icon={<ShieldCheck size={15} />}
            label="인증 심사"
            badge={verifyCount}
            badgeTone="warning"
          />
          <SideLink href="/admin/users" icon={<Users size={15} />} label="회원 관리" />
          <SideLink
            href="/admin/settlements"
            icon={<Wallet size={15} />}
            label="정산 관리"
            badge={releasedCount}
            badgeTone="warning"
          />
          <SideLink href="/admin/settings" icon={<Settings size={15} />} label="수수료·세율" />
        </nav>

        <div className="p-3 border-t border-white/8 space-y-1">
          {urgentCount > 0 && (
            <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/20">
              <p className="text-[13.5px] font-black text-red-300">⚠ 즉시 처리 {urgentCount}건</p>
            </div>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-[14.5px] font-bold text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <Home size={13} /> 앱으로 나가기
          </Link>
        </div>
      </aside>

      {/* ── 모바일 상단바 */}
      <div className="md:hidden fixed top-0 inset-x-0 h-13 bg-[#0F172A] text-white flex items-center justify-between px-4 z-20 safe-top">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-sky-400" />
          <span className="font-black text-[15px]">쓱싹 운영</span>
        </div>
        <div className="flex items-center gap-3">
          {urgentCount > 0 && (
            <Link href="/admin/disputes" className="relative">
              <AlertTriangle size={18} className="text-red-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
                {urgentCount}
              </span>
            </Link>
          )}
          <Link href="/" className="text-[14.5px] font-bold text-white/60">앱 →</Link>
        </div>
      </div>

      {/* ── 모바일 하단 탭 */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0F172A] border-t border-white/8 flex items-center z-20 safe-bottom">
        <MobileTab href="/admin" icon={<LayoutDashboard size={20} />} label="대시보드" />
        <MobileTab href="/admin/jobs" icon={<Briefcase size={20} />} label="작업" badge={submittedRes.count ?? 0} />
        <MobileTab href="/admin/disputes" icon={<AlertTriangle size={20} />} label="분쟁" badge={disputeRes.count ?? 0} danger />
        <MobileTab href="/admin/settlements" icon={<Wallet size={20} />} label="정산" badge={releasedCount} />
        <MobileTab href="/admin/users" icon={<Users size={20} />} label="회원" />
      </nav>

      {/* ── 메인 컨텐츠 */}
      <main className="flex-1 md:ml-[220px] pt-13 md:pt-0 pb-16 md:pb-0 overflow-x-hidden">
        <div className="p-4 md:p-7 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

function SideLink({
  href, icon, label, badge, badgeTone,
}: {
  href: string; icon: React.ReactNode; label: string
  badge?: number; badgeTone?: 'danger' | 'warning'
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[15px] text-white/75 hover:bg-white/8 hover:text-white transition group"
    >
      <span className="text-white/50 group-hover:text-white/80 transition">{icon}</span>
      <span className="flex-1">{label}</span>
      {!!badge && badge > 0 && (
        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[13px] font-black flex items-center justify-center
          ${badgeTone === 'danger' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'}`}>
          {badge}
        </span>
      )}
    </Link>
  )
}

function MobileTab({
  href, icon, label, badge, danger,
}: {
  href: string; icon: React.ReactNode; label: string; badge?: number; danger?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white/50 hover:text-white transition relative"
    >
      <span className={danger && (badge ?? 0) > 0 ? 'text-red-400' : ''}>{icon}</span>
      <span className="text-[13px] font-bold">{label}</span>
      {!!badge && badge > 0 && (
        <span className={`absolute top-2 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-full text-[11px] font-black flex items-center justify-center
          ${danger ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'}`}>
          {badge}
        </span>
      )}
    </Link>
  )
}
