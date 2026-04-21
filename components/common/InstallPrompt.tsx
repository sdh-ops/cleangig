'use client'

import { useEffect, useState } from 'react'
import { Smartphone, X, Share as ShareIcon, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from './Logo'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sseuksak:install_dismissed_at'
const DISMISS_TTL_DAYS = 14

function wasDismissedRecently(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY))
    if (!ts) return false
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24)
    return days < DISMISS_TTL_DAYS
  } catch {
    return false
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone) || window.matchMedia('(display-mode: standalone)').matches
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports as Mac — check touch points
  const iPadOS = ua.includes('Macintosh') && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1
  return /iPhone|iPad|iPod/.test(ua) || iPadOS
}

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [showIOSSheet, setShowIOSSheet] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    if (wasDismissedRecently()) return

    if (isIOS()) {
      setIos(true)
      const t = setTimeout(() => setShow(true), 6000)
      return () => clearTimeout(t)
    }

    const onBip = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    const onInstalled = () => {
      setShow(false)
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (ios) {
      setShowIOSSheet(true)
      return
    }
    if (!evt) return
    try {
      await evt.prompt()
      await evt.userChoice
    } catch {
      // ignore
    }
    setShow(false)
  }

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setShow(false)
  }

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-24px)] max-w-[420px]"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
          >
            <div className="bg-ink text-white rounded-2xl p-3.5 shadow-xl flex items-center gap-3 border border-white/5">
              <div className="w-11 h-11 rounded-xl bg-brand text-ink flex items-center justify-center shrink-0">
                <Smartphone size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black leading-tight">쓱싹을 앱으로 설치</p>
                <p className="text-[11px] text-white/70 font-semibold mt-0.5 leading-snug">
                  홈화면에서 원탭으로 열고 알림 받기
                </p>
              </div>
              <button
                onClick={install}
                className="px-3.5 h-9 rounded-lg bg-brand text-ink text-xs font-black active:scale-95 transition shrink-0"
              >
                설치
              </button>
              <button
                onClick={dismiss}
                aria-label="닫기"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOSSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowIOSSheet(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl bg-surface p-6 pb-8"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 2rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <Logo size="sm" />
                <button onClick={() => setShowIOSSheet(false)} className="w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <h3 className="h-section text-ink mb-1">iPhone에 설치하기</h3>
              <p className="t-caption mb-5">Safari 하단 공유 버튼을 눌러주세요.</p>

              <ol className="flex flex-col gap-3 mb-5">
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-softer text-brand-dark font-black text-sm flex items-center justify-center shrink-0">1</span>
                  <span className="text-[13.5px] font-semibold text-ink flex items-center gap-1.5">
                    Safari 하단의 <ShareIcon size={16} className="text-info" /> 공유 버튼 탭
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-softer text-brand-dark font-black text-sm flex items-center justify-center shrink-0">2</span>
                  <span className="text-[13.5px] font-semibold text-ink flex items-center gap-1.5">
                    <Plus size={16} className="text-ink" /> 홈 화면에 추가 선택
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-softer text-brand-dark font-black text-sm flex items-center justify-center shrink-0">3</span>
                  <span className="text-[13.5px] font-semibold text-ink">우측 상단 &ldquo;추가&rdquo; 탭</span>
                </li>
              </ol>

              <button onClick={() => { dismiss(); setShowIOSSheet(false) }} className="btn btn-ghost w-full">
                나중에 하기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
