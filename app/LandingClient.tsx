'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Wallet,
  Clock,
  Star,
  Building2,
  Users,
} from 'lucide-react'
import Logo from '@/components/common/Logo'

type Audience = 'host' | 'worker'

function AvatarStack() {
  const initials = ['김', '이', '박', '최']
  const bgs = ['bg-brand', 'bg-sun', 'bg-brand-dark', 'bg-ink/70']
  return (
    <div className="flex items-center">
      {initials.map((ch, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-full ${bgs[i]} border-2 border-white flex items-center justify-center`}
          style={{ marginLeft: i === 0 ? 0 : -9 }}
        >
          <span className="text-white text-[10px] font-black">{ch}</span>
        </div>
      ))}
    </div>
  )
}

export default function LandingClient() {
  const [audience, setAudience] = useState<Audience>('host')

  return (
    <div className="sseuksak-shell">
      <div className="relative flex-1 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-canvas">
          <div className="absolute inset-0 bg-dot-grid opacity-50" />
          <div
            className="absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full blur-[110px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.16) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-[45%] -left-28 w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.14) 0%, transparent 70%)' }}
          />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 safe-top">
          <Logo size="sm" />
          <Link
            href="/login"
            className="text-sm font-bold text-ink-soft px-4 py-2 rounded-full bg-surface/80 backdrop-blur border border-line-soft hover:bg-surface transition"
          >
            로그인
          </Link>
        </div>

        {/* Hero */}
        <div className="relative z-10 px-6 pt-8 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-surface/90 backdrop-blur border border-line-soft rounded-full px-3.5 py-2 mb-6 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse-ring shrink-0" />
            <span className="text-[12px] font-bold text-ink-soft">지금 5,000+ 공간이 사용중</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6 }}
            className="text-[40px] font-black leading-[1.12] tracking-[-0.035em] text-ink"
          >
            공간 청소, <span className="text-gradient-brand">원클릭</span>으로.
            <br />
            청소로 <span className="text-gradient-brand">부수입</span> 만들기.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            className="mt-3.5 text-[14.5px] text-text-muted font-semibold leading-relaxed"
          >
            공간파트너와 클린파트너를<br />
            가장 가깝게 연결합니다.
          </motion.p>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center gap-3 mt-4"
          >
            <AvatarStack />
            <div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={11} fill="#FFB800" className="text-sun" />
                ))}
                <span className="text-[12px] font-black text-ink ml-1.5">4.9</span>
              </div>
              <p className="text-[11px] font-semibold text-text-faint mt-0.5">850+ 클린파트너 활동중</p>
            </div>
          </motion.div>
        </div>

        {/* Audience toggle */}
        <div className="relative z-10 px-6 mb-4">
          <div className="bg-surface-muted rounded-full p-1 flex border border-line-soft">
            <ToggleBtn active={audience === 'host'} onClick={() => setAudience('host')} label="🏢  공간파트너" />
            <ToggleBtn active={audience === 'worker'} onClick={() => setAudience('worker')} label="✨  클린파트너" />
          </div>
        </div>

        {/* Audience card */}
        <div className="relative z-10 px-6">
          <AnimatePresence mode="wait">
            {audience === 'host' ? (
              <motion.div
                key="host"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-3xl p-5 shadow-md border border-line-soft overflow-hidden relative"
              >
                <div
                  className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at top right, rgba(14,165,233,0.1) 0%, transparent 70%)' }}
                />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center shadow-brand-sm shrink-0">
                    <Building2 size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-brand uppercase tracking-widest">공간파트너</p>
                    <h3 className="text-[17px] font-black text-ink leading-tight">원할 때 바로, 30초 청소 요청</h3>
                  </div>
                </div>

                {/* 3-step flow */}
                <div className="grid grid-cols-3 gap-1.5 mb-3 relative z-10">
                  {[
                    { step: '01', text: '요청 등록', sub: '30초' },
                    { step: '02', text: '파트너 매칭', sub: '평균 4분' },
                    { step: '03', text: '완료 확인', sub: 'AI 검수' },
                  ].map((s, i) => (
                    <div key={i} className="bg-brand-surface rounded-xl p-2.5 text-center">
                      <p className="text-[9px] font-black text-brand tracking-wider">{s.step}</p>
                      <p className="text-[11px] font-extrabold text-ink mt-0.5 leading-tight">{s.text}</p>
                      <p className="text-[10px] font-bold text-brand-dark mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                <ul className="flex flex-col gap-1.5 relative z-10">
                  <LI icon={<Zap size={12} />}>예약·당일 모두 OK — 앱 하나로 스케줄 관리</LI>
                  <LI icon={<ShieldCheck size={12} />}>에스크로 결제 · AI 사진 검수 · 체크리스트 자동화</LI>
                  <LI icon={<Sparkles size={12} />}>출발·도착·청소 시작·완료 실시간 상태 알림</LI>
                </ul>
              </motion.div>
            ) : (
              <motion.div
                key="worker"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-3xl p-5 shadow-md border border-line-soft overflow-hidden relative"
              >
                <div
                  className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at top right, rgba(255,184,0,0.12) 0%, transparent 70%)' }}
                />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sun to-[#F0A500] text-ink flex items-center justify-center shadow-sm shrink-0">
                    <Wallet size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#92580C] uppercase tracking-widest">클린파트너</p>
                    <h3 className="text-[17px] font-black text-ink leading-tight">초기 자본 0원, 눈치 없이 부수입</h3>
                  </div>
                </div>

                {/* Earnings highlight */}
                <div className="bg-sun-soft rounded-2xl p-3.5 mb-3 relative z-10">
                  <p className="text-[11px] font-bold text-[#92580C]">주말 파트타임 평균 월 부수입</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="t-money text-[28px] text-ink leading-none">40만</span>
                    <span className="text-[15px] font-black text-[#92580C]">원+</span>
                  </div>
                  <p className="text-[10.5px] font-semibold text-[#92580C]/70 mt-0.5">건당 3~5만원 · 주 1회 정산</p>
                </div>

                <ul className="flex flex-col gap-1.5 relative z-10">
                  <LI icon={<ShieldCheck size={12} />}>가입 즉시 시작 — 장비 구매·창업비용 없음</LI>
                  <LI icon={<Clock size={12} />}>원하는 시간·지역만 골라서 본업 눈치 없이</LI>
                  <LI icon={<Star size={12} />}>실적 쌓을수록 수수료 낮아지고 우선 매칭</LI>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="relative z-10 px-6 mt-5 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '등록 공간', value: '5천+', icon: <Building2 size={14} /> },
              { label: '클린파트너', value: '850+', icon: <Users size={14} /> },
              { label: '평균 매칭', value: '4분', icon: <Zap size={14} /> },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 + i * 0.07, duration: 0.4 }}
                className="bg-surface/90 backdrop-blur rounded-2xl p-3 border border-line-soft text-center"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-softer text-brand-dark flex items-center justify-center mx-auto mb-1.5">
                  {s.icon}
                </div>
                <div className="t-money text-[17px] text-ink leading-none">{s.value}</div>
                <div className="text-[10px] font-bold text-text-soft mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-4 pb-6 safe-bottom bg-surface border-t border-line-soft">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Link
            href="/login"
            className="btn btn-primary w-full min-h-[60px] text-[17px] shadow-brand"
          >
            쓱싹 무료로 시작하기
            <ArrowRight size={20} strokeWidth={2.5} />
          </Link>
        </motion.div>

        <div className="flex items-center gap-3 mt-3 justify-center text-[11.5px] font-bold text-text-soft">
          <Link href="/login" className="flex items-center gap-1 hover:text-ink transition">
            <Building2 size={12} /> 청소 맡기기
          </Link>
          <span className="text-text-faint">·</span>
          <Link href="/login" className="flex items-center gap-1 hover:text-ink transition">
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
      onClick={onClick}
      className={`flex-1 h-9 rounded-full text-[12.5px] font-extrabold transition-all duration-200 ${
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
