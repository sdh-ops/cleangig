'use client';

import React, { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorMsg = searchParams.get('error');

  const supabase = createClient();

  const [isEmailView, setIsEmailView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 일치하지 않습니다.' : error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto shadow-2xl">
      <div className="flex items-center p-4 pb-2 justify-between">
        <button
          onClick={() => isEmailView ? setIsEmailView(false) : window.history.back()}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          로그인
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center pb-24">
        <AnimatePresence mode="wait">
          {!isEmailView ? (
            <motion.div
              key="social-login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col"
            >
              {(errorMsg || message) && (
                <div className="mx-4 mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
                  {errorMsg ? decodeURIComponent(errorMsg) : message}
                </div>
              )}

              <div className="flex justify-center pt-8">
                <img src="/logo_kr.png" alt="CleanGig" className="w-32 h-auto object-contain" />
              </div>
              <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-black leading-tight px-4 text-center pb-3 pt-8">
                간편하게 시작하세요
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base font-bold leading-normal pb-10 px-4 text-center">
                CleanGig에 오신 것을 환영합니다.
              </p>

              <div className="flex flex-col gap-4 px-6 w-full mx-auto">
                <button
                  type="button"
                  onClick={handleKakaoLogin}
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[20px] min-h-[64px] px-5 bg-[#FEE500] text-[#000000] gap-3 text-[17px] font-black shadow-lg shadow-yellow-500/10 transition-all hover:opacity-90 active:scale-95"
                >
                  <img src="https://developers.kakao.com/tool/resource/static/img/button/kakaotalksharing/kakaotalk_sharing_btn_small.png" alt="Kakao" className="w-6 h-6" />
                  <span className="truncate">카카오로 시작하기</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEmailView(true)}
                  className="mt-4 text-sm font-bold text-slate-400 hover:text-primary transition-colors underline underline-offset-4"
                >
                  이메일로 로그인하기
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="email-login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6"
            >
              <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">이메일 로그인</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-8">가입하신 이메일과 비밀번호를 입력해주세요.</p>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">이메일</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>

                {message && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white h-16 rounded-2xl text-[17px] font-black shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 mt-4"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                <p className="text-sm text-slate-400 font-bold">
                  아직 회원이 아니신가요?
                  <Link href="/onboarding" className="text-primary ml-2 hover:underline underline-offset-4">회원가입</Link>
                </p>
                <button
                  onClick={() => setIsEmailView(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  다른 방법으로 로그인하기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
