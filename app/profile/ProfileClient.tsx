'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

const TIER_CONFIG: Record<string, { label: string; color: string; next: string; desc: string }> = {
  STARTER: { label: '🌱 스타터', color: '#94A3B8', next: '실버 (10건 완료)', desc: '수수료 10%' },
  SILVER: { label: '🥈 실버', color: '#94A3B8', next: '골드 (50건 완료)', desc: '수수료 9%' },
  GOLD: { label: '🥇 골드', color: '#F59E0B', next: '마스터 (200건 완료)', desc: '수수료 8%' },
  MASTER: { label: '👑 마스터', color: '#8B5CF6', next: '최고 등급!', desc: '수수료 7%' },
};

const SPARKLE_DESC = "친절도, 응답 속도, 청소 매너를 종합한 점수입니다. 99.9℃에 도전해보세요!";
const RATING_DESC = "청소 완료 후 공간 운영자가 남긴 별점 평균입니다. 서비스 품질의 지표가 됩니다.";

interface Props {
  profile: { id: string; name: string; email?: string; phone?: string; profile_image?: string; role: string; tier?: string; avg_rating?: number; total_jobs?: number; bio?: string; bank_account?: any; is_verified?: boolean; manner_temperature?: number };
  totalCompletedJobs: number;
}

export default function ProfileClient({ profile, totalCompletedJobs }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [bankName, setBankName] = useState(profile.bank_account?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile.bank_account?.accountNumber || '');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const tierInfo = TIER_CONFIG[profile.tier || 'STARTER'];

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('users').update({
      name,
      bio,
      phone,
      bank_account: { bankName, accountNumber }
    }).eq('id', profile.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const handleRoleSwitch = async () => {
    const nextRole = profile.role === 'worker' ? 'operator' : 'worker';
    const roleName = nextRole === 'worker' ? '클린파트너' : '공간파트너';

    if (!confirm(`${roleName}(으)로 역할을 전환하시겠습니까?`)) return;

    setSwitching(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('users').update({ role: nextRole }).eq('id', profile.id);
      if (error) throw error;
      router.push(nextRole === 'worker' ? '/clean' : '/dashboard');
      router.refresh();
    } catch (e) {
      alert('역할 전환 중 오류가 발생했습니다.');
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-center w-full">
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden border-x border-slate-200 dark:border-slate-800">

        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10"></div>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-slate-900 dark:text-slate-100">마이페이지</h1>
          <button onClick={() => setEditing(!editing)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
            <span className="material-symbols-outlined">{editing ? 'close' : 'settings'}</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24">
          {/* Profile Section */}
          <div className="flex flex-col items-center p-6 gap-4">
            <div className="relative">
              <div
                className="bg-slate-100 dark:bg-slate-800 aspect-square rounded-full w-28 h-28 bg-cover bg-center border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center overflow-hidden"
                style={profile.profile_image ? { backgroundImage: `url('${profile.profile_image}')` } : {}}
              >
                {!profile.profile_image && <span className="text-4xl font-black text-primary/80">{profile.name[0]}</span>}
              </div>

              {profile.is_verified && (
                <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">{profile.name}님</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <span className="material-symbols-outlined text-[14px] mr-1">military_tech</span> {tierInfo.label.replace(/[^가-힣a-zA-Z\s]/g, '').trim()} 등급
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 text-sm">|</span>
                  <span className="text-primary font-bold text-sm">평점 {profile.avg_rating?.toFixed(1) || '5.0'}</span>
                </div>
                {profile.bio && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-[80%] leading-relaxed">{profile.bio}</p>}
              </div>
            ) : (
              <div className="flex flex-col w-full gap-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 text-[15px] font-bold text-center placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="이름 (실명) 입력"
                />
                <input
                  type="tel"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 text-[15px] text-center placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="휴대폰 번호 (- 없이 입력)"
                />
                <div className="flex gap-2 w-full">
                  <input
                    className="w-1/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 text-[15px] text-center placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="은행명"
                  />
                  <input
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 text-[15px] text-center placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="계좌번호 (- 없이 입력)"
                  />
                </div>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 text-[15px] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="자기소개를 간단히 작성해주세요"
                  rows={2}
                />
                <button className="w-full mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl h-14 font-bold shadow-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2" onClick={handleSave} disabled={saving}>
                  {saving && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  {saving ? '저장 중...' : '프로필 수정 완료'}
                </button>
              </div>
            )}
          </div>

          <div className="h-2 bg-slate-50 dark:bg-slate-800/50 w-full"></div>

          {/* Stats Area */}
          <div className="flex px-4 py-5 gap-3">
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md group relative">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1.5">평점</span>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{profile.avg_rating?.toFixed(1) || '5.0'}</span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-30 text-center leading-tight">
                {RATING_DESC}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-primary/20 dark:border-primary/30 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10" />
              <span className="text-xs text-primary font-bold mb-1.5 relative z-10">스파클 온도</span>
              <span className="text-xl font-black text-primary relative z-10 tracking-tight">{profile.manner_temperature || 98}점</span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-primary text-white text-[10px] rounded-lg shadow-xl z-30 text-center leading-tight">
                {SPARKLE_DESC}
              </div>
            </div>
          </div>

          <div className="h-2 bg-slate-50 dark:bg-slate-800/50 w-full mb-2"></div>

          {/* Menu List */}
          <div className="flex flex-col py-2 px-3">
            {/* 역할 전환 */}
            <button onClick={handleRoleSwitch} disabled={switching} className="flex items-center gap-4 px-3 py-3 min-h-[64px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-2xl text-left w-full group mb-1">
              <div className="flex items-center justify-center rounded-[14px] bg-primary/10 dark:bg-primary/20 text-primary shrink-0 size-12 group-active:scale-95 transition-transform">
                <span className="material-symbols-outlined">{profile.role === 'worker' ? 'store' : 'cleaning_services'}</span>
              </div>
              <div className="flex flex-col flex-1">
                <p className="text-[17px] font-bold leading-tight text-slate-900 dark:text-slate-100 mb-0.5">{profile.role === 'worker' ? '공간 파트너로 전환' : '클린 파트너로 전환'}</p>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">클라이언트 모드로 역할을 변경합니다</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800/80 mx-3 my-1"></div>

            {/* Settings Menu */}
            <div className="px-0 py-2 space-y-1">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => router.push('/earnings')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">계좌 및 정산 관리</p>
                    <p className="text-[10px] text-slate-400">수익금 확인 및 출금 신청</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              {/* 운영자 대시보드 (디버깅/운영 용 임시 노출) */}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                onClick={() => router.push('/admin')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-blue-600">운영자 대시보드</p>
                    <p className="text-[10px] text-blue-400">플랫폼 전체 현황 관리</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-blue-400">chevron_right</span>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => alert('준비 중인 기능입니다.')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">공지사항</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => alert('카카오톡 상담 채널로 연결 중입니다...')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">headset_mic</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">고객센터</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" onClick={handleLogout}>
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-lg text-red-500">
                    <span className="material-symbols-outlined">logout</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-500">로그아웃</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
