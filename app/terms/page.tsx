'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-6 pb-20 max-w-2xl mx-auto shadow-sm">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center text-primary font-bold mb-4">
                    <span className="material-symbols-outlined mr-1">arrow_back</span> 홈으로
                </Link>
                <h1 className="text-3xl font-black tracking-tight">서비스 이용약관</h1>
                <p className="text-slate-500 text-sm mt-2">최종 수정일: 2026년 3월 9일</p>
            </header>

            <div className="space-y-8 text-sm leading-relaxed">
                <section>
                    <h2 className="text-lg font-bold mb-3">제 1조 (목적)</h2>
                    <p>본 약관은 클린긱(이하 "플랫폼")이 제공하는 청소 중개 서비스의 이용 조건 및 절차, 이용자와 플랫폼 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold mb-3">제 2조 (서비스의 성격)</h2>
                    <p>1. 플랫폼은 청소 서비스를 필요로 하는 호스트와 서비스를 제공하고자 하는 클린파트너를 연결해 주는 '중개 시스템'을 제공합니다.<br />
                        2. 플랫폼은 클린파트너를 직접 고용하지 않으며, 클린파트너는 독립된 개인사업자 또는 프리랜서 자격으로 업무를 수행합니다.</p>
                </section>

                <section className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                    <h2 className="text-lg font-bold mb-3 text-amber-700 dark:text-amber-400">제 3조 (책임 및 면책사항)</h2>
                    <p className="mb-2">1. **중개 책임**: 플랫폼은 거래의 당사자가 아니며, 호스트와 클린파트너 간에 발생하는 서비스 품질, 파손, 도난 등의 분쟁에 대하여 직접적인 책임을 지지 않습니다.<br />
                        2. **손해 배상**: 청소 중 발생하는 하자에 대한 책임은 직접 서비스를 수행한 클린파트너에게 귀속됩니다.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold mb-3">제 4조 (파손 및 분쟁 해결)</h2>
                    <p>1. **신고**: 파손이나 도난 발생 시 24시간 이내에 플랫폼 고객센터로 접수해야 합니다.<br />
                        2. **중재**: 플랫폼은 원만한 해결을 위해 증빙 자료(작업 전후 사진 등) 검토 및 양측 중재를 지원하지만, 최종 배상 결정권은 당사자 간 합의에 따릅니다.</p>
                </section>

                <section className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800">
                    <h2 className="text-lg font-bold mb-3 text-rose-700 dark:text-rose-400">제 5조 (파트너 페널티 규정)</h2>
                    <p>1. **노쇼(No-Show)**: 정당한 사유 없는 당일 예약 불이행 시 이용 정지 처분을 받을 수 있습니다.<br />
                        2. **A/S 의무**: 품질 불량으로 인한 정당한 이의 제기 시 파트너는 무상 재청소를 진행해야 하며, 거부 시 수익금 지급이 거절될 수 있습니다.</p>
                </section>
            </div>

            <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                &copy; 2026 CleanGig. All rights reserved.
            </footer>
        </div>
    );
}
