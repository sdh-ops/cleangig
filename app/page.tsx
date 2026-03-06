import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingClient from './LandingClient';

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

  return <LandingClient />;
}
