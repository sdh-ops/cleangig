'use client';

import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get('error');

  const supabase = createClient();

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto">
      <div className="flex items-center p-4 pb-2 justify-between">
        <h2 className="text-primary dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1">
          로그인
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center pb-24">
        {errorMsg && (
          <div className="mx-4 mb-4 p-4 bg-red-100 text-red-700 rounded-xl text-sm font-semibold">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <h1 className="text-primary dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight px-4 text-center pb-3 pt-6">
          간편하게 시작하세요
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base font-normal leading-normal pb-8 px-4 text-center">
          CleanGig에 오신 것을 환영합니다.
        </p>

        <div className="flex flex-col gap-4 px-4 w-full max-w-sm mx-auto">
          {/* Kakao Login Button */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl min-h-[56px] px-5 bg-[#FEE500] text-[#000000] gap-3 text-[17px] font-bold shadow-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-black" style={{ fontSize: '24px' }}>chat</span>
            <span className="truncate">카카오로 시작하기</span>
          </button>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl min-h-[56px] px-5 bg-white text-slate-700 gap-3 text-[17px] font-bold border border-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 active:scale-95"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            <span className="truncate">Google로 시작하기</span>
          </button>
        </div>

        <div className="mt-8 text-center px-4">
          <a className="text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 transition-colors" href="#">
            이메일로 로그인하기
          </a>
        </div>
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
