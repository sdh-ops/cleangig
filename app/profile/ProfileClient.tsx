'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Star,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  Banknote,
  BadgeCheck,
  Heart,
  User as UserIcon,
} from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import RoleSwitcher from '@/components/common/RoleSwitcher'
import { TIER_BENEFITS } from '@/lib/matching'
import { maskName } from '@/lib/utils'

type Profile = {
  id: string
  email?: string
  name: string
  phone?: string
  role: 'operator' | 'worker' | 'admin'
  can_operate?: boolean
  can_work?: boolean
  profile_image?: string | null
  tier?: 'STARTER' | 'SILVER' | 'GOLD' | 'MASTER'
  total_jobs?: number
  avg_rating?: number
  business_name?: string
  is_verified?: boolean
}

type Props = {
  profile: Profile
  totalCompletedJobs: number
}

export default function ProfileClient({ profile, totalCompletedJobs }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isWorker = profile.role === 'worker'
  const tier = profile.tier ?? 'STARTER'
  const tierInfo = TIER_BENEFITS[tier]

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="sseuksak-shell">
      <Header title="내 정보" sticky />

      <div className="flex-1 pb-28">
        <div className="px-5 pt-5 pb-6 bg-gradient-to-br from-brand to-brand-dark text-white relative overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-2xl overflow-hidden">
              {profile.profile_image ? (
                <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[20px] font-black">{profile.name}</h2>
                {profile.is_verified && (
                  <BadgeCheck size={18} className="text-sun" fill="#FFB800" stroke="#0A1F3D" strokeWidth={2} />
                )}
              </div>
              {isWorker && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {tierInfo.label}
                  </span>
                  <span className="flex items-center gap-0.5 text-white/90 text-[12.5px] font-bold">
                    <Star size={12} className="text-sun" fill="currentColor" />
                    {(profile.avg_rating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[12px] font-bold text-white/75">
                    · {profile.total_jobs ?? 0}건 완료
                  </span>
                </div>
              )}
              {!isWorker && profile.business_name && (
                <p className="text-[13px] font-bold text-white/85 mt-1">{profile.business_name}</p>
              )}
            </div>
          </div>

          {isWorker && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              <TinyStat label="완료 작업" value={`${totalCompletedJobs}건`} />
              <TinyStat label="평점" value={(profile.avg_rating ?? 0).toFixed(1)} />
              <TinyStat label="수수료 할인" value={`${Math.round(tierInfo.fee_discount * 100)}%`} />
            </div>
          )}
        </div>

        <div className="px-5 pt-5 flex flex-col gap-4">
          <RoleSwitcher
            userId={profile.id}
            currentRole={profile.role}
            canOperate={profile.can_operate}
            canWork={profile.can_work}
          />

          <section className="card overflow-hidden">
            <h3 className="px-4 pt-4 pb-2 text-[12px] font-black text-text-faint uppercase tracking-wide">기본 정보</h3>
            <RowLink
              href="/profile/edit"
              icon={<UserIcon size={17} />}
              label="이름 · 연락처"
              value={maskName(profile.name)}
            />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink
              href="/profile/verification"
              icon={<Shield size={17} />}
              label="본인 인증"
              value={profile.is_verified ? '완료' : '미인증'}
              badge={!profile.is_verified}
            />
            {isWorker && (
              <>
                <div className="mx-4 border-t border-line-soft" />
                <RowLink
                  href="/profile/bank"
                  icon={<Banknote size={17} />}
                  label="정산 계좌"
                  value="등록하기"
                />
              </>
            )}
          </section>

          <section className="card overflow-hidden">
            <h3 className="px-4 pt-4 pb-2 text-[12px] font-black text-text-faint uppercase tracking-wide">
              {isWorker ? '작업 설정' : '운영 도구'}
            </h3>
            {isWorker ? (
              <>
                <RowLink href="/profile/preferences" icon={<Bell size={17} />} label="작업 알림" value="설정" />
                <div className="mx-4 border-t border-line-soft" />
                <RowLink href="/earnings" icon={<Banknote size={17} />} label="수익 관리" value="보기" />
              </>
            ) : (
              <>
                <RowLink href="/spaces" icon={<UserIcon size={17} />} label="내 공간 관리" value="보기" />
                <div className="mx-4 border-t border-line-soft" />
                <RowLink href="/profile/favorites" icon={<Heart size={17} />} label="단골 작업자" value="관리" />
              </>
            )}
          </section>

          <section className="card overflow-hidden">
            <h3 className="px-4 pt-4 pb-2 text-[12px] font-black text-text-faint uppercase tracking-wide">고객지원</h3>
            <RowLink href="/support" icon={<HelpCircle size={17} />} label="1:1 문의" />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink href="/notices" icon={<FileText size={17} />} label="공지사항" />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink href="/terms" icon={<FileText size={17} />} label="이용약관" />
            <div className="mx-4 border-t border-line-soft" />
            <RowLink href="/privacy" icon={<FileText size={17} />} label="개인정보 처리방침" />
          </section>

          <button
            onClick={signOut}
            className="mt-2 text-[13px] font-bold text-text-muted hover:text-danger transition flex items-center justify-center gap-1.5 py-3"
          >
            <LogOut size={15} /> 로그아웃
          </button>

          <p className="text-center text-[10.5px] text-text-faint font-medium mt-1">쓱싹 v1.0 · Made in Seoul</p>
        </div>
      </div>

      <BottomNav role={isWorker ? 'worker' : 'operator'} />
    </div>
  )
}

function TinyStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center">
      <div className="text-[11px] font-bold text-white/70">{label}</div>
      <div className="text-[15px] font-black text-white mt-0.5">{value}</div>
    </div>
  )
}

function RowLink({
  href,
  icon,
  label,
  value,
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  value?: string
  badge?: boolean
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted active:scale-[0.99] transition">
      <div className="w-9 h-9 rounded-full bg-surface-muted text-text-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-[14px] font-extrabold text-ink">{label}</div>
      {badge && <span className="chip chip-danger !text-[10px] !px-2 !py-0">필요</span>}
      {value && <span className="text-[12.5px] font-bold text-text-soft">{value}</span>}
      <ChevronRight size={16} className="text-text-faint" />
    </Link>
  )
}
