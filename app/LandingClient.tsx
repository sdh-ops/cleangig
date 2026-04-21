'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Clock,
  Star,
  Building2,
} from 'lucide-react'
import Logo from '@/components/common/Logo'

type Audience = 'host' | 'worker'

export default function LandingClient() {
  const [audience, setAudience] = useState<Audience>('host')

  return (
    <div className="sseuksak-shell">
      <div className="relative flex-1 overflow-hidden bg-brand-mesh">
        <div className="absolute -top-10 -right-16 w-[320px] h-[320px] bg-brand/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-[260px] h-[260px] bg-sun/25 rounded-full blur-[80px] pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 safe-top">
          <Logo size="sm" />
          <Link
            href="/login"
            className="text-sm font-bold text-ink-soft px-3 py-1.5 rounded-full hover:bg-surface-muted"
          >
            로그인
          </Link>
        </div>

        {/* Hero */}
        <div className="relative z-10 px-6 pt-10 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur border border-line-soft rounded-full px-3 py-1.5 mb-5">
              <Sparkles size={14} className="text-brand-dark" />
              <span className="text-xs font-bold text-ink-soft">청소 매칭 플랫폼</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[34px] font-black leading-[1.15] tracking-[-0.03em] text-ink"
          >
            청소 <span className="text-gradient-brand">맡기고</span>,
            <br />
            청소로 <span className="text-gradient-brand">돈 벌고</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-4 text-[14.5px] text-text-muted font-semibold leading-relaxed max-w-[340px]"
          >
            <b className="text-ink">공간 운영자</b>와 <b className="text-ink">클린 파트너</b>를<br />
            가장 가깝게 연결합니다.
          </motion.p>
        </div>

        {/* Audience toggle */}
        <div className="relative z-10 px-6 mb-5">
          <div className="bg-white/80 backdrop-blur border border-line-soft rounded-full p-1 flex">
            <ToggleBtn active={audience === 'host'} onClick={() => setAudience('host')} label="공간 운영자" />
            <ToggleBtn active={audience === 'worker'} onClick={() => setAudience('worker')} label="클린 파트너" />
          </div>
        </div>

        {/* Audience-specific card */}
        <div className="relative z-10 px-6">
          <AnimatePresence mode="wait">
            {audience === 'host' ? (
              <motion.div
                key="host"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-3xl p-5 shadow-lg border border-line-soft"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand text-white flex items-center justify-center">
                    <Building2 size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-brand-dark uppercase tracking-wider">공간 운영자라면</p>
                    <h3 className="text-[17px] font-black text-ink leading-tight">청소 걱정 없는 운영</h3>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 mt-3">
                  <LI icon={<Zap size={14} />}>요청 한 번으로 평균 4분 매칭</LI>
                  <LI icon={<ShieldCheck size={14} />}>에스크로 결제 · AI 사진 검수</LI>
                  <LI icon={<Sparkles size={14} />}>체크리스트 기반 품질 보증</LI>
                </ul>
              </motion.div>
            ) : (
              <motion.div
                key="worker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-3xl p-5 shadow-lg border border-line-soft"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-sun text-ink flex items-center justify-center">
                    <Wallet size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#92580C] uppercase tracking-wider">클린 파트너라면</p>
                    <h3 className="text-[17px] font-black text-ink leading-tight">원하는 시간, 내 부업</h3>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 mt-3">
                  <LI icon={<Clock size={14} />}>근무 시간 · 지역 자유롭게 선택</LI>
                  <LI icon={<Wallet size={14} />}>주 1회 정산 · 평균 건당 3~5만원</LI>
                  <LI icon={<Star size={14} />}>실력만큼 올라가는 티어 + 단골</LI>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Community stats */}
        <div className="relative z-10 px-6 mt-6 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '등록 공간', value: '5,000+' },
              { label: '클린 파트너', value: '850+' },
              { label: '평균 매칭', value: '4분' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                className="bg-white/80 backdrop-blur rounded-2xl p-3 border border-line-soft text-center"
              >
                <div className="t-money text-[18px] text-ink">{s.value}</div>
                <div className="text-[10.5px] font-bold text-text-soft mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA — DUAL */}
      <div className="px-5 pt-5 pb-6 safe-bottom bg-gradient-to-t from-canvas via-canvas to-transparent">
        <div className="flex flex-col gap-2 mb-4">
          {[
            '공간 파트너: 원클릭으로 청소 맡기기',
            '클린 파트너: 원할 때 원하는 지역에서 부업',
            '플랫폼: 결제 보호 · 품질 보증 · 자동 정산',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-brand shrink-0" strokeWidth={2.5} />
              <span className="text-[12.5px] font-semibold text-ink-soft">{t}</span>
            </div>
          ))}
        </div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Link
            href="/login"
            className="btn btn-primary w-full min-h-[60px] text-[17px] shadow-brand"
          >
            쓱싹 시작하기
            <ArrowRight size={20} strokeWidth={2.5} />
          </Link>
        </motion.div>

        <div className="flex items-center gap-3 mt-3 justify-center text-[11.5px] font-bold text-text-soft">
          <Link href="/login" className="flex items-center gap-1 hover:text-ink">
            <Building2 size={12} /> 청소 맡기기
          </Link>
          <span className="text-text-faint">·</span>
          <Link href="/login" className="flex items-center gap-1 hover:text-ink">
            <Wallet size={12} /> 청소로 돈벌기
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
      className={`flex-1 h-9 rounded-full text-[12.5px] font-extrabold transition ${
        active ? 'bg-ink text-white' : 'text-text-muted'
      }`}
    >
      {label}
    </button>
  )
}

function LI({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
      <span className="w-6 h-6 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center shrink-0">
        {icon}
      </span>
      {children}
    </li>
  )
}
