'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, ShieldCheck, MapPin, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import Logo from '@/components/common/Logo'

export default function LandingClient() {
  return (
    <div className="sseuksak-shell">
      {/* Hero mesh bg */}
      <div className="relative flex-1 overflow-hidden bg-brand-mesh">
        {/* floating orbs */}
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
        <div className="relative z-10 px-6 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur border border-line-soft rounded-full px-3 py-1.5 mb-6">
              <Sparkles size={14} className="text-brand-dark" />
              <span className="text-xs font-bold text-ink-soft">공간 운영의 새로운 기준</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-[38px] font-black leading-[1.12] tracking-[-0.03em] text-ink"
          >
            한 번에 <span className="text-gradient-brand">쓱싹</span>,
            <br />
            공간이 살아나요
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-5 text-[15px] text-text-muted font-medium leading-relaxed max-w-[340px]"
          >
            파티룸·에어비앤비·무인매장 청소를 <b className="text-ink">원클릭</b>으로.
            <br />
            에스크로 결제 · AI 품질 검수 · 자동 정산.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-8 flex items-center gap-4"
          >
            <div className="flex -space-x-2">
              {['#00C896', '#FFB800', '#0A1F3D', '#3B82F6'].map((c, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="text-xs">
              <div className="font-black text-ink">전문 작업자 500+</div>
              <div className="text-text-soft font-medium">홍대·합정·망원 지역 운영 중</div>
            </div>
          </motion.div>
        </div>

        {/* Floating cards preview */}
        <div className="relative z-10 px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-white rounded-3xl p-5 shadow-lg border border-line-soft"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center">
                <Zap size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-extrabold text-ink">
                  지금 요청 → 평균 4분 매칭
                </div>
                <div className="text-xs text-text-soft font-medium">근처 마스터 작업자 자동 배정</div>
              </div>
              <div className="text-[11px] font-black text-brand-dark chip chip-brand">실시간</div>
            </div>
          </motion.div>
        </div>

        {/* Value props */}
        <div className="relative z-10 px-6 mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, label: '에스크로\n결제 보호' },
            { icon: Sparkles, label: 'AI 사진\n품질 검수' },
            { icon: MapPin, label: '실시간\n위치 추적' },
          ].map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
              className="bg-white/80 backdrop-blur rounded-2xl p-3 border border-line-soft"
            >
              <div className="w-8 h-8 rounded-full bg-brand-softer flex items-center justify-center text-brand-dark mb-2">
                <v.icon size={16} strokeWidth={2.5} />
              </div>
              <div className="text-[11px] font-extrabold text-ink leading-tight whitespace-pre-line">
                {v.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-6 pb-8 safe-bottom bg-gradient-to-t from-canvas via-canvas to-transparent">
        <div className="flex flex-col gap-2.5 mb-5">
          {[
            '공간 청소 · 점검 · 보충을 한 곳에서',
            '결제 실패 없는 에스크로 시스템',
            '자동 매칭 · 자동 정산',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-brand shrink-0" strokeWidth={2.5} />
              <span className="text-[13px] font-semibold text-ink-soft">{t}</span>
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

        <p className="text-center text-xs text-text-faint font-medium mt-4">
          시작하면{' '}
          <Link href="/terms" className="underline font-bold">
            이용약관
          </Link>
          과{' '}
          <Link href="/privacy" className="underline font-bold">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
