'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-6 pb-20 max-w-2xl mx-auto shadow-sm">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center text-primary font-bold mb-4">
                    <span className="material-symbols-outlined mr-1">arrow_back</span> 홈으로
                </Link>
                <h1 className="text-3xl font-black tracking-tight">개인정보 처리방침</h1>
                <p className="text-slate-500 text-sm mt-2">최종 수정일: 2026년 3월 9일</p>
            </header>

            <div className="space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-lg font-bold mb-3">1. 수집하는 개인정보 항목</h2>
                    <ul className="list-disc ml-5 space-y-2">
                        <li>**필수 항목**: 이름, 이메일, 휴대폰 번호</li>
                        <li>**파트너용(KYC)**: 신분증 사본(본인확인 후 파기), 계좌번호, 위치 정보</li>
                        <li>**자동 수집**: IP주소, 쿠키, 기기 정보</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-bold mb-3">2. 개인정보의 이용 목적</h2>
                    <p>플랫폼은 수집한 정보를 다음의 목적을 위해 활용합니다.</p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>호스트와 파트너 간의 매칭 및 서비스 제공</li>
                        <li>신원 확인 및 비정상 이용자(노쇼 등) 방지</li>
                        <li>청소비 정산 및 세무 증빙</li>
                    </ul>
                </section>

                <section className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold mb-3">3. 개인정보의 보유 및 이용 기간</h2>
                    <p>원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 일정 기간 보관합니다.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold mb-3">4. 제3자 제공에 관한 사항</h2>
                    <p>매칭이 완료된 경우, 서비스 수행을 위해 필요한 최소한의 정보(이름, 휴대폰 번호)가 상대방(호스트 또는 파트너)에게 제공됩니다.</p>
                </section>
            </div>

            <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                &copy; 2026 CleanGig. All rights reserved.
            </footer>
        </div>
    );
}
