'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Loader2, User as UserIcon, Phone } from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/common/Logo'

type Role = 'operator' | 'worker'
type Step = 'role' | 'profile' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeLocation, setAgreeLocation] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUserEmail(user.email ?? null)
      // Pre-fill from user metadata
      const meta = user.user_metadata || {}
      if (meta.name) setName(meta.name)
      else if (meta.full_name) setName(meta.full_name)
      if (meta.phone) setPhone(meta.phone)
      // 프로필이 완성(role + 연락처)된 경우에만 redirect.
      // OAuth 신규 가입은 callback이 role만 미리 넣으므로, phone 없으면 폼을 계속 보여준다.
      const { data: profile } = await supabase.from('users').select('role, name, phone').eq('id', user.id).single()
      if (profile?.role && profile?.phone) {
        if (profile.role === 'operator') router.replace('/dashboard')
        else if (profile.role === 'worker') router.replace('/clean')
        else router.replace('/dashboard')
        return
      }
      // 미완성 프로필: 기존 role 있으면 선택 단계 프리필
      if (profile?.role === 'operator' || profile?.role === 'worker') setSelectedRole(profile.role)
      if (profile?.name && !name) setName(profile.name)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRoleNext = () => {
    if (!selectedRole) return
    setStep('profile')
  }

  const handleSubmit = async () => {
    if (!selectedRole || !name.trim() || !phone.trim()) {
      setErr('이름과 연락처를 입력해주세요.')
      return
    }
    if (!agreeTerms || !agreePrivacy) {
      setErr('이용약관 및 개인정보 처리방침에 동의해야 서비스를 이용할 수 있습니다.')
      return
    }
    if (selectedRole === 'worker' && !agreeLocation) {
      setErr('위치정보 수집에 동의해야 클린파트너로 활동할 수 있습니다.')
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 정보가 없습니다.')

      const payload = {
        id: user.id,
        email: user.email,
        name: name.trim(),
        phone: phone.trim(),
        role: selectedRole,
        can_operate: selectedRole === 'operator',
        can_work: selectedRole === 'worker',
        business_name: selectedRole === 'operator' ? businessName.trim() || null : null,
        is_active: true,
        is_verified: false,
        updated_at: new Date().toISOString(),
      }
      // upsert
      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
      if (error) throw error

      setStep('done')
      setTimeout(() => {
        if (selectedRole === 'operator') router.push('/dashboard')
        else router.push('/clean')
      }, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '가입 처리 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="sseuksak-shell">
      <header className="flex items-center h-14 px-3 safe-top">
        <button
          onClick={() => {
            if (step === 'profile') setStep('role')
            else router.back()
          }}
          aria-label="뒤로가기"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-muted active:scale-95 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1" />
        <div
          className="flex items-center gap-1.5 pr-2"
          aria-label={`3단계 중 ${step === 'role' ? 1 : step === 'profile' ? 2 : 3}단계`}
        >
          <div className={`h-1.5 w-6 rounded-full ${step === 'role' ? 'bg-brand' : 'bg-line'}`} />
          <div className={`h-1.5 w-6 rounded-full ${step === 'profile' ? 'bg-brand' : 'bg-line'}`} />
          <div className={`h-1.5 w-6 rounded-full ${step === 'done' ? 'bg-brand' : 'bg-line'}`} />
        </div>
      </header>

      {step === 'role' && (
        <div className="flex-1 flex flex-col px-6 pt-4">
          <h1 className="h-hero text-ink">
            공간 청소를 맡기거나,
            <br />
            청소로 부수입 만드세요.
          </h1>
          <p className="t-body text-text-muted mt-3">
            공간파트너·클린파트너 — 쓱싹이 연결해드립니다.
          </p>

          <div className="flex flex-col gap-3 mt-8 flex-1">
            <RoleCard
              selected={selectedRole === 'worker'}
              onClick={() => setSelectedRole('worker')}
              icon={<Sparkles size={28} strokeWidth={2.2} />}
              title="클린파트너"
              subtitle="청소로 부업 수익"
              description="원하는 시간·지역에서 청소 작업을 골라 수행하고 주 1회 정산받아요."
              tags={['자유 근무', '주 1회 정산', '티어 승급']}
            />
            <RoleCard
              selected={selectedRole === 'operator'}
              onClick={() => setSelectedRole('operator')}
              icon={<Building2 size={28} strokeWidth={2.2} />}
              title="공간파트너"
              subtitle="청소 맡기기"
              description="파티룸·에어비앤비·무인매장을 운영하며 청소를 원클릭으로 맡기고 싶어요."
              tags={['원클릭 요청', '안전 결제', 'AI 품질 확인']}
            />
          </div>

          {/* 역할 선택에 따른 수수료/조건 고지 */}
          {selectedRole === 'worker' && (
            <div
              className="mx-0 mt-2 mb-1 rounded-2xl p-4"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}
            >
              <p className="text-[14.5px] font-black text-sky-800 mb-2">클린파트너 수수료 안내</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  '처음엔 수수료 14%(스타터), 실적 쌓으면 최대 8%까지 낮아져요.',
                  '일한 돈은 떼일 걱정 없이 100% 지급돼요.',
                  '첫 작업 시 보증금 5,000원 차감 (활동 종료 시 전액 환불).',
                ].map((t) => (
                  <li key={t} className="text-[13.5px] font-semibold text-sky-900 flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5 text-sky-500">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedRole === 'operator' && (
            <div
              className="mx-0 mt-2 mb-1 rounded-2xl p-4"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)' }}
            >
              <p className="text-[14.5px] font-black text-sky-800 mb-2">공간파트너 수수료 안내</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  '결제 금액의 5%만 플랫폼 수수료로 청구됩니다.',
                  '결제금 안전 보관 — 완료 확인 전까지 결제 보관.',
                  '미출근·품질 미달 시 환불 보장.',
                ].map((t) => (
                  <li key={t} className="text-[13.5px] font-semibold text-sky-900 flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5 text-sky-500">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="py-5 safe-bottom">
            <button
              onClick={handleRoleNext}
              disabled={!selectedRole}
              className="btn btn-primary w-full"
            >
              다음
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 'profile' && (
        <div className="flex-1 flex flex-col px-6 pt-4">
          <h1 className="h-hero text-ink">
            거의 다 왔어요.
            <br />
            간단히 알려주세요.
          </h1>
          <p className="t-body text-text-muted mt-3">
            {userEmail && <span className="font-bold text-ink">{userEmail}</span>} 계정으로 가입합니다.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="onboarding-name" className="t-meta block mb-2 ml-1">이름</label>
              <div className="relative">
                <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  id="onboarding-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="input pl-11"
                />
              </div>
            </div>
            <div>
              <label htmlFor="onboarding-phone" className="t-meta block mb-2 ml-1">연락처</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  id="onboarding-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9\-+]/g, ''))}
                  placeholder="010-0000-0000"
                  className="input pl-11"
                  inputMode="tel"
                />
              </div>
            </div>
            {selectedRole === 'operator' && (
              <div>
                <label htmlFor="onboarding-business-name" className="t-meta block mb-2 ml-1">사업체명 <span className="text-text-faint font-normal">(선택)</span></label>
                <input
                  id="onboarding-business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="예) 홍대파티룸"
                  className="input"
                />
              </div>
            )}
          </div>

          {/* 동의 섹션 */}
          <div className="mt-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="agreeAll"
                checked={agreeTerms && agreePrivacy && agreeLocation && agreeMarketing}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked)
                  setAgreePrivacy(e.target.checked)
                  setAgreeLocation(e.target.checked)
                  setAgreeMarketing(e.target.checked)
                }}
                className="w-5 h-5 rounded-md accent-brand cursor-pointer"
              />
              <label htmlFor="agreeAll" className="text-[14px] font-extrabold text-ink cursor-pointer">
                전체 동의
              </label>
            </div>
            <div className="h-px bg-line-soft" />
            <ConsentRow
              id="agreeTerms"
              checked={agreeTerms}
              onChange={setAgreeTerms}
              required
              label="이용약관"
              href="/terms"
            />
            <ConsentRow
              id="agreePrivacy"
              checked={agreePrivacy}
              onChange={setAgreePrivacy}
              required
              label="개인정보 처리방침"
              href="/privacy"
            />
            <ConsentRow
              id="agreeLocation"
              checked={agreeLocation}
              onChange={setAgreeLocation}
              required={selectedRole === 'worker'}
              label={selectedRole === 'worker' ? '위치정보 수집 이용 (필수 — 도착 확인)' : '위치정보 수집 이용 (선택)'}
            />
            <ConsentRow
              id="agreeMarketing"
              checked={agreeMarketing}
              onChange={setAgreeMarketing}
              required={false}
              label="마케팅 정보 수신 (선택 — 할인·이벤트 알림)"
            />
          </div>

          {err && <p className="mt-4 text-[15px] font-bold text-danger">{err}</p>}

          <div className="mt-auto py-5 safe-bottom">
            <button onClick={handleSubmit} disabled={loading || !name.trim() || !phone.trim()} className="btn btn-primary w-full">
              {loading ? <Loader2 size={20} className="animate-spin" /> : '쓱싹 시작하기'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand-softer flex items-center justify-center mb-6">
            <CheckCircle2 size={52} className="text-brand-dark" strokeWidth={2.5} />
          </div>
          <h2 className="h-hero text-ink">가입 완료!</h2>
          <p className="t-body text-text-muted mt-3">
            곧 {selectedRole === 'operator' ? '대시보드' : '작업 목록'}으로 이동합니다.
          </p>
          <div className="mt-6">
            <Logo size="md" />
          </div>
        </div>
      )}
    </div>
  )
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  description,
  tags,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  tags: string[]
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-2xl p-5 border-2 transition-all ${
        selected
          ? 'bg-brand-softer border-brand shadow-brand-sm'
          : 'bg-surface border-line-soft hover:border-line-strong'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            selected ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="h-section text-ink">{title}</h3>
            <span className="text-[13.5px] font-bold text-text-faint">{subtitle}</span>
          </div>
          <p className="t-caption mt-1.5 leading-relaxed">{description}</p>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${
                  selected ? 'bg-white text-brand-dark' : 'bg-surface-muted text-text-muted'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        {selected && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 size={22} className="text-brand" fill="currentColor" stroke="white" strokeWidth={2} />
          </div>
        )}
      </div>
    </button>
  )
}

function ConsentRow({
  id,
  checked,
  onChange,
  required,
  label,
  href,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  required: boolean
  label: string
  href?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-brand cursor-pointer shrink-0"
      />
      <label htmlFor={id} className="flex-1 text-[15px] font-semibold text-ink-soft cursor-pointer leading-snug">
        {required && <span className="text-danger font-black mr-1">[필수]</span>}
        {!required && <span className="text-text-faint font-bold mr-1">[선택]</span>}
        {label}
      </label>
      {href && (
        <Link href={href} className="text-[13.5px] font-bold text-brand-dark underline shrink-0" target="_blank">
          보기
        </Link>
      )}
    </div>
  )
}
