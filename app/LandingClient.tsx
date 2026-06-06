'use client'

import Link from 'next/link'
import { useState } from 'react'
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
    <div className="sseuksak-shell">
      <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 safe-top">
          <Logo size="sm" />
          <Link
            href="/login"
            className="text-sm font-bold text-ink-soft px-4 py-2 rounded-full bg-surface border border-line-soft"
          >
            로그인
          </Link>
        </div>

        {/* Hero */}
        <div className="px-6 pt-8 pb-5">
          <h1 className="text-[40px] font-black leading-[1.12] tracking-[-0.035em] text-ink">
            공간 청소, <span className="text-brand font-black">원클릭</span>으로.
            <br />
            청소로 <span className="text-brand font-black">부수입</span> 만들기.
          </h1>

          <p className="mt-3.5 text-[14.5px] text-text-muted font-semibold leading-relaxed">
            공간파트너와 클린파트너를<br />
            가장 가깝게 연결합니다.
          </p>

        </div>

        {/* Audience toggle */}
        <div className="px-6 mb-4">
          <div className="bg-surface-muted rounded-full p-1 flex border border-line-soft">
            <ToggleBtn active={audience === 'host'} onClick={() => setAudience('host')} label="🏢  공간파트너" />
            <ToggleBtn active={audience === 'worker'} onClick={() => setAudience('worker')} label="✨  클린파트너" />
          </div>
        </div>

        {/* Audience card — conditional render, no GPU transitions */}
        <div className="px-6 mb-4">
          {audience === 'host' ? (
            <div className="bg-surface rounded-3xl p-5 border border-line-soft overflow-hidden relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0">
                  <Building2 size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand uppercase tracking-widest">공간파트너</p>
                  <h3 className="text-[17px] font-black text-ink leading-tight">원할 때 바로, 30초 청소 요청</h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { step: '01', text: '요청 등록', sub: '30초' },
                  { step: '02', text: '파트너 매칭', sub: '빠른 매칭' },
                  { step: '03', text: '완료 확인', sub: 'AI 검수' },
                ].map((s, i) => (
                  <div key={i} className="bg-brand-surface rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-black text-brand tracking-wider">{s.step}</p>
                    <p className="text-[11px] font-extrabold text-ink mt-0.5 leading-tight">{s.text}</p>
                    <p className="text-[10px] font-bold text-brand-dark mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              <ul className="flex flex-col gap-1.5">
                <LI icon={<Zap size={12} />}>예약·당일 모두 OK — 앱 하나로 스케줄 관리</LI>
                <LI icon={<ShieldCheck size={12} />}>에스크로 결제 · AI 사진 검수 · 체크리스트 자동화</LI>
                <LI icon={<Sparkles size={12} />}>출발·도착·청소 시작·완료 실시간 상태 알림</LI>
              </ul>
            </div>
          ) : (
            <div className="bg-surface rounded-3xl p-5 border border-line-soft overflow-hidden relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-sun text-ink flex items-center justify-center shrink-0">
                  <Wallet size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#92580C] uppercase tracking-widest">클린파트너</p>
                  <h3 className="text-[17px] font-black text-ink leading-tight">초기 자본 0원, 눈치 없이 부수입</h3>
                </div>
              </div>

              <div className="bg-sun-soft rounded-2xl p-3.5 mb-3">
                <p className="text-[11px] font-bold text-[#92580C]">청소 1건당 예상 수입</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="t-money text-[28px] text-ink leading-none">3~5만</span>
                  <span className="text-[15px] font-black text-[#92580C]">원</span>
                </div>
                <p className="text-[10.5px] font-semibold text-[#92580C]/70 mt-0.5">난이도·면적별 차등 · 주 1회 정산</p>
              </div>

              <ul className="flex flex-col gap-1.5">
                <LI icon={<ShieldCheck size={12} />}>가입 즉시 시작 — 장비 구매·창업비용 없음</LI>
                <LI icon={<Clock size={12} />}>원하는 시간·지역만 골라서 본업 눈치 없이</LI>
                <LI icon={<Star size={12} />}>실적 쌓을수록 수수료 낮아지고 우선 매칭</LI>
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-4 pb-6 safe-bottom bg-surface border-t border-line-soft">
        <Link
          href="/login"
          className="btn btn-primary w-full min-h-[60px] text-[17px] active:scale-[0.98] transition-transform"
        >
          쓱싹 무료로 시작하기
          <ArrowRight size={20} strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-3 mt-3 justify-center text-[11.5px] font-bold text-text-soft">
          <Link href="/login" className="flex items-center gap-1">
            <Building2 size={12} /> 청소 맡기기
          </Link>
          <span className="text-text-faint">·</span>
          <Link href="/login" className="flex items-center gap-1">
            <Wallet size={12} /> 청소 부수입
          </Link>
        </div>

        <p className="text-center text-[10.5px] text-text-faint font-medium mt-3">
          시작하면{' '}
          <Link href="/terms" className="underline font-bold">
            이용약관
          </Link>
          ,{' '}
          <Link href="/privacy" className="underline font-bold">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}

function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-9 rounded-full text-[12.5px] font-extrabold ${
        active ? 'bg-ink text-white shadow-sm' : 'text-text-muted'
      }`}
    >
      {label}
    </button>
  )
}

function LI({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13px] font-semibold text-ink-soft">
      <span className="w-5 h-5 rounded-lg bg-brand-softer text-brand-dark flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </span>
      {children}
    </li>
  )
}
