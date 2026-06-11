import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Wallet,
  ShieldCheck,
  Clock,
  ArrowRight,
  Star,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import Logo from '@/components/common/Logo'

export const metadata = { title: '클린파트너 모집 | 쓱싹' }

export default async function JoinWorkerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role === 'operator') redirect('/dashboard')
    if (profile?.role === 'worker') redirect('/clean')
    redirect('/onboarding')
  }

  return (
    <div className="sseuksak-shell overflow-x-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 safe-top">
        <Logo size="sm" />
        <Link
          href="/login"
          className="text-[15px] font-bold text-ink-soft px-4 py-2 rounded-full bg-surface border border-line"
        >
          로그인
        </Link>
      </div>

      {/* HERO */}
      <div className="relative px-5 pt-7 pb-6">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 10% 20%, rgba(245,158,11,0.15) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 90% 80%, rgba(245,158,11,0.08) 0%, transparent 50%)',
          }}
        />

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span style={{ fontSize: 11, fontWeight: 900, color: '#92580C', letterSpacing: '0.08em' }}>
            클린파트너 모집 중
          </span>
        </div>

        <h1
          className="relative"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(34px, 8.5vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.038em',
            color: 'var(--color-ink)',
          }}
        >
          청소하고
          <br />
          <span style={{ color: '#D97706' }}>바로 입금</span>받으세요.
        </h1>

        <p className="mt-4 text-[14px] text-text-muted font-semibold leading-relaxed relative">
          초기 비용 0원 · 자유로운 시간 · 지급 보장
          <br />
          지금 바로 시작하세요.
        </p>
      </div>

      {/* 수입 카드 */}
      <div className="px-5 mb-4">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(160deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 16px 40px rgba(245,158,11,0.18)',
          }}
        >
          <div
            aria-hidden
            className="absolute -top-6 -left-6 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(252,211,77,0.55) 0%, transparent 70%)' }}
          />

          <div className="relative p-5">
            <p style={{ fontSize: 11, fontWeight: 700, color: '#92580C', opacity: 0.8, marginBottom: 6 }}>
              청소 1건당 예상 수입
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span
                className="num-display"
                style={{ fontSize: 52, color: '#92580C', lineHeight: 1 }}
              >
                2~3만
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#92580C' }}>원</span>
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(146,88,12,0.65)' }}>
              공간 종류·난이도·면적에 따라 차등
            </p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { value: '0원', label: '초기 비용' },
                { value: '자유', label: '시간 선택' },
                { value: '즉시', label: '시작 가능' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <p style={{ fontSize: 15, fontWeight: 900, color: '#92580C', letterSpacing: '-0.02em' }}>{s.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(146,88,12,0.7)', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 혜택 리스트 */}
      <div className="px-5 mb-4">
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-[13.5px] font-black text-text-muted uppercase tracking-wider mb-1">쓱싹 클린파트너 혜택</p>
          {[
            {
              icon: <ShieldCheck size={15} />,
              title: '일한 돈 100% 지급 보장',
              desc: '작업 완료 후 미지급 걱정 없음. 플랫폼이 결제를 보관했다가 정산.',
              color: '#10B981',
            },
            {
              icon: <Clock size={15} />,
              title: '원하는 시간·지역만 선택',
              desc: '출근 없이 내 스케줄대로. 근처 공간만 골라 수락.',
              color: '#3B82F6',
            },
            {
              icon: <Zap size={15} />,
              title: '즉시 시작, 장비 불필요',
              desc: '공간에 비치된 도구 사용. 별도 구매·자격증 없이 가능.',
              color: '#F59E0B',
            },
            {
              icon: <Star size={15} />,
              title: '실적 쌓으면 우선 매칭',
              desc: '평점·완료 건수가 오를수록 가까운 작업이 먼저 들어옴.',
              color: '#8B5CF6',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${item.color}18`, color: item.color }}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-ink">{item.title}</p>
                <p className="text-[13.5px] text-text-muted font-semibold mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 가입 절차 */}
      <div className="px-5 mb-4">
        <div className="card p-4">
          <p className="text-[13.5px] font-black text-text-muted uppercase tracking-wider mb-3">가입 절차</p>
          <div className="flex flex-col gap-2.5">
            {[
              { step: '01', text: '카카오 또는 이메일로 가입' },
              { step: '02', text: '클린파트너 선택 → 이름·연락처 입력' },
              { step: '03', text: '주변 작업 요청 수락 → 출발 → 완료' },
              { step: '04', text: '승인 후 3일 내 등록 계좌로 정산' },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[13px] font-black"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#92580C' }}
                >
                  {s.step}
                </span>
                <p className="text-[15px] font-bold text-ink">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 수수료 안내 */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <p className="text-[13.5px] font-black text-amber-700 uppercase tracking-wider mb-2">수수료 안내</p>
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {[
              { tier: '스타터', fee: '14%', note: '시작' },
              { tier: '실버', fee: '12%', note: '' },
              { tier: '골드', fee: '10%', note: '' },
              { tier: '마스터', fee: '8%', note: '최저' },
            ].map((t) => (
              <div key={t.tier} className="rounded-xl bg-white/60 border border-amber-200/60 p-2 text-center">
                <p className="text-[12px] font-bold text-amber-700">{t.tier}</p>
                <p className="text-[17px] font-black text-ink mt-0.5">{t.fee}</p>
                {t.note ? <p className="text-[11px] font-bold text-amber-500 mt-0.5">{t.note}</p> : <p className="text-[11px] text-transparent mt-0.5">-</p>}
              </div>
            ))}
          </div>
          <p className="text-[13.5px] text-text-muted font-semibold leading-relaxed">
            실적이 쌓일수록 수수료가 내려가요. 마스터 등급이 되면 업계 최저 수준인 8%만 납부합니다.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            <p className="text-[13.5px] font-bold text-emerald-700">일한 돈 떼일 걱정 없음 — 100% 지급</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        className="px-5 pt-5 pb-6 safe-bottom border-t border-line-soft"
        style={{ background: 'var(--color-surface)' }}
      >
        <Link
          href="/login?role=worker"
          className="btn btn-primary w-full"
          style={{
            minHeight: 58,
            fontSize: 17,
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
          }}
        >
          클린파트너 무료 가입
          <ArrowRight size={20} strokeWidth={2.5} />
        </Link>

        <p className="text-center text-[13.5px] text-text-faint font-semibold mt-3">
          공간파트너(청소 맡기기)로 가입하려면?{' '}
          <Link href="/join/host" className="underline font-bold text-brand">
            여기
          </Link>
        </p>

        <p className="text-center text-[13px] text-text-faint font-medium mt-2 leading-relaxed">
          가입하면{' '}
          <Link href="/terms" className="underline font-bold">이용약관</Link>
          ,{' '}
          <Link href="/privacy" className="underline font-bold">개인정보 처리방침</Link>
          에 동의합니다.
        </p>
      </div>
    </div>
  )
}
