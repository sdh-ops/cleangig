'use client'

import Link from 'next/link'
import { useState } from 'react'
import LegalFooter from '@/components/common/LegalFooter'
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Wallet,
  Clock,
  Star,
  Building2,
} from 'lucide-react'
import Logo from '@/components/common/Logo'

type Audience = 'host' | 'worker'

export default function LandingClient() {
  const [audience, setAudience] = useState<Audience>('worker')

  return (
    <div className="sseuksak-shell overflow-x-hidden">
      {/* ========= HEADER ========= */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 safe-top">
        <Logo size="sm" />
        <Link
          href="/login"
          className="text-[15px] font-bold text-ink-soft px-4 py-2 rounded-full bg-surface border border-line"
        >
          로그인
        </Link>
      </div>

      {/* ========= HERO ========= */}
      <div className="relative px-5 pt-7 pb-6">
        {/* Background mesh — compositor-only, no blur */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 80% 10%, rgba(14,165,233,0.13) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 10% 80%, rgba(2,132,199,0.08) 0%, transparent 50%)',
          }}
        />

        {/* Overline */}
        <p className="t-overline text-brand mb-3 relative">
          청소 플랫폼 · 쓱싹
        </p>

        {/* Main headline — ultra-weight contrast */}
        <h1
          className="relative"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 9vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.038em',
            color: 'var(--color-ink)',
          }}
        >
          공간 청소,{' '}
          <span className="text-gradient-brand">원클릭</span>
          으로.
          <br />
          청소로{' '}
          <span className="text-gradient-ink">부수입</span>{' '}
          만들기.
        </h1>

        <p className="mt-4 text-[14px] text-text-muted font-semibold leading-relaxed relative">
          공간파트너와 클린파트너를
          <br />
          가장 가깝게 연결합니다.
        </p>

        {/* Trust row */}
        <div className="flex items-center gap-3 mt-4 relative">
          <span className="chip chip-success text-[13.5px] animate-pulse-ring" style={{ animationDuration: '2.5s' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            지금 활성
          </span>
          <span className="text-[13.5px] text-text-faint font-bold">안전 결제 · AI 사진 확인</span>
        </div>
      </div>

      {/* ========= AUDIENCE TOGGLE ========= */}
      <div className="px-5 mb-4">
        <div
          className="relative flex p-1 rounded-2xl border border-line-soft"
          style={{ background: 'var(--color-surface-muted)' }}
        >
          {/* Sliding indicator */}
          <div
            aria-hidden
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all"
            style={{
              background: audience === 'host'
                ? 'linear-gradient(135deg, #0A1F3D 0%, #1E3353 100%)'
                : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              left: audience === 'host' ? '4px' : 'calc(50%)',
              transitionDuration: '200ms',
              transitionTimingFunction: 'var(--ease-out-expo)',
              boxShadow: audience === 'worker' ? '0 4px 12px rgba(14,165,233,0.35)' : '0 4px 12px rgba(10,31,61,0.25)',
            }}
          />
          <button
            type="button"
            onClick={() => setAudience('host')}
            className="relative flex-1 z-10 h-10 rounded-xl text-[15px] font-black transition-colors"
            style={{ color: audience === 'host' ? '#FFFFFF' : 'var(--color-text-muted)' }}
          >
            🏢&nbsp; 공간파트너
          </button>
          <button
            type="button"
            onClick={() => setAudience('worker')}
            className="relative flex-1 z-10 h-10 rounded-xl text-[15px] font-black transition-colors"
            style={{ color: audience === 'worker' ? '#FFFFFF' : 'var(--color-text-muted)' }}
          >
            ✨&nbsp; 클린파트너
          </button>
        </div>
      </div>

      {/* ========= AUDIENCE CARD ========= */}
      <div className="px-5 mb-4">
        {audience === 'host' ? <HostCard /> : <WorkerCard />}
      </div>

      {/* ========= BOTTOM CTA ========= */}
      <div
        className="px-5 pt-5 pb-6 safe-bottom border-t border-line-soft"
        style={{ background: 'var(--color-surface)' }}
      >
        <Link
          href="/login"
          className="btn btn-primary w-full"
          style={{ minHeight: 58, fontSize: 17, borderRadius: 'var(--radius-xl)' }}
        >
          쓱싹 무료로 시작하기
          <ArrowRight size={20} strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-4 mt-3.5 justify-center">
          <Link href="/login" className="flex items-center gap-1.5 text-[14.5px] font-bold text-text-muted">
            <Building2 size={13} strokeWidth={2.5} />
            청소 맡기기
          </Link>
          <span className="w-[1px] h-3 bg-line-soft" />
          <Link href="/login" className="flex items-center gap-1.5 text-[14.5px] font-bold text-text-muted">
            <Wallet size={13} strokeWidth={2.5} />
            청소 부수입
          </Link>
        </div>

        <p className="text-center text-[13px] text-text-faint font-medium mt-3.5 leading-relaxed">
          시작하면{' '}
          <Link href="/terms" className="underline font-bold">이용약관</Link>
          ,{' '}
          <Link href="/privacy" className="underline font-bold">개인정보 처리방침</Link>
          에 동의합니다.
        </p>
      </div>

      {/* 전자상거래법 제10조 사업자정보 표시 */}
      <LegalFooter />
    </div>
  )
}

/* ---- HOST card ---- */
function HostCard() {
  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #0E2244 0%, #0A1F3D 60%, #061633 100%)',
        boxShadow: '0 20px 48px rgba(10,31,61,0.30), 0 4px 12px rgba(10,31,61,0.20)',
      }}
    >
      {/* Dot grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Light leak top-right */}
      <div
        aria-hidden
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.20) 0%, transparent 70%)' }}
      />

      <div className="relative p-5">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(14,165,233,0.18)', color: '#38BDF8' }}
          >
            <Building2 size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38BDF8' }}>
              공간파트너
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              원할 때 바로 청소 요청
            </p>
          </div>
        </div>

        {/* Big number feature */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            요청부터 매칭까지
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className="num-display"
              style={{ fontSize: 52, color: '#38BDF8', lineHeight: 1 }}
            >
              30
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#38BDF8' }}>초</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            앱 하나로 예약·당일 모두 가능
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { step: '01', text: '요청 등록', sub: '30초' },
            { step: '02', text: '파트너 매칭', sub: '빠른 매칭' },
            { step: '03', text: '완료 확인', sub: 'AI 확인' },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p style={{ fontSize: 9, fontWeight: 900, color: '#38BDF8', letterSpacing: '0.08em' }}>{s.step}</p>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#FFFFFF', marginTop: 2, lineHeight: 1.2 }}>{s.text}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(56,189,248,0.8)', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-2">
          <DarkLI icon={<Zap size={11} />}>예약·당일 모두 OK — 스케줄 자동 관리</DarkLI>
          <DarkLI icon={<ShieldCheck size={11} />}>안전 결제 · AI 사진 확인 · 체크리스트</DarkLI>
          <DarkLI icon={<Sparkles size={11} />}>출발부터 완료까지 실시간 상태 알림</DarkLI>
        </ul>
      </div>
    </div>
  )
}

/* ---- WORKER card ---- */
function WorkerCard() {
  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #F0F9FF 0%, #E0F2FE 50%, #BAE6FD 100%)',
        border: '1px solid rgba(14,165,233,0.2)',
        boxShadow: '0 16px 40px rgba(14,165,233,0.16), 0 4px 12px rgba(14,165,233,0.10)',
      }}
    >
      {/* Light leak */}
      <div
        aria-hidden
        className="absolute -top-6 -left-6 w-36 h-36 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.55) 0%, transparent 70%)' }}
      />

      <div className="relative p-5">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(14,165,233,0.16)', color: '#075985' }}
          >
            <Wallet size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#075985' }}>
              클린파트너
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1C1000', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              초기 자본 0원, 눈치 없이 부수입
            </p>
          </div>
        </div>

        {/* Big earnings number — the star of this card */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: 'rgba(255,255,255,0.65)',
            border: '1.5px solid rgba(14,165,233,0.25)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#075985', opacity: 0.8, marginBottom: 4 }}>
            청소 1건당 예상 수입
          </p>
          <div className="flex items-baseline gap-1.5">
            <span
              className="num-display"
              style={{ fontSize: 52, color: '#0369A1', lineHeight: 1 }}
            >
              3~5만
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#0369A1' }}>원</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(7,89,133,0.7)' }}>
              난이도·면적별 차등
            </p>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(7,89,133,0.4)' }}>·</span>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(7,89,133,0.7)' }}>
              주 1회 정산
            </p>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: '0원', label: '초기 비용' },
            { value: '자유', label: '시간 선택' },
            { value: '즉시', label: '시작 가능' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(14,165,233,0.2)' }}
            >
              <p style={{ fontSize: 15, fontWeight: 900, color: '#0369A1', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(7,89,133,0.7)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-2">
          <SunLI icon={<ShieldCheck size={11} />}>가입 즉시 시작 — 장비 구매·창업비용 없음</SunLI>
          <SunLI icon={<Clock size={11} />}>원하는 시간·지역만 골라서 본업 눈치 없이</SunLI>
          <SunLI icon={<Star size={11} />}>실적 쌓을수록 수수료 낮아지고 우선 매칭</SunLI>
        </ul>
      </div>
    </div>
  )
}

/* ---- helper list items ---- */
function DarkLI({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
      <span
        className="flex items-center justify-center shrink-0 mt-0.5 rounded-lg"
        style={{ width: 20, height: 20, background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}
      >
        {icon}
      </span>
      {children}
    </li>
  )
}

function SunLI({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(7,89,133,0.9)' }}>
      <span
        className="flex items-center justify-center shrink-0 mt-0.5 rounded-lg"
        style={{ width: 20, height: 20, background: 'rgba(14,165,233,0.16)', color: '#075985' }}
      >
        {icon}
      </span>
      {children}
    </li>
  )
}
