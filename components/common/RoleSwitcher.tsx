'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Sparkles, ArrowRightLeft, Loader2, X, Check, Zap, Wallet } from 'lucide-react'
import { haptic } from '@/lib/haptic'

type Props = {
  userId: string
  currentRole: 'operator' | 'worker' | 'admin'
  canOperate?: boolean
  canWork?: boolean
}

export default function RoleSwitcher({ userId, currentRole, canOperate = false, canWork = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [confirm, setConfirm] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (currentRole === 'admin') return null

  const isWorker = currentRole === 'worker'
  const targetRole: 'operator' | 'worker' = isWorker ? 'operator' : 'worker'
  const firstTime = isWorker ? !canOperate : !canWork

  const handleSwitch = async () => {
    setSwitching(true)
    setErr(null)
    try {
      // 1차 시도: can_operate/can_work 포함 (마이그레이션 적용 후)
      const fullPayload: Record<string, unknown> = {
        role: targetRole,
        updated_at: new Date().toISOString(),
      }
      if (targetRole === 'operator') fullPayload.can_operate = true
      else fullPayload.can_work = true

      let { error } = await supabase.from('users').update(fullPayload).eq('id', userId)

      // 2차 fallback: can_operate/can_work 컬럼이 없는 경우 role만 업데이트
      if (error) {
        console.warn('role switch: full payload failed, retrying with role only', error)
        const minimal = await supabase
          .from('users')
          .update({ role: targetRole, updated_at: new Date().toISOString() })
          .eq('id', userId)
        error = minimal.error
      }

      if (error) throw error

      haptic.success()
      setConfirm(false)
      router.replace(targetRole === 'operator' ? '/dashboard' : '/clean')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '역할 전환에 실패했습니다'
      setErr(`${msg} — DB 마이그레이션(dual_role) 실행 여부를 확인해주세요.`)
      haptic.error()
      setSwitching(false)
    }
  }

  return (
    <>
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-black text-text-faint uppercase tracking-wide">역할 전환</h3>
          <div className="flex items-center gap-1">
            <RoleBadge active={!isWorker} label="공간" />
            <RoleBadge active={isWorker} label="클린" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isWorker ? 'bg-brand-softer text-brand-dark' : 'bg-sun-soft text-[#92580C]'
            }`}
          >
            {isWorker ? <Building2 size={20} strokeWidth={2.3} /> : <Wallet size={20} strokeWidth={2.3} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-extrabold text-ink">
              {isWorker ? '공간 파트너로 전환' : '클린 파트너로 전환'}
            </p>
            <p className="text-[11.5px] text-text-soft font-bold mt-0.5 leading-snug">
              {isWorker
                ? '내 공간을 등록하고 원클릭으로 청소 맡기기'
                : '원하는 시간·지역에서 청소하고 부업 수익 만들기'}
            </p>
          </div>
          <button
            onClick={() => { haptic.light(); setConfirm(true) }}
            className="btn btn-secondary !min-h-[40px] !px-3.5 !text-xs whitespace-nowrap"
          >
            <ArrowRightLeft size={14} /> 전환
          </button>
        </div>
      </section>

      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => !switching && setConfirm(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: 'spring', stiffness: 250, damping: 24 }}
              className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 2rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="h-section text-ink">
                  {targetRole === 'operator' ? '공간 파트너' : '클린 파트너'}로 전환
                </h3>
                {!switching && (
                  <button onClick={() => setConfirm(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                    <X size={18} />
                  </button>
                )}
              </div>

              {firstTime && (
                <div className="mb-4 p-3 rounded-xl bg-sun-soft border border-sun/20 flex items-start gap-2">
                  <Sparkles size={15} className="text-[#92580C] shrink-0 mt-0.5" />
                  <p className="text-[12.5px] font-bold text-ink-soft leading-snug">
                    처음이시네요! 전환 후 잠깐의 설정만 해주시면 바로 사용할 수 있어요.
                  </p>
                </div>
              )}

              <ul className="flex flex-col gap-2.5 mb-5">
                {targetRole === 'operator' ? (
                  <>
                    <Bullet icon={<Zap size={14} />}>공간을 등록하고 원클릭 청소 요청</Bullet>
                    <Bullet icon={<Check size={14} />}>에스크로 결제 + AI 품질 검수</Bullet>
                    <Bullet icon={<Check size={14} />}>기존 클린 파트너 데이터는 그대로 보존</Bullet>
                  </>
                ) : (
                  <>
                    <Bullet icon={<Zap size={14} />}>내 주변 청소 작업을 자유롭게 선택</Bullet>
                    <Bullet icon={<Check size={14} />}>주 1회 정산 · 티어 승급 혜택</Bullet>
                    <Bullet icon={<Check size={14} />}>등록한 공간·요청 내역은 그대로 유지</Bullet>
                  </>
                )}
              </ul>

              {err && <div className="mb-3 p-3 rounded-xl bg-danger-soft text-[13px] font-bold text-danger">{err}</div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  disabled={switching}
                  className="flex-1 btn btn-ghost"
                >
                  취소
                </button>
                <button
                  onClick={handleSwitch}
                  disabled={switching}
                  className="flex-1 btn btn-primary"
                >
                  {switching ? <Loader2 size={18} className="animate-spin" /> : '전환하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function RoleBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
        active ? 'bg-brand text-white' : 'bg-surface-muted text-text-faint'
      }`}
    >
      {label}
    </span>
  )
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-full bg-brand-softer text-brand-dark flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-[13.5px] font-semibold text-ink-soft">{children}</span>
    </li>
  )
}
