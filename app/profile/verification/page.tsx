'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [step, setStep] = useState(1); // 1: Intro, 2: Upload, 3: Success

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
            setUser(profile);
            if (profile?.is_verified) setStep(3);
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleVerify = async () => {
        setVerifying(true);
        // Simulate network delay for real KYC feel
        await new Promise(resolve => setTimeout(resolve, 2000));

        const supabase = createClient();
        const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', user.id);

        if (!error) {
            setStep(3);
        } else {
            alert('인증에 실패했습니다. 다시 시도해 주세요.');
        }
        setVerifying(false);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans max-w-md mx-auto flex flex-col relative overflow-hidden">

            {/* Header */}
            <div className="p-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="material-symbols-outlined text-slate-500 hover:text-slate-900">arrow_back</button>
                <h1 className="text-xl font-bold">임팩트 신원 인증 (KYC)</h1>
            </div>

            <div className="flex-1 p-6 flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                <span className="material-symbols-outlined text-[32px]">verified_user</span>
                            </div>
                            <h2 className="text-[24px] font-black leading-tight mb-4">신뢰받는 파트너가<br />되는 첫 걸음</h2>
                            <p className="text-slate-500 leading-relaxed mb-auto">
                                클린긱은 안전한 청소 문화를 위해 모든 파트너의 신원을 검증합니다. 본인 확인이 완료된 파트너에게만 일감 지원 권한이 부여됩니다.
                            </p>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                본인 인증 시작하기
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="mb-8">
                                <h2 className="text-[22px] font-black leading-tight mb-2">본인 확인 중</h2>
                                <p className="text-slate-500 text-sm">휴대폰 본인인증(NICE)을 통해 실명을 확인합니다.</p>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                                <div className="relative">
                                    <div className={`w-24 h-24 rounded-full border-4 ${verifying ? 'border-primary border-t-transparent animate-spin' : 'border-slate-100 flex items-center justify-center'}`}>
                                        {!verifying && <span className="material-symbols-outlined text-[40px] text-slate-300">person_search</span>}
                                    </div>
                                    {verifying && (
                                        <div className="absolute inset-0 flex items-center justify-center text-primary font-bold transition-opacity">
                                            <span className="material-symbols-outlined animate-pulse">lock</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg mb-1">{verifying ? '보안 연결 중...' : '인증 준비 완료'}</p>
                                    <p className="text-slate-400 text-xs">안전하게 암호화되어 전송됩니다.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleVerify}
                                disabled={verifying}
                                className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {verifying ? '통신 중...' : '인증 실행 (PASS/NICE)'}
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center"
                        >
                            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                                <span className="material-symbols-outlined text-[40px] font-bold">check</span>
                            </div>
                            <h2 className="text-[26px] font-black leading-tight mb-2">신원 인증 완료!</h2>
                            <p className="text-slate-500 mb-12">이제 클린긱의 모든 일감에<br />자유롭게 지원하실 수 있습니다.</p>

                            <button
                                onClick={() => router.push('/clean/jobs')}
                                className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-2xl transition-all active:scale-95"
                            >
                                일감 보러 가기
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        </div>
    );
}
