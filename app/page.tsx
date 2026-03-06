import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 이미 로그인된 사용자인 경우, 역할에 맞게 리다이렉트 (카카오 로그인 시 홈페이지로 튕기는 문제 해결)
  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile) {
      if (profile.role === 'operator') {
        redirect('/dashboard');
      } else if (profile.role === 'worker') {
        redirect('/clean');
      } else {
        redirect('/onboarding');
      }
    } else {
      redirect('/onboarding');
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-md mx-auto shadow-sm">
      <div className="flex items-center p-4 pb-2 justify-between">
        <div className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 cursor-pointer">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">CleanGig Premium</h2>
      </div>
      <div className="@container flex-1 flex flex-col">
        <div className="@[480px]:px-4 @[480px]:py-3 flex-1 flex flex-col">
          <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden @[480px]:rounded-lg flex-1 min-h-[320px] shadow-sm relative" data-alt="Clean minimalist room with soft lighting" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAiUdrOhxD_5NpgTm8pMqZ6sbQlZ_4uD5m6GrwX-UXB_1VLarE_KvB1YziAEa-kKW6HlGAsrNW5AxMC7bXeVOyN5pRqCUixRwldihGcLyXABncNNDFJZRe7hLbxodkV09_OuYYgW3BxZ2dh5HjbvmQcQUR-GkrraYMQKk55Ii2OJ5YIGgH-XyzzLNPk8lQPeeAGAG52KJe2xxPp8Bjt-HY8z423a9_sFq_o0WM1WOom8zq9GJB8UNEf-rAR2-eRfA9QQRuOR-KQjOA")' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-background-light/80 dark:from-background-dark/80 to-transparent"></div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-8 flex flex-col gap-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.015em] text-center text-slate-900 dark:text-slate-100">
          공간의 가치를 높이는<br />프리미엄 클리닝, 클린긱
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 text-sm">
          검증된 파트너와 함께하는<br />맞춤형 청소 서비스를 경험해보세요.
        </p>
        <div className="flex mt-4">
          <Link href="/login" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-md hover:bg-primary/90 transition-colors">
            <span className="truncate">시작하기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
