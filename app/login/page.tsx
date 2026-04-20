'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import Logo from '@/components/common/Logo'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorMsg = searchParams.get('error')
  const supabase = createClient()

  const [mode, setMode] = useState<'choose' | 'email' | 'signup'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleKakao = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    } catch {
      setLoading(false)
      setMessage('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'email') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(
            error.message === 'Invalid login credentials'
              ? '이메일 또는 비밀번호가 일치하지 않습니다.'
              : error.message,
          )
          setLoading(false)
          return
        }
        router.push('/onboarding')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          setMessage(error.message)
          setLoading(false)
          return
        }
        setMessage('이메일로 인증 링크를 보냈어요. 확인 후 다시 로그인해주세요.')
        setLoading(false)
      }
    } catch {
      setMessage('예상치 못한 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const showError = errorMsg || message

  return (
    <div className="sseuksak-shell">
      <div className="flex items-center h-14 px-3 safe-top">
        <button
          onClick={() => (mode === 'choose' ? router.back() : setMode('choose'))}
          aria-label="뒤로가기"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-muted active:scale-95 transition"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-24">
        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-1"
            >
              <div className="pt-4 pb-8">
                <Logo size="lg" />
              </div>

              <h1 className="h-hero text-ink mb-2">
                환영합니다.
                <br />
                한 번에 <span className="text-gradient-brand">쓱싹</span>.
              </h1>
              <p className="t-body text-text-muted mb-10 leading-relaxed">
                소셜 계정이나 이메일로 시작해보세요.
              </p>

              {showError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 mb-5 p-3.5 bg-danger-soft rounded-xl border border-danger/10"
                >
                  <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-[13px] font-bold text-danger leading-snug">
                    {errorMsg ? decodeURIComponent(errorMsg) : message}
                  </p>
                </motion.div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleKakao}
                  disabled={loading}
                  className="btn btn-kakao w-full"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                          d="M9 1C4.58 1 1 3.83 1 7.32c0 2.26 1.52 4.24 3.8 5.36L3.8 16.5c-.06.22.17.4.37.28l4.25-2.8c.19.02.38.04.58.04 4.42 0 8-2.83 8-6.7C17 3.83 13.42 1 9 1z"
                          fill="#191919"
                        />
                      </svg>
                      카카오로 3초 만에 시작하기
                    </>
                  )}
                </button>

                <button
                  onClick={() => setMode('email')}
                  disabled={loading}
                  className="btn btn-ghost w-full"
                >
                  <Mail size={18} />
                  이메일로 로그인
                </button>

                <button
                  onClick={() => setMode('signup')}
                  disabled={loading}
                  className="mt-2 text-sm font-bold text-text-muted hover:text-ink transition underline underline-offset-4"
                >
                  아직 계정이 없으신가요? 회원가입
                </button>
              </div>
            </motion.div>
          )}

          {(mode === 'email' || mode === 'signup') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-1"
            >
              <div className="pt-4 pb-6">
                <h1 className="h-hero text-ink">
                  {mode === 'email' ? '이메일 로그인' : '이메일 회원가입'}
                </h1>
                <p className="t-body text-text-muted mt-2">
                  {mode === 'email'
                    ? '가입하신 이메일과 비밀번호를 입력하세요.'
                    : '쓱싹 계정을 무료로 만드세요.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                <div>
                  <label className="t-meta block mb-2 ml-1">이메일</label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input pl-11"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="t-meta block mb-2 ml-1">비밀번호</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6자 이상"
                      className="input pl-11"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    />
                  </div>
                </div>

                {message && (
                  <div className="flex items-start gap-2 p-3.5 bg-danger-soft rounded-xl border border-danger/10">
                    <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
                    <p className="text-[13px] font-bold text-danger leading-snug">{message}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : mode === 'email' ? (
                    '로그인'
                  ) : (
                    '회원가입'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setMode(mode === 'email' ? 'signup' : 'email')}
                  className="text-sm font-bold text-text-muted hover:text-ink transition"
                >
                  {mode === 'email' ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-6 safe-bottom">
        <p className="text-center text-[11px] text-text-faint font-medium leading-relaxed">
          계속하면{' '}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 size={24} className="animate-spin text-brand" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
