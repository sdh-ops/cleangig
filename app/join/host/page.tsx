import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCcw,
  Star,
  Clock,
} from 'lucide-react'
import Logo from '@/components/common/Logo'

export const metadata = { title: '공간파트너 모집 | 쓱싹' }

export default async function JoinHostPage() {
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
          className="text-[13px] font-bold text-ink-soft px-4 py-2 rounded-full bg-surface border border-line"
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
              'radial-gradient(ellipse at 80% 10%, rgba(14,165,233,0.13) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 10% 80%, rgba(14,165,233,0.07) 0%, transparent 50%)',
          }}
        />

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span style={{ fontSize: 11, fontWeight: 900, color: '#0369A1', letterSpacing: '0.08em' }}>
            에어비앤비 · 파티룸 · 공유오피스
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
          청소부가 안 와도
          <br />
          <span style={{ color: '#0EA5E9' }}>에스크로</span>가 보호해요.
        </h1>

        <p className="mt-4 text-[14px] text-text-muted font-semibold leading-relaxed relative">
          검증된 클린파트너 매칭 · 에스크로 결제 보호
          <br />
          문제 생기면 플랫폼이 분쟁 해결까지.
        </p>
      </div>

      {/* 핵심 차별화 카드 */}
      <div className="px-5 mb-4">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(160deg, #0E2244 0%, #0A1F3D 60%, #061633 100%)',
            boxShadow: '0 20px 48px rgba(10,31,61,0.30)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div
            aria-hidden
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.20) 0%, transparent 70%)' }}
          />

          <div className="relative p-5">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(56,189,248,0.8)', marginBottom: 6 }}>
              에스크로 결제 시스템
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: 16 }}>
              청소 완료가 확인된 후에만
              <br />
              <span style={{ color: '#38BDF8' }}>클린파트너에게 지급</span>됩니다.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { step: '요청', sub: '30초 등록' },
                { step: '매칭', sub: '검증된 파트너' },
                { step: '완료', sub: '사진 검수' },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF' }}>{s.step}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(56,189,248,0.8)', marginTop: 2 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            <ul className="flex flex-col gap-2">
              {[
                '청소부 미출근 → 전액 환불 보장',
                '품질 미달 → 분쟁 신청 후 플랫폼 판정',
                '출발~완료 실시간 알림, 결과 사진 확인',
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                  <span
                    className="flex items-center justify-center shrink-0 mt-0.5 rounded-lg"
                    style={{ width: 20, height: 20, background: 'rgba(56,189,248,0.15)', color: '#38BDF8', fontSize: 11 }}
                  >
                    ✓
                  </span>
                  {txt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 혜택 리스트 */}
      <div className="px-5 mb-4">
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-[11px] font-black text-text-muted uppercase tracking-wider mb-1">공간파트너 혜택</p>
          {[
            {
              icon: <ShieldCheck size={15} />,
              title: '에스크로 결제 — 품질 보장',
              desc: '청소 완료 확인 전까지 결제 보호. 미출근·품질 미달 시 환불.',
              color: '#10B981',
            },
            {
              icon: <Zap size={15} />,
              title: '당일 · 예약 모두 가능',
              desc: '급하게 청소 필요한 날도 30초 등록으로 가까운 파트너 매칭.',
              color: '#F59E0B',
            },
            {
              icon: <RefreshCcw size={15} />,
              title: '정기 청소 자동 스케줄',
              desc: '주 1회·격주·월 1회 설정하면 매번 따로 등록할 필요 없음.',
              color: '#3B82F6',
            },
            {
              icon: <Star size={15} />,
              title: '단골 파트너 즐겨찾기',
              desc: '마음에 드는 클린파트너는 즐겨찾기 등록해 우선 배정 요청.',
              color: '#8B5CF6',
            },
            {
              icon: <Clock size={15} />,
              title: '출발~완료 실시간 알림',
              desc: '파트너 출발 → 도착 → 완료 사진까지 앱에서 실시간 확인.',
              color: '#EF4444',
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
                <p className="text-[13px] font-extrabold text-ink">{item.title}</p>
                <p className="text-[11.5px] text-text-muted font-semibold mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 공간 타입 */}
      <div className="px-5 mb-4">
        <div className="card p-4">
          <p className="text-[11px] font-black text-text-muted uppercase tracking-wider mb-3">이런 공간에 딱 맞아요</p>
          <div className="flex flex-wrap gap-2">
            {[
              '🏠 에어비앤비',
              '🎉 파티룸',
              '🏋️ 헬스장',
              '☕ 스터디카페',
              '🎬 촬영 스튜디오',
              '💼 공유오피스',
              '🎸 연습실',
              '🏪 무인매장',
            ].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: 'rgba(14,165,233,0.08)', color: '#0369A1', border: '1px solid rgba(14,165,233,0.15)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 수수료 안내 */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}
        >
          <p className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-2">요금 안내</p>
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[13px] font-bold text-ink">플랫폼 이용 수수료</p>
            <p className="text-[15px] font-black text-sky-700">5%</p>
          </div>
          <p className="text-[11.5px] text-text-muted font-semibold leading-relaxed">
            결제 금액의 5%만 수수료로 청구됩니다. 에스크로 보호·분쟁 해결·매칭 서비스가 모두 포함된 금액입니다.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="px-5 pt-5 pb-6 safe-bottom border-t border-line-soft"
        style={{ background: 'var(--color-surface)' }}
      >
        <Link
          href="/login?role=operator"
          className="btn btn-primary w-full"
          style={{
            minHeight: 58,
            fontSize: 17,
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #0A1F3D 0%, #1E3353 100%)',
            boxShadow: '0 8px 24px rgba(10,31,61,0.30)',
          }}
        >
          공간파트너 무료 가입
          <ArrowRight size={20} strokeWidth={2.5} />
        </Link>

        <p className="text-center text-[11px] text-text-faint font-semibold mt-3">
          청소 일감 찾는 클린파트너로 가입하려면?{' '}
          <Link href="/join/worker" className="underline font-bold text-amber-600">
            여기
          </Link>
        </p>

        <p className="text-center text-[10.5px] text-text-faint font-medium mt-2 leading-relaxed">
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
